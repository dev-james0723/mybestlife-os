import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isValid,
  min as minDate,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
  subYears,
} from "date-fns";

import type {
  AnalyticsBucketGranularity,
  AnalyticsPresetRangeKey,
  AnalyticsRange,
  AnalyticsRangeOption,
  AnalyticsRangeSelection,
  AnalyticsRangeValidationResult,
} from "./types";

export const MAX_ANALYTICS_RANGE_DAYS = 3653;

export const DEFAULT_ANALYTICS_RANGE_SELECTION: Extract<
  AnalyticsRangeSelection,
  { source: "preset" }
> = {
  source: "preset",
  key: "7D",
};

type PresetDuration = {
  unit: "day" | "month" | "year";
  count: number;
};

export const ANALYTICS_RANGE_OPTIONS: AnalyticsRangeOption[] = [
  {
    key: "1D",
    label: "1D",
    behavior: "Today only: immediate state, loose ends, and current pressure.",
  },
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
    key: "14D",
    label: "14D",
    behavior: "Two-week cadence, recovery, and short-cycle consistency.",
  },
  {
    key: "21D",
    label: "21D",
    behavior: "Three-week pattern formation and repeated friction.",
  },
  {
    key: "30D",
    label: "30D",
    behavior: "Habit pattern, repeated bottlenecks, project movement.",
  },
  {
    key: "45D",
    label: "45D",
    behavior: "Six-week direction, drift, and load accumulation.",
  },
  {
    key: "2M",
    label: "2M",
    behavior: "Sustained direction and whether momentum survives novelty.",
  },
  {
    key: "90D",
    label: "90D",
    behavior: "Quarter-scale execution, project survival, and recurring patterns.",
  },
  {
    key: "6M",
    label: "6M",
    behavior: "Project survival, knowledge compounding, identity movement.",
  },
  {
    key: "9M",
    label: "9M",
    behavior: "Longer arc: compounding, stalled commitments, and life load.",
  },
  {
    key: "1Y",
    label: "1Y",
    behavior: "Life themes, major progress, recurring avoidance.",
  },
  {
    key: "18M",
    label: "18M",
    behavior: "Identity shift over multiple seasons, not just a single year.",
  },
  {
    key: "2Y",
    label: "2Y",
    behavior: "Two-year life arc, structural progress, and enduring loops.",
  },
  {
    key: "3Y",
    label: "3Y",
    behavior: "Multi-year identity evolution and repeated strategic patterns.",
  },
  {
    key: "5Y",
    label: "5Y",
    behavior: "Long-term identity evolution.",
  },
  {
    key: "10Y",
    label: "10Y",
    behavior: "Decade-level identity evolution.",
  },
];

const DURATION_BY_RANGE: Record<AnalyticsPresetRangeKey, PresetDuration> = {
  "1D": { unit: "day", count: 1 },
  "3D": { unit: "day", count: 3 },
  "7D": { unit: "day", count: 7 },
  "14D": { unit: "day", count: 14 },
  "21D": { unit: "day", count: 21 },
  "30D": { unit: "day", count: 30 },
  "45D": { unit: "day", count: 45 },
  "2M": { unit: "month", count: 2 },
  "90D": { unit: "day", count: 90 },
  "6M": { unit: "month", count: 6 },
  "9M": { unit: "month", count: 9 },
  "1Y": { unit: "year", count: 1 },
  "18M": { unit: "month", count: 18 },
  "2Y": { unit: "year", count: 2 },
  "3Y": { unit: "year", count: 3 },
  "5Y": { unit: "year", count: 5 },
  "10Y": { unit: "year", count: 10 },
};

export function getRangeOption(key: AnalyticsPresetRangeKey): AnalyticsRangeOption {
  return (
    ANALYTICS_RANGE_OPTIONS.find((option) => option.key === key) ?? {
      key,
      label: key,
      behavior: "Custom analytics range.",
    }
  );
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return startOfDay(parsed);
}

function buildAnalyticsRange(params: {
  key: AnalyticsRange["key"];
  source: AnalyticsRange["source"];
  presetKey?: AnalyticsRange["presetKey"];
  presetId?: string;
  label: string;
  behavior: string;
  start: Date;
  end: Date;
}): AnalyticsRange {
  const start = startOfDay(params.start);
  const end = endOfDay(params.end);
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const previousEnd = endOfDay(subDays(start, 1));
  const previousStart = startOfDay(subDays(previousEnd, days - 1));

  return {
    key: params.key,
    source: params.source,
    presetKey: params.presetKey,
    presetId: params.presetId,
    label: params.label,
    behavior: params.behavior,
    days,
    start,
    end,
    startISO: format(start, "yyyy-MM-dd"),
    endISO: format(end, "yyyy-MM-dd"),
    previousStart,
    previousEnd,
    previousStartISO: format(previousStart, "yyyy-MM-dd"),
    previousEndISO: format(previousEnd, "yyyy-MM-dd"),
    isLongRangePlaceholder: false,
  };
}

