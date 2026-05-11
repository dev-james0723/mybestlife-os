/**
 * Pure calendar math on `YYYY-MM-DD` strings (ordinal dates, UTC arithmetic).
 * Avoids JS `Date` local/UTC ambiguity for day boundaries.
 */

export function parseIsoParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m ?? 1, d: d ?? 1 };
}

export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const a = parseIsoParts(fromIso);
  const b = parseIsoParts(toIso);
  const ta = Date.UTC(a.y, a.m - 1, a.d);
  const tb = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((tb - ta) / 86400000);
}

export function addDaysIso(iso: string, delta: number): string {
  const { y, m, d } = parseIsoParts(iso);
  const t = Date.UTC(y, m - 1, d + delta);
  const nd = new Date(t);
  const yy = nd.getUTCFullYear();
  const mm = String(nd.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nd.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Sunday = 0 … Saturday = 6 (UTC calendar on that ISO date). */
export function utcWeekdaySun0(iso: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const { y, m, d } = parseIsoParts(iso);
  const w = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return w as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Monday = 0 … Sunday = 6 */
export function isoWeekdayMon0(iso: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const w = utcWeekdaySun0(iso);
  return (w === 0 ? 6 : w - 1) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function startOfIsoWeekMonday(iso: string): string {
  const mon0 = isoWeekdayMon0(iso);
  return addDaysIso(iso, -mon0);
}

export function eachIsoDayInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDaysIso(cur, 1);
  }
  return out;
}

export function formatTodayInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar date of `createdAt` in the user's zone (for habit start). */
export function calendarDayFromInstant(
  isoInstant: string,
  timeZone: string,
): string {
  return formatTodayInTimeZone(new Date(isoInstant), timeZone);
}
