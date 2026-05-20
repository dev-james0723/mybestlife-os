/**
 * Calendar feature — unified type system.
 *
 * `CalendarItem` is the single projection shape every Calendar view consumes.
 * It is a discriminated union over `source_type` so code branches on source
 * kind narrow the shape.
 *
 * Source objects (Task / Habit / Goal / Reminder / ExternalEvent) are never
 * modified by Calendar code — projection is read-only. Writes always go
 * through the owning feature's repository.
 */

// ──────────────────────────────────────────────────────────────────────
// Source-side shapes (subset of existing domain types, kept minimal
// so the projection stays stable as underlying tables evolve)
// ──────────────────────────────────────────────────────────────────────

export type CalendarTaskStatus = "todo" | "in-progress" | "done" | "cancelled";
export type CalendarTaskPriority = "low" | "medium" | "high" | "urgent";

/** Minimal task shape needed by the projection. */
export type CalendarTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: CalendarTaskStatus;
  priority: CalendarTaskPriority;
  estimated_blocks: number | null;
  project_id: string | null;
  project_name?: string | null;
  tags: string[];
};

export type CalendarHabitTimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

/** Minimal habit shape needed by the projection. */
export type CalendarHabit = {
  id: string;
  name: string;
  time_of_day: CalendarHabitTimeOfDay;
  color: string | null;
  icon: string | null;
  /**
   * Pre-resolved by the source mapper — true if this habit applies on a given
   * date per its frequency rule. Callers supply occurrences date-by-date.
   */
};

/** Projected habit occurrence (one per active day). */
export type CalendarHabitOccurrence = {
  id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  name: string;
  time_of_day: CalendarHabitTimeOfDay;
  color: string | null;
  icon: string | null;
  completed: boolean;
};

/** Goal with a target date. */
export type CalendarMilestone = {
  id: string;
  title: string;
  target_date: string; // YYYY-MM-DD (non-null; undated goals are not projected)
  category: string | null;
};

/** Lightweight reminder — tasks with `reminder_date` project as reminders. */
export type CalendarReminder = {
  id: string;
  title: string;
  remind_at: string; // ISO timestamp
  source_task_id: string | null;
};

/** External calendar event (Google Calendar etc., Phase 5+). */
export type ExternalCalendarEvent = {
  id: string;
  calendar_id: string;
  title: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  location?: string | null;
  color?: string | null;
};

// ──────────────────────────────────────────────────────────────────────
// Unified CalendarItem — discriminated union on source_type
// ──────────────────────────────────────────────────────────────────────

export type CalendarItemSourceType =
  | "task"
  | "habit"
  | "milestone"
  | "reminder"
  | "external"
  | "planner_time_block"
  | "planner_free_task";

type CalendarItemBase = {
  id: string;
  title: string;
  /** Resolved YYYY-MM-DD the item belongs to. */
  date: string;
  /** Optional time window (HH:mm 24h). Absent for all-day items. */
  start_time: string | null;
  end_time: string | null;
  /** Display color (6-digit hex or CSS color token). */
  color: string | null;
  /** Optional subtitle (e.g. project name, category). */
  subtitle: string | null;
};

export type CalendarItemTask = CalendarItemBase & {
  source_type: "task";
  source_id: string;
  priority: CalendarTaskPriority;
  status: CalendarTaskStatus;
  estimated_blocks: number | null;
  project_id: string | null;
  overdue: boolean;
  tags: string[];
};

export type CalendarItemHabit = CalendarItemBase & {
  source_type: "habit";
  source_id: string;
  habit_id: string;
  time_of_day: CalendarHabitTimeOfDay;
  icon: string | null;
  completed: boolean;
};

export type CalendarItemMilestone = CalendarItemBase & {
  source_type: "milestone";
  source_id: string;
  category: string | null;
};

export type CalendarItemReminder = CalendarItemBase & {
  source_type: "reminder";
  source_id: string;
  source_task_id: string | null;
};

export type CalendarItemExternal = CalendarItemBase & {
  source_type: "external";
  source_id: string;
  calendar_id: string;
  location: string | null;
};

export type CalendarItemPlannerTimeBlock = CalendarItemBase & {
  source_type: "planner_time_block";
  source_id: string;
  plan_id: string;
  plan_date: string;
  planner_task_id: string;
  linked_task_id: string | null;
  mode: "time-block";
  blocks: number;
  duration_minutes: number;
  order: number;
  priority: CalendarTaskPriority | "planned";
  status: CalendarTaskStatus | "planned";
  project_id: string | null;
  project_name: string | null;
  tags: string[];
};

