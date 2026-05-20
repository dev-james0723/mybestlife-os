/**
 * Daily Planner → CalendarItem projection.
 *
 * Maps `daily_plans.tasks` (Time Block) and `daily_plans.free_tasks` (Free Plan)
 * into the unified CalendarItem shape consumed by every Calendar view.
 *
 * Extension points (wire when data exists — do not fake UI):
 * - Daily load intelligence: scheduled minutes, must-do count, project spread
 * - Project-aware grouping/color from linked Task.project
 * - Energy-aware planning: sleep/energy/mood hooks from health check-ins
 * - Knowledge-aware links: ideas/notes linked via task metadata
 * - Relationship-aware context: people/follow-up reminders on linked tasks
 * - Finance/admin load: tag/category classification for admin-heavy days
 */

import {
  computeSequentialSchedule,
  minutesToWallClock,
} from "@/lib/daily-planner/plan-schedule-math";
import type {
  CalendarItem,
  CalendarItemPlannerFreeTask,
  CalendarItemPlannerTimeBlock,
  CalendarTaskPriority,
  CalendarTaskStatus,
} from "@/lib/calendar/types";
import type { DailyPlan, DailyPlanTask, FreePlanTask, Task } from "@/types/database";

const PLANNER_TIME_BLOCK_COLOR = "#6366f1";
const PLANNER_FREE_COLORS: Record<FreePlanTask["priority"], string> = {
  must: "#ef4444",
  should: "#f97316",
  could: "#3b82f6",
  done: "#94a3b8",
};

const TASK_PRIORITY_COLORS: Record<CalendarTaskPriority, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#94a3b8",
};

const FREE_PRIORITY_LABELS: Record<FreePlanTask["priority"], string> = {
  must: "Must Do",
  should: "Should Do",
  could: "Could Do",
  done: "Done",
};

export type LinkedTaskMeta = {
  title: string;
  project_id: string | null;
  project_name: string | null;
  tags: string[];
  priority: CalendarTaskPriority;
  status: CalendarTaskStatus;
  estimated_blocks: number | null;
  description: string | null;
};

export function resolveLinkedTaskMeta(
  taskId: string | undefined | null,
  taskRows: readonly Task[],
): LinkedTaskMeta | null {
  if (!taskId) return null;
  const task = taskRows.find((t) => t.id === taskId);
  if (!task) return null;
  return {
    title: task.title,
    project_id: task.project_id,
    project_name: task.project?.name ?? null,
    tags: task.tags ?? [],
    priority: task.priority,
    status: task.status,
    estimated_blocks: task.estimated_blocks,
    description: task.description,
  };
}

function stableTimeBlockId(plan: DailyPlan, task: DailyPlanTask, index: number): string {
  const key = task.plannerTaskId ?? task.taskId ?? String(task.order ?? index);
  return `planner-time:${plan.id}:${key}`;
}

function resolveTimeBlockTitle(task: DailyPlanTask, linked: LinkedTaskMeta | null): string {
  const name = (task.taskName ?? "").trim();
  if (name) return name;
  if (linked?.title) return linked.title;
  return "Untitled";
}

function resolveTimeBlockColor(linked: LinkedTaskMeta | null): string {
  if (linked) return TASK_PRIORITY_COLORS[linked.priority] ?? PLANNER_TIME_BLOCK_COLOR;
  return PLANNER_TIME_BLOCK_COLOR;
}

function resolveTimeBlockSubtitle(linked: LinkedTaskMeta | null): string {
  if (linked?.project_name) return linked.project_name;
  return "Daily Planner";
}

