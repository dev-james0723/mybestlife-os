/**
 * Task analytics computed from real task rows (never hardcoded). Wave 3 ships
 * the overview metrics consumed by the overview strip; `computeTaskAnalytics`
 * (wave 9) layers on the distributions + completion trend used by the
 * analytics + insight panels.
 */
import type { Task } from "@/types/database";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { toTaskViewModel } from "./task-view-model";
import { deadlineBucketToColumn, type DeadlineColumn } from "./task-dates";

export type TaskOverviewMetrics = {
  total: number;
  active: number;
  inProgress: number;
  dueToday: number;
  overdue: number;
  completedThisWeek: number;
  noProject: number;
  highPriority: number;
};

const WEEK_OPTS = { weekStartsOn: 1 } as const;

export function computeTaskOverview(
  tasks: Task[],
  now: Date = new Date(),
): TaskOverviewMetrics {
  const weekStart = startOfWeek(now, WEEK_OPTS);
  const weekEnd = endOfWeek(now, WEEK_OPTS);

  const metrics: TaskOverviewMetrics = {
    total: tasks.length,
    active: 0,
    inProgress: 0,
    dueToday: 0,
    overdue: 0,
    completedThisWeek: 0,
    noProject: 0,
    highPriority: 0,
  };

  for (const task of tasks) {
    const vm = toTaskViewModel(task, now);
    if (vm.isActive) metrics.active += 1;
    if (task.status === "in-progress") metrics.inProgress += 1;
    if (vm.isDueToday && vm.isActive) metrics.dueToday += 1;
    if (vm.isOverdue) metrics.overdue += 1;
    if (!task.project_id) metrics.noProject += 1;
    if (vm.isActive && (task.priority === "high" || task.priority === "urgent")) {
      metrics.highPriority += 1;
    }
    if (task.status === "done" && task.completed_at) {
      const completed = parseISO(task.completed_at);
      if (
        !Number.isNaN(completed.getTime()) &&
        isWithinInterval(completed, { start: weekStart, end: weekEnd })
      ) {
        metrics.completedThisWeek += 1;
      }
    }
  }

  return metrics;
}

// ---------------------------------------------------------------------------
// Rich analytics (distributions + completion trend) — wave 9
// ---------------------------------------------------------------------------

export type DistributionBar = { key: string; count: number };
export type ProjectWorkload = {
  projectId: string | null;
  name: string;
  active: number;
  total: number;
};
export type CompletionTrendPoint = { date: string; label: string; completed: number };

export type TaskAnalytics = {
  overview: TaskOverviewMetrics;
  byStatus: Record<Task["status"], number>;
  byPriority: Record<Task["priority"], number>;
  byCategory: DistributionBar[];
  byDeadline: Record<DeadlineColumn, number>;
  projectWorkload: ProjectWorkload[];
  completionTrend: CompletionTrendPoint[];
  /** completed / total, 0..1 (0 when no tasks). */
  completionRate: number;
};

const TREND_DAYS = 14;
const UNCATEGORIZED = "__uncategorized__";

export function computeTaskAnalytics(
  tasks: Task[],
  now: Date = new Date(),
): TaskAnalytics {
  const overview = computeTaskOverview(tasks, now);

  const byStatus: Record<Task["status"], number> = {
    todo: 0,
    "in-progress": 0,
    done: 0,
    cancelled: 0,
  };
  const byPriority: Record<Task["priority"], number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  const byDeadline: Record<DeadlineColumn, number> = {
    overdue: 0,
    today: 0,
    "this-week": 0,
    later: 0,
    none: 0,
  };
  const categoryCounts = new Map<string, number>();
  const projectMap = new Map<
    string,
    { projectId: string | null; name: string; active: number; total: number }
  >();

  let completed = 0;

  for (const task of tasks) {
    const vm = toTaskViewModel(task, now);
    if (byStatus[task.status] != null) byStatus[task.status] += 1;
    if (byPriority[task.priority] != null) byPriority[task.priority] += 1;
    byDeadline[deadlineBucketToColumn(vm.deadlineBucket)] += 1;
    if (task.status === "done") completed += 1;

    const catKey = vm.category ?? UNCATEGORIZED;
    categoryCounts.set(catKey, (categoryCounts.get(catKey) ?? 0) + 1);

    const pid = task.project_id ?? null;
    const pkey = pid ?? UNCATEGORIZED;
    const name = task.project?.name ?? "";
    const entry =
      projectMap.get(pkey) ?? { projectId: pid, name, active: 0, total: 0 };
    entry.total += 1;
    if (vm.isActive) entry.active += 1;
    if (name && !entry.name) entry.name = name;
    projectMap.set(pkey, entry);
  }

  const byCategory: DistributionBar[] = [...categoryCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);

  const projectWorkload: ProjectWorkload[] = [...projectMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Completion trend across the last TREND_DAYS days (inclusive of today).
  const start = startOfDay(subDays(now, TREND_DAYS - 1));
  const days = eachDayOfInterval({ start, end: startOfDay(now) });
  const trendCounts = days.map(() => 0);
  for (const task of tasks) {
    if (task.status !== "done" || !task.completed_at) continue;
    const c = parseISO(task.completed_at);
    if (Number.isNaN(c.getTime())) continue;
    const idx = days.findIndex((d) => isSameDay(d, c));
    if (idx >= 0) trendCounts[idx] += 1;
  }
  const completionTrend: CompletionTrendPoint[] = days.map((d, i) => ({
    date: format(d, "yyyy-MM-dd"),
    label: format(d, "M/d"),
    completed: trendCounts[i] ?? 0,
  }));

  return {
    overview,
    byStatus,
    byPriority,
    byCategory,
    byDeadline,
    projectWorkload,
    completionTrend,
    completionRate: tasks.length > 0 ? completed / tasks.length : 0,
  };
}

export const UNCATEGORIZED_KEY = UNCATEGORIZED;
