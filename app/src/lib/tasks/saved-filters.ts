/**
 * Saved task filters. Built-in presets are deterministic; user-defined presets
 * are persisted to localStorage (frontend-only — a DB-backed version can come
 * later without changing the call sites here).
 */
import {
  EMPTY_TASK_FILTER,
  NO_PROJECT_FILTER,
  type TaskFilterState,
} from "./task-filters";

export type BuiltInPresetId =
  | "my-focus"
  | "due-today"
  | "overdue-high"
  | "this-week"
  | "no-project"
  | "ai-generated"
  | "project-tasks";

export type TaskFilterPreset = {
  id: string;
  name: string;
  filter: TaskFilterState;
  builtIn?: boolean;
};

const STORAGE_KEY = "tasks:savedFilters";

function preset(id: BuiltInPresetId, patch: Partial<TaskFilterState>): {
  id: BuiltInPresetId;
  filter: TaskFilterState;
} {
  return { id, filter: { ...EMPTY_TASK_FILTER, ...patch } };
}

/** Preset id -> filter state. Labels are resolved by the UI (i18n). */
export const BUILT_IN_PRESETS: { id: BuiltInPresetId; filter: TaskFilterState }[] = [
  preset("my-focus", { status: "in-progress" }),
  preset("due-today", { deadline: "today" }),
  preset("overdue-high", { deadline: "overdue", priority: "high" }),
  preset("this-week", { deadline: "this-week" }),
  preset("no-project", { project: NO_PROJECT_FILTER }),
  preset("ai-generated", { linked: ["ai-generated"] }),
  preset("project-tasks", { linked: ["has-project"] }),
];

/** Order-insensitive comparison of the filtering portion (ignores `search`). */
export function isSameFilter(a: TaskFilterState, b: TaskFilterState): boolean {
  const norm = (s: TaskFilterState) =>
    JSON.stringify({
      status: s.status,
      priority: s.priority,
      project: s.project,
      category: s.category,
      deadline: s.deadline,
      deadlineRange: s.deadlineRange ?? null,
      created: s.created,
      createdRange: s.createdRange ?? null,
      updated: s.updated,
      updatedRange: s.updatedRange ?? null,
      tags: [...s.tags].sort(),
      linked: [...s.linked].sort(),
    });
  return norm(a) === norm(b);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadCustomPresets(): TaskFilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TaskFilterPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.id === "string" && p.filter);
  } catch {
    return [];
  }
}

function persist(presets: TaskFilterPreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function addCustomPreset(
  name: string,
  filter: TaskFilterState,
): TaskFilterPreset[] {
  const trimmed = name.trim();
  if (!trimmed) return loadCustomPresets();
  const next = [
    ...loadCustomPresets(),
    { id: makeId(), name: trimmed, filter },
  ];
  persist(next);
  return next;
}

export function deleteCustomPreset(id: string): TaskFilterPreset[] {
  const next = loadCustomPresets().filter((p) => p.id !== id);
  persist(next);
  return next;
}
