import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  subDays,
  subYears,
} from "date-fns";

import type {
  AnalyticsRange,
  AnalyticsRangeKey,
  AnalyticsRangeOption,
} from "./types";

export const ANALYTICS_RANGE_OPTIONS: AnalyticsRangeOption[] = [
  {
    key: "3D",
    label: "3D",
    behavior: "Acute state, immediate rhythm, recent overload.",
  },
  {
    key: "7D",
    label: "7D",
    behavior: "Weekly execution, planning consistency, emotional load.",
  },
  {
    key: "30D",
    label: "30D",
    behavior: "Habit pattern, repeated bottlenecks, project movement.",
  },
  {
    key: "2M",
    label: "2M",
    behavior: "Sustained direction and whether momentum survives novelty.",
  },
  {
    key: "6M",
    label: "6M",
    behavior: "Project survival, knowledge compounding, identity movement.",
  },
  {
    key: "1Y",
    label: "1Y",
    behavior: "Life themes, major progress, recurring avoidance.",
  },
  {
    key: "5Y",
    label: "5Y",
    behavior: "Long-term identity evolution.",
    disabled: true,
    disabledReason: "Not enough historical depth yet.",
  },
  {
    key: "10Y",
    label: "10Y",
    behavior: "Decade-level identity evolution.",
    disabled: true,
    disabledReason: "Not enough historical depth yet.",
  },
];

const DAYS_BY_RANGE: Record<AnalyticsRangeKey, number> = {
  "3D": 3,
  "7D": 7,
  "30D": 30,
  "2M": 60,
  "90D": 90,
  "6M": 183,
  "1Y": 365,
  "5Y": 365 * 5,
  "10Y": 365 * 10,
};

export function getRangeOption(key: AnalyticsRangeKey): AnalyticsRangeOption {
  return (
    ANALYTICS_RANGE_OPTIONS.find((option) => option.key === key) ?? {
      key,
      label: key,
      behavior: "Custom analytics range.",
    }
  );
}

export function getAnalyticsDateRange(
  key: AnalyticsRangeKey,
  now = new Date(),
): AnalyticsRange {
  const end = endOfDay(now);
  const days = DAYS_BY_RANGE[key];
  const start =
    key === "1Y" || key === "5Y" || key === "10Y"
      ? startOfDay(subYears(end, key === "1Y" ? 1 : key === "5Y" ? 5 : 10))
      : startOfDay(subDays(end, days - 1));
  const actualDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const previousEnd = endOfDay(subDays(start, 1));
  const previousStart = startOfDay(subDays(previousEnd, actualDays - 1));
  const option = getRangeOption(key);

  return {
    key,
    label: option.label,
    behavior: option.behavior,
    days: actualDays,
    start,
    end,
    startISO: format(start, "yyyy-MM-dd"),
    endISO: format(end, "yyyy-MM-dd"),
    previousStart,
    previousEnd,
    previousStartISO: format(previousStart, "yyyy-MM-dd"),
    previousEndISO: format(previousEnd, "yyyy-MM-dd"),
    isLongRangePlaceholder: key === "5Y" || key === "10Y",
  };
}

export function parseAnyDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function toDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatShortDate(dateISO: string | null): string {
  if (!dateISO) return "No dated activity";
  const parsed = parseAnyDate(dateISO);
  if (!parsed) return "No dated activity";
  return format(parsed, "MMM d");
}

export function isDateInRange(
  value: string | null | undefined,
  start: Date,
  end: Date,
): boolean {
  const parsed = parseAnyDate(value);
  if (!parsed) return false;
  return !isBefore(parsed, start) && !isAfter(parsed, end);
}

export function eachDayInAnalyticsRange(range: AnalyticsRange): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(range.start);
  while (!isAfter(cursor, range.end)) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function daysSince(value: string | null | undefined, now = new Date()): number | null {
  const parsed = parseAnyDate(value);
  if (!parsed) return null;
  return Math.max(0, differenceInCalendarDays(now, parsed));
}

export function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function percent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return clamp((numerator / denominator) * 100);
}