export type CalendarItemPlannerFreeTask = CalendarItemBase & {
  source_type: "planner_free_task";
  source_id: string;
  plan_id: string;
  plan_date: string;
  planner_task_id: string;
  linked_task_id: string | null;
  mode: "free";
  free_priority: "must" | "should" | "could" | "done";
  notes: string | null;
  estimated_minutes: number | null;
  order: number;
  status: CalendarTaskStatus | "planned" | "done";
  project_id: string | null;
  project_name: string | null;
  tags: string[];
};

export type CalendarItem =
  | CalendarItemTask
  | CalendarItemHabit
  | CalendarItemMilestone
  | CalendarItemReminder
  | CalendarItemExternal
  | CalendarItemPlannerTimeBlock
  | CalendarItemPlannerFreeTask;

// ──────────────────────────────────────────────────────────────────────
// Day context & load
// ──────────────────────────────────────────────────────────────────────

export type DayLoad =
  | "Light"
  | "Balanced"
  | "Focus-heavy"
  | "Deadline-heavy"
  | "Recovery";

export type FreeWindow = {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (24h) */
  start: string;
  end: string;
  /** Minutes between start and end. */
  duration_minutes: number;
  /** Short human label, e.g. "2h free 2–4 PM". */
  label: string;
};

export type DayContext = {
  /** YYYY-MM-DD */
  date: string;
  items: CalendarItem[];
  load: DayLoad;
  free_windows: FreeWindow[];
  overdue_count: number;
  conflict_count: number;
  /** Total minutes of time-boxed work on this day. */
  scheduled_minutes: number;
};

// ──────────────────────────────────────────────────────────────────────
// AI layer outputs
// ──────────────────────────────────────────────────────────────────────

export type DailySummary = {
  date: string;
  /** 2–3 sentence natural-language summary. */
  text: string;
  highlights: string[];
  energy_label: "High focus" | "Mixed" | "Recovery" | "Administrative";
};

export type ConflictSeverity = "info" | "warn" | "critical";

export type ConflictKind =
  | "time_overlap"
  | "mental_overload"
  | "focus_saturation"
  | "context_switching"
  | "deadline_cluster";

export type ConflictWarning = {
  id: string;
  kind: ConflictKind;
  severity: ConflictSeverity;
  /** Plain-language description. */
  message: string;
  /** IDs of involved CalendarItems. */
  item_ids: string[];
  suggestion: string | null;
};

export type PlanSuggestionSlot = {
  /** HH:mm — inclusive */
  start: string;
  /** HH:mm — exclusive */
  end: string;
};

export type PlanSuggestion = {
  id: string;
  /** The task to schedule (by Task.id, or null for "break"/"deep work"). */
  task_id: string | null;
  title: string;
  slot: PlanSuggestionSlot;
  rationale: string;
  energy: "deep" | "shallow" | "recovery";
};

// ──────────────────────────────────────────────────────────────────────
// Month view & Orbital
// ──────────────────────────────────────────────────────────────────────

export type MonthViewMode = "complete" | "minimal" | "orbital";

/**
 * Pre-computed position for a single day bubble in the Orbital canvas.
 * `position` is expressed in a 1000x1000 SVG viewbox centered on (500,500).
 */
export type OrbitalDay = {
  /** YYYY-MM-DD */
  date: string;
  /** Signed offset in days from "today" (today = 0, tomorrow = 1, yesterday = -1). */
  distance_from_today: number;
  /** Bubble radius in SVG units (today is the largest). */
  size: number;
  /**
   * Orbital parameters — the bubble revolves around (500,500) on an ellipse.
   * `angle` is the initial phase at t=0 (radians). `radius_x` / `radius_y`
   * define the ellipse; eccentricity = |rx - ry| / max(rx,ry).
   * `period_ms` = time for one full revolution (tuned to 80–120s per spec).
   * `direction` = 1 for CCW, -1 for CW — randomized per bubble.
   */
  angle: number;
  radius_x: number;
  radius_y: number;
  period_ms: number;
  direction: 1 | -1;
  items: CalendarItem[];
};

/** Today's center bubble (fixed; does not rotate). */
export type OrbitalCenter = {
  date: string;
  items: CalendarItem[];
};

export type OrbitalLayout = {
  center: OrbitalCenter;
  days: OrbitalDay[];
};
