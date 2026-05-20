/**
 * Calendar projection layer — reads from source tables, writes nothing.
 *
 * Given a date (or date range) and the raw source objects, produces a
 * flat `CalendarItem[]` that every Calendar surface consumes. This is
 * the seam between "source of truth" (tasks / habits / goals / external
 * events) and "time-ordered view" (today, week, month, orbital).
 *
 * Phase 1 ships with lightweight pure logic; Phase 5 wires in the real
 * source mappers from `lib/calendar/sources/*`.
 */

import {
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";
import type {
  CalendarHabitOccurrence,
  CalendarItem,
  CalendarItemHabit,
  CalendarItemMilestone,
  CalendarItemReminder,
  CalendarItemTask,
  CalendarMilestone,
  CalendarReminder,
  CalendarTask,
  DayContext,
  DayLoad,
  FreeWindow,
} from "./types";

// ──────────────────────────────────────────────────────────────────────
// Source → CalendarItem mappers
// ──────────────────────────────────────────────────────────────────────

const TASK_PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#3b82f6",
  low: "#94a3b8",
};

const HABIT_TIME_COLORS: Record<string, string> = {
  morning: "#f59e0b",
  afternoon: "#0ea5e9",
  evening: "#8b5cf6",
  anytime: "#10b981",
};

export function taskToCalendarItem(task: CalendarTask): CalendarItemTask | null {
  if (!task.due_date) return null;
  const date = task.due_date.slice(0, 10);
  const today = format(new Date(), "yyyy-MM-dd");
  const overdue =
    task.status !== "done" &&
    task.status !== "cancelled" &&
    date < today;
  return {
    id: `task:${task.id}`,
    source_type: "task",
    source_id: task.id,
    title: task.title,
    date,
    start_time: null,
    end_time: null,
    color: TASK_PRIORITY_COLORS[task.priority] ?? TASK_PRIORITY_COLORS.medium,
    subtitle: task.project_name ?? null,
    priority: task.priority,
    status: task.status,
    estimated_blocks: task.estimated_blocks,
    project_id: task.project_id,
    overdue,
    tags: task.tags,
  };
}

export function habitOccurrenceToCalendarItem(
  occ: CalendarHabitOccurrence
): CalendarItemHabit {
  return {
    id: `habit:${occ.habit_id}:${occ.date}`,
    source_type: "habit",
    source_id: occ.habit_id,
    habit_id: occ.habit_id,
    title: occ.name,
    date: occ.date,
    start_time: null,
    end_time: null,
    color: occ.color ?? HABIT_TIME_COLORS[occ.time_of_day] ?? HABIT_TIME_COLORS.anytime,
    subtitle: null,
    time_of_day: occ.time_of_day,
    icon: occ.icon,
    completed: occ.completed,
  };
}

export function milestoneToCalendarItem(m: CalendarMilestone): CalendarItemMilestone {
  return {
    id: `milestone:${m.id}`,
    source_type: "milestone",
    source_id: m.id,
    title: m.title,
    date: m.target_date.slice(0, 10),
    start_time: null,
    end_time: null,
    color: "#a855f7",
    subtitle: m.category,
    category: m.category,
  };
}

