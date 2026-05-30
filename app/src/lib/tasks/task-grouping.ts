/**
 * Task grouping for the board view. Fixed-domain groupings (status/priority/
 * deadline) return columns in a stable order and can include empty lanes so
 * the board always renders every column. Dynamic groupings (project/category)
 * derive their lanes from the data.
 */
import type { Task } from "@/types/database";
import {
  TASK_CATEGORIES,
  isCanonicalCategory,
  resolveTaskCategory,
} from "./task-categories";
import {
  deadlineBucketToColumn,
  getDeadlineBucket,
  type DeadlineColumn,
} from "./task-dates";

export type TaskGroupBy = "status" | "priority" | "project" | "category" | "deadline";

export type TaskGroup = {
  /** Stable key: a status/priority/category value, project id, or sentinel. */
  key: string;
  /** Display label for dynamic groups (e.g. project name). i18n applies for fixed groups. */
  label?: string;
  tasks: Task[];
};

export const NO_PROJECT_GROUP = "__no_project__";
export const UNCATEGORIZED_GROUP = "__uncategorized__";

export const STATUS_GROUP_KEYS: Task["status"][] = [
  "todo",
  "in-progress",
  "done",
  "cancelled",
];
export const PRIORITY_GROUP_KEYS: Task["priority"][] = [
  "urgent",
  "high",
  "medium",
  "low",
];
export const DEADLINE_GROUP_KEYS: DeadlineColumn[] = [
  "overdue",
  "today",
  "this-week",
  "later",
  "none",
];

type GroupOptions = { includeEmpty?: boolean; now?: Date };

function fixedGroups(
  tasks: Task[],
  keys: readonly string[],
  keyOf: (task: Task) => string,
  includeEmpty: boolean,
): TaskGroup[] {
  const map = new Map<string, Task[]>();
  for (const key of keys) map.set(key, []);
  for (const task of tasks) {
    const key = keyOf(task);
    const bucket = map.get(key);
    if (bucket) bucket.push(task);
    else map.set(key, [task]);
  }
  const result: TaskGroup[] = [];
  for (const key of keys) {
    const bucketTasks = map.get(key) ?? [];
    if (!includeEmpty && bucketTasks.length === 0) continue;
    result.push({ key, tasks: bucketTasks });
  }
  // Any unexpected keys (defensive) appended at the end.
  for (const [key, bucketTasks] of map) {
    if (!keys.includes(key) && bucketTasks.length > 0) {
      result.push({ key, tasks: bucketTasks });
    }
  }
  return result;
}

function groupByProject(tasks: Task[]): TaskGroup[] {
  const map = new Map<string, { label: string; tasks: Task[] }>();
  for (const task of tasks) {
    const key = task.project_id ?? NO_PROJECT_GROUP;
    const label = task.project_id ? task.project?.name ?? "" : NO_PROJECT_GROUP;
    const entry = map.get(key);
    if (entry) entry.tasks.push(task);
    else map.set(key, { label, tasks: [task] });
  }
  const groups: TaskGroup[] = [];
  for (const [key, entry] of map) {
    if (key === NO_PROJECT_GROUP) continue;
    groups.push({ key, label: entry.label || key, tasks: entry.tasks });
  }
  groups.sort((a, b) => (a.label ?? "").localeCompare(b.label ?? ""));
  const noProject = map.get(NO_PROJECT_GROUP);
  if (noProject) {
    groups.push({ key: NO_PROJECT_GROUP, tasks: noProject.tasks });
  }
  return groups;
}

function groupByCategory(tasks: Task[]): TaskGroup[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = resolveTaskCategory(task) ?? UNCATEGORIZED_GROUP;
    const bucket = map.get(key);
    if (bucket) bucket.push(task);
    else map.set(key, [task]);
  }
  const groups: TaskGroup[] = [];
  for (const cat of TASK_CATEGORIES) {
    const bucket = map.get(cat);
    if (bucket && bucket.length > 0) groups.push({ key: cat, tasks: bucket });
  }
  const extras = [...map.keys()]
    .filter((k) => k !== UNCATEGORIZED_GROUP && !isCanonicalCategory(k))
    .sort((a, b) => a.localeCompare(b));
  for (const key of extras) {
    groups.push({ key, label: key, tasks: map.get(key) ?? [] });
  }
  const uncategorized = map.get(UNCATEGORIZED_GROUP);
  if (uncategorized) groups.push({ key: UNCATEGORIZED_GROUP, tasks: uncategorized });
  return groups;
}

export function groupTasks(
  tasks: Task[],
  groupBy: TaskGroupBy,
  opts: GroupOptions = {},
): TaskGroup[] {
  const includeEmpty = opts.includeEmpty ?? true;
  switch (groupBy) {
    case "status":
      return fixedGroups(tasks, STATUS_GROUP_KEYS, (t) => t.status, includeEmpty);
    case "priority":
      return fixedGroups(tasks, PRIORITY_GROUP_KEYS, (t) => t.priority, includeEmpty);
    case "deadline":
      return fixedGroups(
        tasks,
        DEADLINE_GROUP_KEYS,
        (t) => deadlineBucketToColumn(getDeadlineBucket(t.due_date, opts.now)),
        includeEmpty,
      );
    case "project":
      return groupByProject(tasks);
    case "category":
      return groupByCategory(tasks);
    default:
      return [{ key: "all", tasks }];
  }
}
