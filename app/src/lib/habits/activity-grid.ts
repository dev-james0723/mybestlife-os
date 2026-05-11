/**
 * Lightweight aggregate counts for the Phase 2 activity heatmap.
 * Full `deriveCompositeHeatmap` (per-cell status, freezes, frequency) ships in Phase 3.
 */

export type CompletionLike = {
  habit_id: string;
  completion_date: string;
  status: "done" | "skipped";
};

/**
 * For each ISO date in `days` (oldest → newest), count `done` completions
 * optionally restricted to `habitIdFilter` (empty = all habits).
 */
export function buildAggregateDoneCounts(
  completions: readonly CompletionLike[],
  habitIdFilter: readonly string[],
  days: readonly string[],
): number[] {
  const filter =
    habitIdFilter.length > 0 ? new Set(habitIdFilter) : null;
  const counts = new Map<string, number>();
  for (const d of days) counts.set(d, 0);

  for (const c of completions) {
    if (c.status !== "done") continue;
    if (filter && !filter.has(c.habit_id)) continue;
    const prev = counts.get(c.completion_date) ?? 0;
    counts.set(c.completion_date, prev + 1);
  }

  return days.map((d) => counts.get(d) ?? 0);
}

export function maxPositive(values: readonly number[]): number {
  let m = 0;
  for (const v of values) if (v > m) m = v;
  return m;
}
