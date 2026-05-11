import type { HealthMetric } from "@/types/database";

/**
 * Given a time-ordered list of metrics (ascending by recorded_at), group
 * into daily buckets (YYYY-MM-DD keyed by local date) and summarize per day.
 *
 * The summary depends on the metric type:
 *   - cumulative daily totals: steps, active_energy, water_ml, caffeine_mg,
 *     alcohol_units, workout_minutes, mindful_minutes
 *   - daily average: heart_rate, hrv, rhr, spo2
 *   - last-of-day: weight, body_fat, bmi
 *   - sum of windows: sleep_duration
 */
type Strategy = "sum" | "avg" | "last" | "first";

const STRATEGY: Record<string, Strategy> = {
  steps: "sum",
  active_energy: "sum",
  water_ml: "sum",
  caffeine_mg: "sum",
  alcohol_units: "sum",
  workout_minutes: "sum",
  mindful_minutes: "sum",
  sleep_duration: "sum",
  sleep_deep: "sum",
  sleep_rem: "sum",
  sleep_light: "sum",
  sleep_awake: "sum",
  heart_rate: "avg",
  hrv: "avg",
  rhr: "avg",
  spo2: "avg",
  vo2_max: "avg",
  weight: "last",
  body_fat: "last",
  bmi: "last",
  menstrual_flow: "last",
};

export type DailyBucket = {
  date: string; // YYYY-MM-DD (local)
  value: number;
  count: number;
  unit: string;
};

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function bucketByDay(metrics: HealthMetric[]): DailyBucket[] {
  if (metrics.length === 0) return [];
  const strategy = STRATEGY[metrics[0].metric_type] ?? "avg";
  const map = new Map<string, { sum: number; count: number; first: HealthMetric; last: HealthMetric; unit: string }>();
  for (const m of metrics) {
    const key = toLocalDateKey(m.recorded_at);
    const existing = map.get(key);
    if (existing) {
      existing.sum += m.value;
      existing.count += 1;
      existing.last = m;
    } else {
      map.set(key, { sum: m.value, count: 1, first: m, last: m, unit: m.unit });
    }
  }
  const keys = Array.from(map.keys()).sort();
  return keys.map((date) => {
    const b = map.get(date)!;
    let value: number;
    switch (strategy) {
      case "sum":
        value = b.sum;
        break;
      case "avg":
        value = b.sum / b.count;
        break;
      case "first":
        value = b.first.value;
        break;
      case "last":
      default:
        value = b.last.value;
        break;
    }
    return { date, value, count: b.count, unit: b.unit };
  });
}

export function baselineAvg(buckets: DailyBucket[], excludeLast = true): number | null {
  const series = excludeLast ? buckets.slice(0, -1) : buckets;
  if (series.length === 0) return null;
  return series.reduce((a, b) => a + b.value, 0) / series.length;
}

/**
 * Fill date gaps so a 14-day sparkline always has 14 points. Missing days
 * get value=null so the Sparkline renders a break in the line. (We rely
 * on the Sparkline's isFinite check.)
 */
export function fillDays(buckets: DailyBucket[], todayISO: string, days: number): Array<number> {
  const map = new Map(buckets.map((b) => [b.date, b.value]));
  const out: number[] = [];
  const today = new Date(todayISO);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDateKey(d.toISOString());
    const v = map.get(key);
    out.push(v ?? NaN);
  }
  return out;
}
