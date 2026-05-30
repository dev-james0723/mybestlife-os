/**
 * Task sorting. Default per-key directions preserve the legacy page behavior
 * (created_at desc, due_date asc with nulls last, priority urgent-first); a
 * direction override supports table column sorting.
 */
import type { Task } from "@/types/database";

export type TaskSortKey =
  | "created_at"
  | "updated_at"
  | "due_date"
  | "priority"
  | "title"
  | "status"
  | "manual";

export type SortDirection = "asc" | "desc";

export const PRIORITY_ORDER: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const STATUS_ORDER: Record<Task["status"], number> = {
  "in-progress": 0,
  todo: 1,
  done: 2,
  cancelled: 3,
};

const DEFAULT_DIRECTION: Record<TaskSortKey, SortDirection> = {
  created_at: "desc",
  updated_at: "desc",
  due_date: "asc",
  priority: "asc",
  title: "asc",
  status: "asc",
  manual: "asc",
};

function sortOrderOf(task: Task): number {
  const value = (task as { sort_order?: number | null }).sort_order;
  return value ?? Number.MAX_SAFE_INTEGER;
}

function time(value: string | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function compareTasks(
  a: Task,
  b: Task,
  key: TaskSortKey,
  direction: SortDirection,
): number {
  const dir = direction === "desc" ? -1 : 1;

  switch (key) {
    case "due_date": {
      // null due dates always sink to the bottom, independent of direction.
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return (time(a.due_date) - time(b.due_date)) * dir;
    }
    case "priority":
      return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
    case "status":
      return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
    case "title":
      return a.title.localeCompare(b.title) * dir;
    case "manual": {
      const ao = sortOrderOf(a);
      const bo = sortOrderOf(b);
      if (ao !== bo) return (ao - bo) * dir;
      return time(b.created_at) - time(a.created_at);
    }
    case "updated_at":
      return (time(a.updated_at) - time(b.updated_at)) * dir;
    case "created_at":
    default:
      return (time(a.created_at) - time(b.created_at)) * dir;
  }
}

export function sortTasks(
  tasks: Task[],
  key: TaskSortKey,
  direction?: SortDirection,
): Task[] {
  const dir = direction ?? DEFAULT_DIRECTION[key] ?? "desc";
  return [...tasks].sort((a, b) => compareTasks(a, b, key, dir));
}

export function defaultDirectionFor(key: TaskSortKey): SortDirection {
  return DEFAULT_DIRECTION[key] ?? "desc";
}
