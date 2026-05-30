/**
 * Pure date helpers for the Tasks command center. All deadline / created /
 * updated bucketing lives here so views, filters, grouping and analytics share
 * one source of truth (no date math scattered across components).
 */
import {
  addDays,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";

/** ISO date string range (inclusive). Either bound may be omitted. */
export type DateRange = { start?: string; end?: string };

/** Fine-grained deadline classification used by filters + analytics. */
export type DeadlineBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this-week"
  | "next-week"
  | "this-month"
  | "later"
  | "none";

/** Coarse columns used by the board "group by deadline" lane. */
export type DeadlineColumn = "overdue" | "today" | "this-week" | "later" | "none";

/** Deadline filter selector values. */
export type DeadlineFilterValue =
  | "all"
  | "today"
  | "tomorrow"
  | "this-week"
  | "next-week"
  | "this-month"
  | "overdue"
  | "none"
  | "custom";

/** Created / updated date filter presets. */
export type DatePresetValue =
  | "all"
  | "today"
  | "this-week"
  | "this-month"
  | "recent"
  | "custom";

const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday-based weeks

export function parseDateSafe(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Classify a due date relative to `now`. Date-only semantics: a date in the
 * past (before today) is "overdue" regardless of task status. Status-aware
 * overdue lives in the view model (`isOverdue`).
 */
export function getDeadlineBucket(
  dueDate: string | null | undefined,
  now: Date = new Date(),
): DeadlineBucket {
  const d = parseDateSafe(dueDate);
  if (!d) return "none";

  const today = startOfDay(now);
  const day = startOfDay(d);

  if (isBefore(day, today)) return "overdue";
  if (isSameDay(day, today)) return "today";
  if (isSameDay(day, addDays(today, 1))) return "tomorrow";

  const weekEnd = endOfWeek(now, WEEK_OPTS);
  if (!isAfter(day, weekEnd)) return "this-week";

  const nextWeekStart = startOfWeek(addWeeks(now, 1), WEEK_OPTS);
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), WEEK_OPTS);
  if (!isBefore(day, nextWeekStart) && !isAfter(day, nextWeekEnd)) return "next-week";

  const monthEnd = endOfMonth(now);
  if (!isAfter(day, monthEnd)) return "this-month";

  return "later";
}

/** ISO `yyyy-MM-dd` for storing in a `date` column. */
export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Target `due_date` when a task is dragged into a deadline lane on the board.
 * Returns `undefined` to mean "no change" (overdue can't be set by dropping)
 * and `null` to clear the date ("No Deadline" lane).
 */
export function deadlineColumnToDueDate(
  column: DeadlineColumn,
  now: Date = new Date(),
): string | null | undefined {
  switch (column) {
    case "today":
      return toDateOnly(startOfDay(now));
    case "this-week":
      return toDateOnly(endOfWeek(now, WEEK_OPTS));
    case "later":
      // Guaranteed to land in the "later" bucket (past end of month).
      return toDateOnly(addDays(endOfMonth(now), 1));
    case "none":
      return null;
    case "overdue":
    default:
      return undefined;
  }
}

export function deadlineBucketToColumn(bucket: DeadlineBucket): DeadlineColumn {
  switch (bucket) {
    case "overdue":
      return "overdue";
    case "today":
      return "today";
    case "tomorrow":
    case "this-week":
      return "this-week";
    case "next-week":
    case "this-month":
    case "later":
      return "later";
    case "none":
      return "none";
  }
}

/** True when `date` falls inside the inclusive ISO range (open bounds allowed). */
export function isWithinRange(date: Date, range?: DateRange): boolean {
  const start = parseDateSafe(range?.start);
  const end = parseDateSafe(range?.end);
  if (start && isBefore(date, startOfDay(start))) return false;
  if (end && isAfter(date, endOfDay(end))) return false;
  return true;
}

export function matchesDeadlineFilter(
  dueDate: string | null | undefined,
  value: DeadlineFilterValue,
  now: Date = new Date(),
  range?: DateRange,
): boolean {
  if (value === "all") return true;
  if (value === "custom") {
    const d = parseDateSafe(dueDate);
    return d ? isWithinRange(d, range) : false;
  }

  const bucket = getDeadlineBucket(dueDate, now);
  switch (value) {
    case "today":
      return bucket === "today";
    case "tomorrow":
      return bucket === "tomorrow";
    case "this-week":
      return bucket === "today" || bucket === "tomorrow" || bucket === "this-week";
    case "next-week":
      return bucket === "next-week";
    case "this-month":
      return (
        bucket === "today" ||
        bucket === "tomorrow" ||
        bucket === "this-week" ||
        bucket === "next-week" ||
        bucket === "this-month"
      );
    case "overdue":
      return bucket === "overdue";
    case "none":
      return bucket === "none";
    default:
      return true;
  }
}

export function matchesDatePreset(
  dateISO: string | null | undefined,
  value: DatePresetValue,
  now: Date = new Date(),
  range?: DateRange,
): boolean {
  if (value === "all") return true;
  const d = parseDateSafe(dateISO);
  if (!d) return false;

  switch (value) {
    case "today":
      return isSameDay(d, now);
    case "this-week":
      return isWithinInterval(d, {
        start: startOfWeek(now, WEEK_OPTS),
        end: endOfWeek(now, WEEK_OPTS),
      });
    case "this-month":
      return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
    case "recent":
      return isAfter(d, subDays(now, 2));
    case "custom":
      return isWithinRange(d, range);
    default:
      return true;
  }
}
