import { addDays, format, parseISO } from "date-fns";

type ZonedParts = { dateStr: string; h: number; m: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getZonedParts(d: Date, timeZone: string): ZonedParts {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const o: Partial<Record<"year" | "month" | "day" | "hour" | "minute", number>> = {};
  for (const p of f.formatToParts(d)) {
    if (p.type === "year") o.year = Number(p.value);
    if (p.type === "month") o.month = Number(p.value);
    if (p.type === "day") o.day = Number(p.value);
    if (p.type === "hour") o.hour = Number(p.value);
    if (p.type === "minute") o.minute = Number(p.value);
  }
  const y = o.year ?? 1970;
  const mo = o.month ?? 1;
  const day = o.day ?? 1;
  return {
    dateStr: `${y}-${pad2(mo)}-${pad2(day)}`,
    h: o.hour ?? 0,
    m: o.minute ?? 0,
  };
}

/**
 * Returns the UTC instant when the wall-clock reads `hours`:`minutes` on `dateStr` in `timeZone`.
 */
export function zonedWallClockToUtc(
  dateStr: string,
  hours: number,
  minutes: number,
  timeZone: string,
): Date {
  let utcMs = Date.parse(`${dateStr}T12:00:00.000Z`);
  for (let i = 0; i < 32; i++) {
    const cur = getZonedParts(new Date(utcMs), timeZone);
    if (cur.dateStr === dateStr && cur.h === hours && cur.m === minutes) {
      return new Date(utcMs);
    }
    const targetMin = hours * 60 + minutes;
    const curMin = cur.h * 60 + cur.m;
    let dayDiff = 0;
    if (dateStr > cur.dateStr) dayDiff = 1;
    else if (dateStr < cur.dateStr) dayDiff = -1;
    utcMs += dayDiff * 86_400_000 + (targetMin - curMin) * 60_000;
  }
  return new Date(utcMs);
}

/**
 * Cleanup window covers `planDate` plus the following calendar day so events from cross-midnight
 * plans (e.g., 11 PM → 4 AM next day) are still discoverable when re-syncing the same `planDate`.
 */
export function planDateCleanupEndUtc(planDate: string, timeZone: string): string {
  const afterStr = format(addDays(parseISO(planDate), 2), "yyyy-MM-dd");
  return zonedWallClockToUtc(afterStr, 0, 0, timeZone).toISOString();
}

/** Local calendar date (YYYY-MM-DD) for an absolute instant in `timeZone`. */
export function resolvePlannerDateFromDateTime(d: Date, timeZone: string): string {
  return getZonedParts(d, timeZone).dateStr;
}
