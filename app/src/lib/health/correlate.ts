/**
 * Pearson correlation and simple conditional-mean analysis.
 *
 * For personal health data we skip p-values and Spearman rank — they're
 * overkill for n≈14-90 daily logs. Pearson + minimum-n guard is plenty.
 *
 * All functions are pure and side-effect free so they can also run in a
 * Web Worker for larger datasets.
 */

export type Pair = [number, number];

export function pearson(pairs: Pair[]): number | null {
  const n = pairs.length;
  if (n < 3) return null;
  let sx = 0, sy = 0;
  for (const [x, y] of pairs) {
    sx += x;
    sy += y;
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (const [x, y] of pairs) {
    const dx = x - mx;
    const dy = y - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  if (denom === 0) return null;
  return num / denom;
}

export type ConditionalMean = {
  n: number;
  match: number;
  unmatched: number;
  matchMean: number | null;
  unmatchedMean: number | null;
  deltaPct: number | null; // (matchMean - unmatchedMean) / unmatchedMean
};

/**
 * Compute the mean of `metric` on days where `condition(day)` is true vs
 * days where it is false. Useful for phrasings like "On days you sleep
 * less than 7h, your energy is 22% lower."
 */
export function conditionalMean<T>(
  rows: T[],
  condition: (row: T) => boolean,
  metric: (row: T) => number | null,
): ConditionalMean {
  const matches: number[] = [];
  const unmatches: number[] = [];
  for (const row of rows) {
    const v = metric(row);
    if (v === null || !Number.isFinite(v)) continue;
    if (condition(row)) matches.push(v);
    else unmatches.push(v);
  }
  const n = matches.length + unmatches.length;
  const matchMean = matches.length ? matches.reduce((a, b) => a + b, 0) / matches.length : null;
  const unmatchedMean = unmatches.length ? unmatches.reduce((a, b) => a + b, 0) / unmatches.length : null;
  const deltaPct =
    matchMean !== null && unmatchedMean !== null && unmatchedMean !== 0
      ? (matchMean - unmatchedMean) / unmatchedMean
      : null;
  return {
    n,
    match: matches.length,
    unmatched: unmatches.length,
    matchMean,
    unmatchedMean,
    deltaPct,
  };
}
