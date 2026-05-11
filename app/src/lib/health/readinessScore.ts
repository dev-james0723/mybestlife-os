/**
 * Readiness score (0-100) — a simple weighted composite of what we have.
 *
 * Inputs are normalized to 0-100 and then weighted. Missing inputs drop
 * out of the weighted average (weights re-normalize), so a user with only
 * subjective data still gets a meaningful number.
 *
 * Weights mirror the common Oura/Whoop heuristic: sleep matters most,
 * HRV and RHR next, activity load last.
 *
 * This is deliberately simple and explainable, not a medical device.
 */

import type { HealthDailyLog, HealthMetric } from "@/types/database";

export type ReadinessBand = "excellent" | "good" | "fair" | "low";

export type ReadinessInputs = {
  today: HealthDailyLog | null;
  baseline14d: {
    sleepDurationHours: number | null;
    hrv: number | null;
    rhr: number | null;
  };
  latestMetrics: Partial<Record<"sleep_duration" | "hrv" | "rhr" | "steps", HealthMetric | null>>;
};

export type ReadinessComponent = {
  key: "sleep" | "hrv" | "rhr" | "energy" | "stress" | "activity";
  label: string;
  score: number | null; // 0-100 or null when missing
  weight: number;
};

export type ReadinessResult = {
  score: number | null;
  band: ReadinessBand | null;
  components: ReadinessComponent[];
};

// ---- Per-component scoring ------------------------------------------------

/** Sleep duration: 7.5-8.5h is ideal, below 6 or above 10 penalizes. */
function scoreSleepDuration(hours: number | null): number | null {
  if (hours === null || !Number.isFinite(hours)) return null;
  if (hours >= 7.5 && hours <= 8.5) return 100;
  if (hours >= 7 && hours < 7.5) return 90;
  if (hours > 8.5 && hours <= 9) return 90;
  if (hours >= 6.5 && hours < 7) return 75;
  if (hours > 9 && hours <= 9.5) return 75;
  if (hours >= 6 && hours < 6.5) return 60;
  if (hours > 9.5 && hours <= 10) return 60;
  if (hours < 6) return Math.max(0, 40 + (hours - 4) * 10);
  return Math.max(0, 40 + (11 - hours) * 10);
}

/** HRV: higher than 14d baseline = better. Score = 50 + (delta / baseline * 200). */
function scoreHrv(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline <= 0) return null;
  const pct = (current - baseline) / baseline;
  return Math.max(0, Math.min(100, 50 + pct * 200));
}

/** RHR: lower than baseline = better (inverted). */
function scoreRhr(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline <= 0) return null;
  const pct = (baseline - current) / baseline;
  return Math.max(0, Math.min(100, 50 + pct * 300));
}

/** Subjective 1-10 → 0-100 linear. */
function scoreSubjective(v: number | null): number | null {
  if (v === null) return null;
  return ((v - 1) / 9) * 100;
}

/** Inverted subjective (higher stress = lower score). */
function scoreInverted(v: number | null): number | null {
  if (v === null) return null;
  return ((10 - v) / 9) * 100;
}

/** Activity: today's steps vs a 10k target, capped at 100. */
function scoreActivity(steps: number | null): number | null {
  if (steps === null) return null;
  return Math.max(0, Math.min(100, (steps / 10000) * 100));
}

// ---- Main ---------------------------------------------------------------

const DEFAULT_WEIGHTS: Record<ReadinessComponent["key"], number> = {
  sleep: 0.3,
  hrv: 0.2,
  rhr: 0.15,
  energy: 0.15,
  stress: 0.15,
  activity: 0.05,
};

export function computeReadiness(
  inputs: ReadinessInputs,
  labels: Record<ReadinessComponent["key"], string>,
): ReadinessResult {
  const today = inputs.today;
  const baseline = inputs.baseline14d;
  const latest = inputs.latestMetrics;

  // Component scores (0-100 or null).
  const components: ReadinessComponent[] = [
    {
      key: "sleep",
      label: labels.sleep,
      score: scoreSleepDuration(latest.sleep_duration?.value ?? baseline.sleepDurationHours ?? null),
      weight: DEFAULT_WEIGHTS.sleep,
    },
    {
      key: "hrv",
      label: labels.hrv,
      score: scoreHrv(latest.hrv?.value ?? null, baseline.hrv),
      weight: DEFAULT_WEIGHTS.hrv,
    },
    {
      key: "rhr",
      label: labels.rhr,
      score: scoreRhr(latest.rhr?.value ?? null, baseline.rhr),
      weight: DEFAULT_WEIGHTS.rhr,
    },
    {
      key: "energy",
      label: labels.energy,
      score: scoreSubjective(today?.energy_level ?? null),
      weight: DEFAULT_WEIGHTS.energy,
    },
    {
      key: "stress",
      label: labels.stress,
      score: scoreInverted(today?.stress_level ?? null),
      weight: DEFAULT_WEIGHTS.stress,
    },
    {
      key: "activity",
      label: labels.activity,
      score: scoreActivity(latest.steps?.value ?? null),
      weight: DEFAULT_WEIGHTS.activity,
    },
  ];

  const available = components.filter((c) => c.score !== null);
  if (available.length === 0) return { score: null, band: null, components };

  const weightSum = available.reduce((a, c) => a + c.weight, 0);
  const weighted = available.reduce((a, c) => a + (c.score ?? 0) * c.weight, 0);
  const score = Math.round(weighted / weightSum);
  const band: ReadinessBand =
    score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "low";

  return { score, band, components };
}