export function mapTimeBlockPlanToCalendarItems(args: {
  plan: DailyPlan;
  taskRows: readonly Task[];
  blockMinutes: number;
}): CalendarItemPlannerTimeBlock[] {
  const { plan, taskRows, blockMinutes } = args;
  if (!plan.tasks.length) return [];

  const schedule = computeSequentialSchedule(
    plan.plan_date,
    plan.start_time,
    plan.tasks,
    blockMinutes,
  );

  return schedule.map(({ task, index, startMinFromPlanMidnight, endMinFromPlanMidnight }) => {
    const linked = resolveLinkedTaskMeta(task.taskId, taskRows);
    const blocks = Math.max(1, task.blocks ?? 1);
    const durationMinutes = blocks * blockMinutes;
    const start = minutesToWallClock(plan.plan_date, startMinFromPlanMidnight);
    const end = minutesToWallClock(plan.plan_date, endMinFromPlanMidnight);
    const stableId = stableTimeBlockId(plan, task, index);

    return {
      id: stableId,
      source_type: "planner_time_block" as const,
      source_id: stableId,
      title: resolveTimeBlockTitle(task, linked),
      date: start.date,
      start_time: start.time,
      end_time: end.time,
      color: resolveTimeBlockColor(linked),
      subtitle: resolveTimeBlockSubtitle(linked),
      plan_id: plan.id,
      plan_date: plan.plan_date,
      planner_task_id: task.plannerTaskId ?? stableId,
      linked_task_id: task.taskId ?? null,
      mode: "time-block" as const,
      blocks,
      duration_minutes: durationMinutes,
      order: task.order ?? index,
      priority: linked?.priority ?? "planned",
      status: linked?.status ?? "planned",
      project_id: linked?.project_id ?? null,
      project_name: linked?.project_name ?? null,
      tags: linked?.tags ?? [],
    };
  });
}

function resolveFreePlanSubtitle(
  priority: FreePlanTask["priority"],
  linked: LinkedTaskMeta | null,
): string {
  const parts = [FREE_PRIORITY_LABELS[priority]];
  if (linked?.project_name) parts.push(linked.project_name);
  return parts.join(" · ");
}

export function mapFreePlanToCalendarItems(args: {
  plan: DailyPlan;
  taskRows: readonly Task[];
  blockMinutes: number;
}): CalendarItemPlannerFreeTask[] {
  const { plan, taskRows, blockMinutes } = args;
  if (!plan.free_tasks.length) return [];

  const sorted = [...plan.free_tasks].sort((a, b) => a.order - b.order);

  return sorted.map((task) => {
    const linked = resolveLinkedTaskMeta(task.taskId, taskRows);
    const stableId = `planner-free:${plan.id}:${task.id}`;
    const title = (task.title ?? "").trim() || linked?.title || "Untitled";
    const estimatedMinutes =
      task.estimatedMinutes ??
      (linked?.estimated_blocks != null ? linked.estimated_blocks * blockMinutes : null);
    const notes = task.notes ?? linked?.description ?? null;
    const status: CalendarItemPlannerFreeTask["status"] =
      task.priority === "done" ? "done" : linked?.status ?? "planned";

    return {
      id: stableId,
      source_type: "planner_free_task" as const,
      source_id: stableId,
      title,
      date: plan.plan_date,
      start_time: null,
      end_time: null,
      color: PLANNER_FREE_COLORS[task.priority] ?? PLANNER_FREE_COLORS.should,
      subtitle: resolveFreePlanSubtitle(task.priority, linked),
      plan_id: plan.id,
      plan_date: plan.plan_date,
      planner_task_id: task.id,
      linked_task_id: task.taskId ?? null,
      mode: "free" as const,
      free_priority: task.priority,
      notes,
      estimated_minutes: estimatedMinutes,
      order: task.order,
      status,
      project_id: linked?.project_id ?? null,
      project_name: linked?.project_name ?? null,
      tags: linked?.tags ?? [],
    };
  });
}

export function mapDailyPlansToCalendarItems(args: {
  dailyPlans: DailyPlan[];
  taskRows: readonly Task[];
  blockMinutes: number;
  includeFreePlanTasks?: boolean;
}): CalendarItem[] {
  const { dailyPlans, taskRows, blockMinutes, includeFreePlanTasks = true } = args;
  const items: CalendarItem[] = [];
  const seen = new Set<string>();

  for (const plan of dailyPlans) {
    for (const item of mapTimeBlockPlanToCalendarItems({ plan, taskRows, blockMinutes })) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
    if (includeFreePlanTasks) {
      for (const item of mapFreePlanToCalendarItems({ plan, taskRows, blockMinutes })) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  return items;
}