function getPresetAnalyticsDateRange(
  key: AnalyticsPresetRangeKey,
  now = new Date(),
): AnalyticsRange {
  const option = getRangeOption(key);
  const end = endOfDay(now);
  const duration = DURATION_BY_RANGE[key];
  const start =
    duration.unit === "year"
      ? startOfDay(subYears(end, duration.count))
      : duration.unit === "month"
        ? startOfDay(subMonths(end, duration.count))
        : startOfDay(subDays(end, duration.count - 1));

  return buildAnalyticsRange({
    key,
    source: "preset",
    presetKey: key,
    label: option.label,
    behavior: option.behavior,
    start,
    end,
  });
}

export function validateAnalyticsDateRange(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  now = new Date(),
): AnalyticsRangeValidationResult {
  if (!startISO || !endISO) return { ok: false, error: "missing" };
  const start = parseDateOnly(startISO);
  const end = parseDateOnly(endISO);
  if (!start || !end) return { ok: false, error: "invalid" };

  const todayEnd = endOfDay(now);
  if (isAfter(end, todayEnd)) return { ok: false, error: "future_end" };
  if (isAfter(start, end)) return { ok: false, error: "start_after_end" };

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  if (days > MAX_ANALYTICS_RANGE_DAYS) return { ok: false, error: "too_long" };

  return {
    ok: true,
    startISO: format(start, "yyyy-MM-dd"),
    endISO: format(end, "yyyy-MM-dd"),
    days,
  };
}

export function getAnalyticsDateRange(
  selection: AnalyticsPresetRangeKey | AnalyticsRangeSelection,
  now = new Date(),
): AnalyticsRange {
  if (typeof selection === "string") {
    return getPresetAnalyticsDateRange(selection, now);
  }

  if (selection.source === "preset") {
    return getPresetAnalyticsDateRange(selection.key, now);
  }

  const validated = validateAnalyticsDateRange(selection.startISO, selection.endISO, now);
  if (!validated.ok) {
    return getPresetAnalyticsDateRange(DEFAULT_ANALYTICS_RANGE_SELECTION.key, now);
  }

  const start = parseDateOnly(validated.startISO) ?? now;
  const end = parseDateOnly(validated.endISO) ?? now;
  const label =
    selection.source === "saved"
      ? selection.name.trim() || "Saved range"
      : selection.label?.trim() || "Custom";

  return buildAnalyticsRange({
    key: "CUSTOM",
    source: selection.source,
    presetId: selection.source === "saved" ? selection.presetId : undefined,
    label,
    behavior: `Custom analytics range from ${validated.startISO} to ${validated.endISO}.`,
    start,
    end,
  });
}

export function parseAnyDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
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

export type AnalyticsRangeBucket = {
  start: Date;
  end: Date;
  key: string;
  label: string;
};

export function getAnalyticsBucketGranularity(
  range: AnalyticsRange,
): AnalyticsBucketGranularity {
  if (range.days <= 45) return "day";
  if (range.days <= 400) return "week";
  return "month";
}

export function eachBucketInAnalyticsRange(range: AnalyticsRange): AnalyticsRangeBucket[] {
  const granularity = getAnalyticsBucketGranularity(range);

  if (granularity === "day") {
    return eachDayInAnalyticsRange(range).map((day) => ({
      start: startOfDay(day),
      end: endOfDay(day),
      key: toDayKey(day),
      label: format(day, range.days <= 14 ? "EEE" : "MMM d"),
    }));
  }

  const buckets: AnalyticsRangeBucket[] = [];
  let cursor = startOfDay(range.start);

  while (!isAfter(cursor, range.end)) {
    const rawEnd =
      granularity === "week" ? endOfDay(addDays(cursor, 6)) : endOfDay(endOfMonth(cursor));
    const bucketEnd = minDate([rawEnd, range.end]);
    buckets.push({
      start: cursor,
      end: bucketEnd,
      key: toDayKey(cursor),
      label: format(cursor, granularity === "week" ? "MMM d" : "MMM yyyy"),
    });
    cursor =
      granularity === "week"
        ? startOfDay(addDays(bucketEnd, 1))
        : startOfDay(addMonths(cursor, 1));
  }

  return buckets;
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
