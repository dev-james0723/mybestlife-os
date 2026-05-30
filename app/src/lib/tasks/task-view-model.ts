/**
 * Derived display state for a task, shared by every view (card/grid/table/
 * board) and the detail panel so badges, overdue states and categories are
 * computed once and consistently.
 */
import type { Task } from "@/types/database";
import { isTaskAiGenerated } from "./ai-origin";
import { resolveTaskCategory } from "./task-categories";
import { getDeadlineBucket, type DeadlineBucket } from "./task-dates";
import {
  filterTasks,
  type TaskFilterContext,
  type TaskFilterState,
} from "./task-filters";
import { sortTasks, type SortDirection, type TaskSortKey } from "./task-sort";

export type TaskViewModel = {
  task: Task;
  category: string | null;
  isAiGenerated: boolean;
  hasProject: boolean;
  deadlineBucket: DeadlineBucket;
  /** Status-aware overdue: past due AND still active. */
  isOverdue: boolean;
  isDueToday: boolean;
  /** todo or in-progress. */
  isActive: boolean;
  isCompleted: boolean;
};

const ACTIVE_STATUSES: readonly Task["status"][] = ["todo", "in-progress"];

export function toTaskViewModel(task: Task, now: Date = new Date()): TaskViewModel {
  const bucket = getDeadlineBucket(task.due_date, now);
  const isActive = ACTIVE_STATUSES.includes(task.status);
  return {
    task,
    category: resolveTaskCategory(task),
    isAiGenerated: isTaskAiGenerated(task),
    hasProject: Boolean(task.project_id),
    deadlineBucket: bucket,
    isOverdue: bucket === "overdue" && isActive,
    isDueToday: bucket === "today",
    isActive,
    isCompleted: task.status === "done",
  };
}

export function toTaskViewModels(
  tasks: Task[],
  now: Date = new Date(),
): TaskViewModel[] {
  return tasks.map((t) => toTaskViewModel(t, now));
}

export type TaskQueryOptions = {
  sortKey?: TaskSortKey;
  sortDirection?: SortDirection;
  ctx?: TaskFilterContext;
};

/** Filter then sort — the canonical pipeline for the main task list. */
export function applyTaskPipeline(
  tasks: Task[],
  state: TaskFilterState,
  options: TaskQueryOptions = {},
): Task[] {
  const filtered = filterTasks(tasks, state, options.ctx);
  return sortTasks(filtered, options.sortKey ?? "created_at", options.sortDirection);
}
