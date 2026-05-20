import type { DailyPlanTask, FreePlanTask, PlanningMode } from "@/types/database";

const FREE_PRIORITIES: ReadonlyArray<FreePlanTask["priority"]> = [
  "must",
  "should",
  "could",
  "done",
];

function stringifyUnknown(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const rec = v as Record<string, unknown>;
    for (const key of [
      "en",
      "zh-TW",
      "zh_TW",
      "zh-CN",
      "zh_CN",
      "ja",
      "ko",
      "fr",
      "it",
      "es",
      "vi",
      "default",
    ]) {
      const inner = rec[key];
      if (typeof inner === "string") return inner;
    }
    if (typeof rec.text === "string") return rec.text;
    if (typeof rec.label === "string") return rec.label;
    if (typeof rec.name === "string") return rec.name;
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return "";
}

function coerceBlocks(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.floor(raw));
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
  return 1;
}

function coerceGapBlocks(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  return undefined;
}

function coerceWallClock(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  return /^\d{1,2}:\d{2}$/.test(t) ? t : undefined;
}

function coerceDailyPlanTask(item: unknown, index: number): DailyPlanTask {
  if (!item || typeof item !== "object") {
    return { taskName: "Untitled", blocks: 1, order: index };
  }
  const o = item as Record<string, unknown>;
  const name = stringifyUnknown(o.taskName).trim();
  const gapBlocks = coerceGapBlocks(o.gapBlocks);
  const startTime = coerceWallClock(o.start_time);
  const endTime = coerceWallClock(o.end_time);
  return {
    plannerTaskId:
      typeof o.plannerTaskId === "string" && o.plannerTaskId.trim().length > 0
        ? o.plannerTaskId.trim()
        : undefined,
    ...(gapBlocks !== undefined ? { gapBlocks } : {}),
    taskName: name || "Untitled",
    taskId: typeof o.taskId === "string" ? o.taskId : undefined,
    blocks: coerceBlocks(o.blocks),
    order:
      typeof o.order === "number" && Number.isFinite(o.order)
        ? o.order
        : index,
    ...(startTime ? { start_time: startTime } : {}),
    ...(endTime ? { end_time: endTime } : {}),
    ...(typeof o.google_calendar_event_id === "string"
      ? { google_calendar_event_id: o.google_calendar_event_id }
      : {}),
    ...(typeof o.google_calendar_etag === "string"
      ? { google_calendar_etag: o.google_calendar_etag }
      : {}),
    ...(typeof o.google_calendar_updated_at === "string"
      ? { google_calendar_updated_at: o.google_calendar_updated_at }
      : {}),
  };
}

function newPlannerTaskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Assigns a stable `plannerTaskId` to any time-block row missing one (persisted on next save). */
export function ensurePlannerTaskIds(tasks: DailyPlanTask[]): DailyPlanTask[] {
  return tasks.map((t, i) => {
    if (typeof t.plannerTaskId === "string" && t.plannerTaskId.trim().length > 0) {
      return { ...t, order: i };
    }
    return { ...t, plannerTaskId: newPlannerTaskId(), order: i };
  });
}

/** Coerces an arbitrary planning-mode value into the strictly-typed enum, defaulting to time-block. */
export function coercePlanningMode(input: unknown): PlanningMode {
  return input === "free" ? "free" : "time-block";
}

function newFreeTaskId(index: number): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `f-${crypto.randomUUID()}`;
  }
  return `f-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function coerceFreePlanTask(item: unknown, index: number): FreePlanTask {
  if (!item || typeof item !== "object") {
    return {
      id: newFreeTaskId(index),
      title: "Untitled",
      priority: "should",
      order: index,
    };
  }
  const o = item as Record<string, unknown>;
  const rawPriority = typeof o.priority === "string" ? o.priority.toLowerCase() : "should";
  const priority = (FREE_PRIORITIES as ReadonlyArray<string>).includes(rawPriority)
    ? (rawPriority as FreePlanTask["priority"])
    : "should";
  const title = stringifyUnknown(o.title ?? o.taskName).trim() || "Untitled";
  const orderRaw = typeof o.order === "number" && Number.isFinite(o.order) ? o.order : index;
  const estimated =
    typeof o.estimatedMinutes === "number" && Number.isFinite(o.estimatedMinutes) && o.estimatedMinutes > 0
      ? Math.max(1, Math.floor(o.estimatedMinutes))
      : undefined;
  return {
    id: typeof o.id === "string" && o.id.trim() ? o.id : newFreeTaskId(index),
    title,
    priority,
    order: orderRaw,
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes : undefined,
    estimatedMinutes: estimated,
    taskId: typeof o.taskId === "string" ? o.taskId : undefined,
  };
}

/** Coerces JSON-backed plan rows and guarantees stable planner task ids for Google sync. */
export function coerceDailyPlanTasks(input: unknown): DailyPlanTask[] {
  if (!Array.isArray(input)) return [];
  return ensurePlannerTaskIds(input.map((item, index) => coerceDailyPlanTask(item, index)));
}

/** Coerces and re-numbers free-plan tasks so each priority bucket has 0..n-1 ordering. */
export function coerceFreePlanTasks(input: unknown): FreePlanTask[] {
  if (!Array.isArray(input)) return [];
  const coerced = input.map((item, index) => coerceFreePlanTask(item, index));
  // Renumber within each priority bucket so the UI never has to deal with sparse `order`s.
  const buckets = new Map<FreePlanTask["priority"], FreePlanTask[]>();
  for (const t of coerced) {
    const list = buckets.get(t.priority) ?? [];
    list.push(t);
    buckets.set(t.priority, list);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.order - b.order);
    list.forEach((t, i) => {
      t.order = i;
    });
  }
  return coerced;
}
