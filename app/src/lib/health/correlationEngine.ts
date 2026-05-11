/**
 * Correlation "engine": walks a set of (condition, metric) pairs and
 * returns the most notable insights, ranked by absolute delta and sample
 * size.
 *
 * Inputs: pre-joined daily rows where each row has subjective + selected
 * objective daily values.
 */

import { conditionalMean, type ConditionalMean } from "./correlate";
import type { HealthDailyLog, HealthMetric } from "@/types/database";
import { bucketByDay } from "./metricsDerived";

export type JoinedDay = {
  date: string;
  sleepQuality: number | null;
  energy: number | null;
  moodValence: number | null;
  moodArousal: number | null;
  stress: number | null;
  sleepDurationHours: number | null;
  steps: number | null;
  hrv: number | null;
  rhr: number | null;
  workoutMinutes: number | null;
  caffeineMg: number | null;
};

export function joinDays(
  logs: HealthDailyLog[],
  metricsByType: Partial<Record<string, HealthMetric[]>>,
): JoinedDay[] {
  const bucketed: Record<string, Map<string, number>> = {};
  for (const [key, metrics] of Object.entries(metricsByType)) {
    if (!metrics) continue;
    const buckets = bucketByDay(metrics);
    bucketed[key] = new Map(buckets.map((b) => [b.date, b.value]));
  }
  return logs.map((l) => ({
    date: l.log_date,
    sleepQuality: l.sleep_quality,
    energy: l.energy_level,
    moodValence: l.mood_valence,
    moodArousal: l.mood_arousal,
    stress: l.stress_level,
    sleepDurationHours: bucketed.sleep_duration?.get(l.log_date) ?? null,
    steps: bucketed.steps?.get(l.log_date) ?? null,
    hrv: bucketed.hrv?.get(l.log_date) ?? null,
    rhr: bucketed.rhr?.get(l.log_date) ?? null,
    workoutMinutes: bucketed.workout_minutes?.get(l.log_date) ?? null,
    caffeineMg: bucketed.caffeine_mg?.get(l.log_date) ?? null,
  }));
}

export type InsightKey =
  | "sleep_lt_7h_vs_energy"
  | "sleep_lt_7h_vs_mood"
  | "steps_gt_8k_vs_mood"
  | "high_caffeine_vs_stress"
  | "workout_day_vs_energy"
  | "high_stress_vs_sleep_quality"
  | "low_hrv_vs_energy";

export type Insight = {
  key: InsightKey;
  conditionKey: "sleepLt7h" | "stepsGt8k" | "highCaffeine" | "workoutDay" | "highStress" | "lowHrv";
  metricKey: "energy" | "mood" | "sleepQuality" | "stress";
  stats: ConditionalMean;
  direction: "higher" | "lower";
};

/** Returns up to `max` insights, sorted by absolute delta * sqrt(n). */
export function computeInsights(rows: JoinedDay[], max = 3): Insight[] {
  const defs: Array<{
    key: InsightKey;
    conditionKey: Insight["conditionKey"];
    metricKey: Insight["metricKey"];
    condition: (d: JoinedDay) => boolean;
    metric: (d: JoinedDay) => number | null;
  }> = [
    {
      key: "sleep_lt_7h_vs_energy",
      conditionKey: "sleepLt7h",
      metricKey: "energy",
      condition: (d) => d.sleepDurationHours !== null && d.sleepDurationHours < 7,
      metric: (d) => d.energy,
    },
    {
      key: "sleep_lt_7h_vs_mood",
      conditionKey: "sleepLt7h",
      metricKey: "mood",
      condition: (d) => d.sleepDurationHours !== null && d.sleepDurationHours < 7,
      metric: (d) => d.moodValence,
    },
    {
      key: "steps_gt_8k_vs_mood",
      conditionKey: "stepsGt8k",
      metricKey: "mood",
      condition: (d) => d.steps !== null && d.steps >= 8000,
      metric: (d) => d.moodValence,
    },
    {
      key: "high_caffeine_vs_stress",
      conditionKey: "highCaffeine",
      metricKey: "stress",
      condition: (d) => d.caffeineMg !== null && d.caffeineMg >= 300,
      metric: (d) => d.stress,
    },
    {
      key: "workout_day_vs_energy",
      conditionKey: "workoutDay",
      metricKey: "energy",
      condition: (d) => d.workoutMinutes !== null && d.workoutMinutes >= 15,
      metric: (d) => d.energy,
    },
    {
      key: "high_stress_vs_sleep_quality",
      conditionKey: "highStress",
      metricKey: "sleepQuality",
      condition: (d) => d.stress !== null && d.stress >= 7,
      metric: (d) => d.sleepQuality,
    },
    {
      key: "low_hrv_vs_energy",
      conditionKey: "lowHrv",
      metricKey: "energy",
      condition: (d) => {
        if (d.hrv === null) return false;
        // "low HRV" = lower than the personal median for the window.
        const hrvs = rows.map((r) => r.hrv).filter((v): v is number => v !== null);
        if (hrvs.length < 5) return false;
        const sorted = [...hrvs].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return d.hrv < median;
      },
      metric: (d) => d.energy,
    },
  ];

  const candidates: Insight[] = [];
  for (const def of defs) {
    const stats = conditionalMean(rows, def.condition, def.metric);
    if (
      stats.match < 3 ||
      stats.unmatched < 3 ||
      stats.deltaPct === null ||
      !Number.isFinite(stats.deltaPct)
    ) {
      continue;
    }
    if (Math.abs(stats.deltaPct) < 0.05) continue;
    candidates.push({
      key: def.key,
      conditionKey: def.conditionKey,
      metricKey: def.metricKey,
      stats,
      direction: stats.deltaPct > 0 ? "higher" : "lower",
    });
  }

  candidates.sort((a, b) => {
    const aScore = Math.abs(a.stats.deltaPct ?? 0) * Math.sqrt(a.stats.n);
    const bScore = Math.abs(b.stats.deltaPct ?? 0) * Math.sqrt(b.stats.n);
    return bScore - aScore;
  });

  return candidates.slice(0, max);
}
