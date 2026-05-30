/**
 * Pure task filtering. Every predicate is exported for testing; `filterTasks`
 * composes them. Linked-entity predicates that need cross-module data accept an
 * optional context so the page can stay the single owner of relation lookups.
 */
import type { Task } from "@/types/database";
import { isTaskAiGenerated } from "./ai-origin";
import { resolveTaskCategory } from "./task-categories";
import {
  matchesDatePreset,
  matchesDeadlineFilter,
  type DateRange,
  type DatePresetValue,
  type DeadlineFilterValue,
} from "./task-dates";

/** Sentinel project value meaning "tasks with no project". */
export const NO_PROJECT_FILTER = "__none__";

export type LinkedEntityFlag =
  | "has-project"
  | "no-project"
  | "ai-generated"
  | "not-ai-generated"
  | "linked-goal"
  | "linked-habit"
  | "linked-planner"
  | "linked-calendar"
  | "linked-knowledge"
  | "linked-idea";

/** Cross-module link presence for a single task (filled by task-linking). */
export type TaskLinkFlags = {
  goal?: boolean;
  habit?: boolean;
  planner?: boolean;
  calendar?: boolean;
  knowledge?: boolean;
  idea?: boolean;
};

export type TaskFilterContext = {
  now?: Date;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
};

export type TaskFilterState = {
  search: string;
  status: Task["status"] | "all";
  priority: Task["priority"] | "all";
  /** "all" | projectId | NO_PROJECT_FILTER */
  project: string;
  /** "all" | category value */
  category: string;
  deadline: DeadlineFilterValue;
  deadlineRange?: DateRange;
  created: DatePresetValue;
  createdRange?: DateRange;
  updated: DatePresetValue;
  updatedRange?: DateRange;
  /** OR match — a task passes if it has any of these tags. */
  tags: string[];
  /** AND match — a task must satisfy every selected linked flag. */
  linked: LinkedEntityFlag[];
};

export const EMPTY_TASK_FILTER: TaskFilterState = {
  search: "",
  status: "all",
  priority: "all",
  project: "all",
  category: "all",
  deadline: "all",
  created: "all",
  updated: "all",
  tags: [],
  linked: [],
};

export function matchesSearch(task: Task, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    task.title,
    task.description ?? "",
    task.project?.name ?? "",
    task.source ?? "",
    resolveTaskCategory(task) ?? "",
    ...(task.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function matchesProject(task: Task, project: string): boolean {
  if (project === "all") return true;
  if (project === NO_PROJECT_FILTER) return !task.project_id;
  return task.project_id === project;
}

export function matchesCategory(task: Task, category: string): boolean {
  if (category === "all") return true;
  return resolveTaskCategory(task) === category;
}

export function matchesTags(task: Task, tags: string[]): boolean {
  if (tags.length === 0) return true;
  const taskTags = new Set((task.tags ?? []).map((t) => t.toLowerCase()));
  return tags.some((t) => taskTags.has(t.toLowerCase()));
}

export function matchesLinked(
  task: Task,
  flags: LinkedEntityFlag[],
  ctx?: TaskFilterContext,
): boolean {
  if (flags.length === 0) return true;
  const link = ctx?.getLinkFlags?.(task.id);
  const calendarEventId = (task as { calendar_event_id?: string | null })
    .calendar_event_id;

  return flags.every((flag) => {
    switch (flag) {
      case "has-project":
        return Boolean(task.project_id);
      case "no-project":
        return !task.project_id;
      case "ai-generated":
        return isTaskAiGenerated(task);
      case "not-ai-generated":
        return !isTaskAiGenerated(task);
      case "linked-goal":
        return Boolean(link?.goal);
      case "linked-habit":
        return Boolean(link?.habit);
      case "linked-planner":
        return Boolean(link?.planner);
      case "linked-knowledge":
        return Boolean(link?.knowledge);
      case "linked-idea":
        return Boolean(link?.idea);
      case "linked-calendar":
        return Boolean(calendarEventId) || Boolean(link?.calendar);
      default:
        return true;
    }
  });
}

export function filterTasks(
  tasks: Task[],
  state: TaskFilterState,
  ctx?: TaskFilterContext,
): Task[] {
  const now = ctx?.now ?? new Date();
  return tasks.filter((task) => {
    if (!matchesSearch(task, state.search)) return false;
    if (state.status !== "all" && task.status !== state.status) return false;
    if (state.priority !== "all" && task.priority !== state.priority) return false;
    if (!matchesProject(task, state.project)) return false;
    if (!matchesCategory(task, state.category)) return false;
    if (!matchesDeadlineFilter(task.due_date, state.deadline, now, state.deadlineRange))
      return false;
    if (!matchesDatePreset(task.created_at, state.created, now, state.createdRange))
      return false;
    if (!matchesDatePreset(task.updated_at, state.updated, now, state.updatedRange))
      return false;
    if (!matchesTags(task, state.tags)) return false;
    if (!matchesLinked(task, state.linked, ctx)) return false;
    return true;
  });
}

/** Count of non-search filters currently narrowing the list (for UI badges). */
export function countActiveFilters(state: TaskFilterState): number {
  let n = 0;
  if (state.status !== "all") n += 1;
  if (state.priority !== "all") n += 1;
  if (state.project !== "all") n += 1;
  if (state.category !== "all") n += 1;
  if (state.deadline !== "all") n += 1;
  if (state.created !== "all") n += 1;
  if (state.updated !== "all") n += 1;
  n += state.tags.length;
  n += state.linked.length;
  return n;
}

export function hasActiveFilters(state: TaskFilterState): boolean {
  return countActiveFilters(state) > 0 || state.search.trim().length > 0;
}

/** Distinct, sorted tags across a task list (for the advanced tag filter). */
export function collectTaskTags(tasks: Task[]): string[] {
  const set = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.tags ?? []) {
      const t = tag.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