export function reminderToCalendarItem(r: CalendarReminder): CalendarItemReminder {
  const date = r.remind_at.slice(0, 10);
  const time = r.remind_at.slice(11, 16);
  return {
    id: `reminder:${r.id}`,
    source_type: "reminder",
    source_id: r.id,
    title: r.title,
    date,
    start_time: time || null,
    end_time: time || null,
    color: "#eab308",
    subtitle: null,
    source_task_id: r.source_task_id,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Main projection entry
// ──────────────────────────────────────────────────────────────────────

export type CalendarSources = {
  tasks: CalendarTask[];
  habitOccurrences: CalendarHabitOccurrence[];
  milestones: CalendarMilestone[];
  reminders: CalendarReminder[];
  plannerItems?: CalendarItem[];
};

/**
 * Full range projection. Caller supplies pre-expanded habit occurrences
 * (one per active day) — the projection stays decoupled from habit
 * frequency logic.
 */
export function projectToCalendarItems(sources: CalendarSources): CalendarItem[] {
  const items: CalendarItem[] = [];
  for (const t of sources.tasks) {
    const item = taskToCalendarItem(t);
    if (item) items.push(item);
  }
  for (const occ of sources.habitOccurrences) {
    items.push(habitOccurrenceToCalendarItem(occ));
  }
  for (const m of sources.milestones) {
    if (!m.target_date) continue;
    items.push(milestoneToCalendarItem(m));
  }
  for (const r of sources.reminders) {
    items.push(reminderToCalendarItem(r));
  }
  if (sources.plannerItems?.length) {
    items.push(...sources.plannerItems);
  }
  return items.sort(sortItemsByDateAndTime);
}

/**
 * Narrow a full CalendarItem[] to a single day. Cheap filter; callers
 * memoize upstream.
 */
export function itemsForDate(items: CalendarItem[], date: string): CalendarItem[] {
  return items.filter((i) => i.date === date);
}

export function sortItemsByDateAndTime(a: CalendarItem, b: CalendarItem): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  const at = a.start_time ?? "99:99";
  const bt = b.start_time ?? "99:99";
  return at.localeCompare(bt);
}

// ──────────────────────────────────────────────────────────────────────
// Derived per-day context (load badge, free windows, overdue / conflict counts)
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_WORK_START = "09:00";
const DEFAULT_WORK_END = "19:00";

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function humanRange(start: string, end: string): string {
  const sh = Number(start.slice(0, 2));
  const eh = Number(end.slice(0, 2));
  const to12 = (h: number) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hh} ${suffix}`;
  };
  const hours = Math.round((minutes(end) - minutes(start)) / 60);
  return `${hours}h free ${to12(sh)}–${to12(eh)}`;
}

/**
 * Compute free windows between time-boxed items on a day. Items
 * without explicit start/end are treated as all-day and do not block
 * the timeline (they surface as context, not time conflicts).
 */
export function computeFreeWindows(
  date: string,
  items: CalendarItem[],
  workStart = DEFAULT_WORK_START,
  workEnd = DEFAULT_WORK_END
): FreeWindow[] {
  const start = minutes(workStart);
  const end = minutes(workEnd);
  const boxed = items
    .filter((i) => i.start_time && i.end_time)
    .map((i) => ({ s: minutes(i.start_time!), e: minutes(i.end_time!) }))
    .sort((a, b) => a.s - b.s);

  const windows: FreeWindow[] = [];
  let cursor = start;
  for (const b of boxed) {
    if (b.s > cursor) {
      const dur = Math.min(b.s, end) - cursor;
      if (dur >= 30) {
        windows.push({
          date,
          start: fmt(cursor),
          end: fmt(Math.min(b.s, end)),
          duration_minutes: dur,
          label: humanRange(fmt(cursor), fmt(Math.min(b.s, end))),
        });
      }
    }
    cursor = Math.max(cursor, b.e);
    if (cursor >= end) break;
  }
  if (cursor < end) {
    const dur = end - cursor;
    if (dur >= 30) {
      windows.push({
        date,
        start: fmt(cursor),
        end: fmt(end),
        duration_minutes: dur,
        label: humanRange(fmt(cursor), fmt(end)),
      });
    }
  }
  return windows;
}

/** Classify a day's load based on item mix and overdue count. */
export function classifyDayLoad(items: CalendarItem[]): DayLoad {
  if (items.length === 0) return "Recovery";

  const overdue = items.filter(
    (i) => i.source_type === "task" && (i as CalendarItemTask).overdue
  ).length;
  const deadlines = items.filter(
    (i) =>
      (i.source_type === "task" &&
        ((i as CalendarItemTask).priority === "urgent" ||
          (i as CalendarItemTask).priority === "high")) ||
      i.source_type === "milestone"
  ).length;
  const focusTasks = items.filter(
    (i) =>
      i.source_type === "task" &&
      ((i as CalendarItemTask).estimated_blocks ?? 0) >= 6
  ).length;

  if (deadlines >= 3 || overdue >= 3) return "Deadline-heavy";
  if (focusTasks >= 3) return "Focus-heavy";
  if (items.length <= 2) return "Light";
  return "Balanced";
}

export function scheduledMinutes(items: CalendarItem[]): number {
  return items.reduce((sum, i) => {
    if (!i.start_time || !i.end_time) return sum;
    return sum + Math.max(0, minutes(i.end_time) - minutes(i.start_time));
  }, 0);
}

export function buildDayContext(
  date: string,
  allItems: CalendarItem[],
  workStart = DEFAULT_WORK_START,
  workEnd = DEFAULT_WORK_END
): DayContext {
  const items = itemsForDate(allItems, date);
  const overdue_count = items.filter(
    (i) => i.source_type === "task" && (i as CalendarItemTask).overdue
  ).length;
  const free_windows = computeFreeWindows(date, items, workStart, workEnd);
  return {
    date,
    items,
    load: classifyDayLoad(items),
    free_windows,
    overdue_count,
    conflict_count: 0, // filled in by AI.detectConflicts()
    scheduled_minutes: scheduledMinutes(items),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Range helpers for month / week / orbital views
// ──────────────────────────────────────────────────────────────────────

export function daysBetween(from: Date, to: Date): string[] {
  const result: string[] = [];
  const span = differenceInCalendarDays(to, from);
  for (let i = 0; i <= span; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    result.push(format(d, "yyyy-MM-dd"));
  }
  return result;
}

export function groupItemsByDate(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const map = new Map<string, CalendarItem[]>();
  for (const i of items) {
    const arr = map.get(i.date);
    if (arr) arr.push(i);
    else map.set(i.date, [i]);
  }
  return map;
}

/**
 * For surfaces that need a stable per-day list regardless of whether items
 * exist (empty days must still render as cells / bubbles).
 */
export function itemsPerDate(
  items: CalendarItem[],
  dates: string[]
): Array<{ date: string; items: CalendarItem[] }> {
  const grouped = groupItemsByDate(items);
  return dates.map((date) => ({ date, items: grouped.get(date) ?? [] }));
}

export function isItemOverdue(item: CalendarItem): boolean {
  return item.source_type === "task" && (item as CalendarItemTask).overdue;
}

export function parseItemDate(item: CalendarItem): Date {
  return parseISO(item.date);
}
