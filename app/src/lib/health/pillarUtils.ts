import type { HealthDailyLog } from "@/types/database";

export type PillarKey = "sleep" | "energy" | "mood" | "stress";

/**
 * Returns the raw 1-10 subjective value for a pillar for a single log.
 * Mood is defined as `mood_valence` (happy ↔ sad); arousal is shown
 * separately in the MoodPad.
 */
export function pillarValue(log: HealthDailyLog | null, pillar: PillarKey): number | null {
  if (!log) return null;
  switch (pillar) {
    case "sleep":
      return log.sleep_quality;
    case "energy":
      return log.energy_level;
    case "mood":
      return log.mood_valence;
    case "stress":
      return log.stress_level;
  }
}

/**
 * Computes simple mean over the last N days of valid values. Returns null
 * when fewer than 3 data points exist (avoids misleading "averages" for
 * people who just started logging).
 */
export function pillarAverage(
  logs: HealthDailyLog[],
  pillar: PillarKey,
  lastNDays = 7,
): number | null {
  const slice = logs.slice(-lastNDays);
  const values = slice
    .map((l) => pillarValue(l, pillar))
    .filter((v): v is number => typeof v === "number");
  if (values.length < 3) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function pillarDelta(
  today: HealthDailyLog | null,
  logs: HealthDailyLog[],
  pillar: PillarKey,
): number | null {
  const current = pillarValue(today, pillar);
  const avg = pillarAverage(logs, pillar);
  if (current === null || avg === null) return null;
  return current - avg;
}

/**
 * Maps a 1-10 pillar value to a qualitative tone band. Used for color + copy.
 * Sleep/Energy/Mood: higher is better; Stress: lower is better.
 */
export type Band = "great" | "good" | "fair" | "low";

export function pillarBand(value: number | null, pillar: PillarKey): Band | null {
  if (value === null) return null;
  const isInverted = pillar === "stress";
  const v = isInverted ? 11 - value : value;
  if (v >= 8) return "great";
  if (v >= 6) return "good";
  if (v >= 4) return "fair";
  return "low";
}

export function bandClass(band: Band | null): string {
  switch (band) {
    case "great":
      return "text-green-600 dark:text-green-400";
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "fair":
      return "text-amber-600 dark:text-amber-400";
    case "low":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/** Counts consecutive days (from most recent, backwards) where `predicate(log)` is true. */
export function streakBy(
  logs: HealthDailyLog[],
  predicate: (log: HealthDailyLog) => boolean,
): number {
  let n = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (predicate(logs[i])) n += 1;
    else break;
  }
  return n;
}

export const HIGH_STRESS_THRESHOLD = 7;

export function highStressStreak(logs: HealthDailyLog[]): number {
  return streakBy(logs, (l) => (l.stress_level ?? 0) >= HIGH_STRESS_THRESHOLD);
}
