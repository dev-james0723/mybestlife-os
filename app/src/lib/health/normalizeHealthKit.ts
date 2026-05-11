/**
 * Normalizes HealthKit-shaped payloads into our internal `HealthMetricInsert`
 * rows. Used by:
 *   - The (future) Capacitor HealthKit bridge when it fetches samples
 *   - The `/api/health/ingest` endpoint that accepts Apple Shortcuts JSON
 *   - The `/api/health/import` endpoint that accepts CSV / Apple Health
 *     Export XML
 *
 * Pure functions only. No DB or network calls here.
 */

import type { HealthMetricInsert } from "@/lib/repositories/health-v2";
import type { HealthMetricType, Json } from "@/types/database";

// ---- Input shapes ---------------------------------------------------------

/**
 * A HealthKit quantity / category sample after CapacitorHealthkit serializes
 * it. Matches `@perfood/capacitor-healthkit` sample shape sufficiently for
 * the sample types we request.
 */
export type HealthKitSample = {
  /** The Apple sample identifier, e.g. "HKQuantityTypeIdentifierStepCount". */
  sampleType?: string;
  /** Friendly key if the caller already mapped it (e.g. "steps"). */
  type?: string;
  /** Numeric value. For categories like sleep stage, use `metadata.stage`. */
  value?: number;
  /** Unit string (count, kcal, bpm, ms, kg, %, min, hours, ml). */
  unit?: string;
  /** ISO timestamps. We use startDate as recorded_at. */
  startDate?: string;
  endDate?: string;
  /** Optional extras: workout type, sleep stage, etc. */
  metadata?: Record<string, unknown>;
};

/** Apple Shortcuts pushes this shape to `/api/health/ingest`. */
export type ShortcutPayload = {
  samples: HealthKitSample[];
  syncedAt?: string;
};

// ---- Mapping table --------------------------------------------------------

const SAMPLE_TYPE_MAP: Record<string, HealthMetricType> = {
  // Apple identifiers
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierHeartRate: "heart_rate",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierRestingHeartRate: "rhr",
  HKQuantityTypeIdentifierOxygenSaturation: "spo2",
  HKQuantityTypeIdentifierBodyMass: "weight",
  HKQuantityTypeIdentifierBodyFatPercentage: "body_fat",
  HKQuantityTypeIdentifierBodyMassIndex: "bmi",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active_energy",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep_duration",
  HKCategoryTypeIdentifierMindfulSession: "mindful_minutes",
  HKWorkoutTypeIdentifier: "workout_minutes",
  HKQuantityTypeIdentifierDietaryWater: "water_ml",
  HKQuantityTypeIdentifierDietaryCaffeine: "caffeine_mg",
  HKQuantityTypeIdentifierVO2Max: "vo2_max",
  // Friendly keys used by @perfood/capacitor-healthkit
  steps: "steps",
  "heart-rate": "heart_rate",
  "heart-rate-variability": "hrv",
  "resting-heart-rate": "rhr",
  "blood-oxygen": "spo2",
  weight: "weight",
  "active-energy": "active_energy",
  sleep: "sleep_duration",
  "mindful-session": "mindful_minutes",
  workouts: "workout_minutes",
};

const UNIT_DEFAULTS: Record<HealthMetricType, string> = {
  sleep_duration: "hours",
  sleep_deep: "hours",
  sleep_rem: "hours",
  sleep_light: "hours",
  sleep_awake: "hours",
  hrv: "ms",
  rhr: "bpm",
  heart_rate: "bpm",
  spo2: "%",
  vo2_max: "ml/kg/min",
  steps: "count",
  active_energy: "kcal",
  workout_minutes: "minutes",
  weight: "kg",
  body_fat: "%",
  bmi: "kg/m2",
  water_ml: "ml",
  caffeine_mg: "mg",
  alcohol_units: "units",
  mindful_minutes: "minutes",
  menstrual_flow: "level",
};

// ---- Normalization --------------------------------------------------------

export type NormalizeOptions = {
  source?: "apple_health" | "shortcut" | "import";
};

export function normalizeHealthKitSample(
  sample: HealthKitSample,
  options: NormalizeOptions = {},
): HealthMetricInsert | null {
  const rawType = sample.type ?? sample.sampleType ?? "";
  const metric = SAMPLE_TYPE_MAP[rawType];
  if (!metric) return null;

  // Sleep samples in HealthKit have duration encoded as `endDate - startDate`
  // seconds, and the `value` field is actually the stage (0=InBed, 1=Asleep,
  // 2=Awake, etc.). We convert to hours and preserve the stage in metadata.
  let value = sample.value;
  let unit = sample.unit ?? UNIT_DEFAULTS[metric];
  const metadata: Json | null = (sample.metadata as Json | undefined) ?? null;

  if (metric === "sleep_duration" && sample.startDate && sample.endDate) {
    const ms = Date.parse(sample.endDate) - Date.parse(sample.startDate);
    if (Number.isFinite(ms) && ms > 0) {
      value = ms / (1000 * 60 * 60);
      unit = "hours";
    }
  }

  if (metric === "workout_minutes" && sample.startDate && sample.endDate) {
    const ms = Date.parse(sample.endDate) - Date.parse(sample.startDate);
    if (Number.isFinite(ms) && ms > 0) {
      value = ms / (1000 * 60);
      unit = "minutes";
    }
  }

  if (metric === "mindful_minutes" && sample.startDate && sample.endDate) {
    const ms = Date.parse(sample.endDate) - Date.parse(sample.startDate);
    if (Number.isFinite(ms) && ms > 0) {
      value = ms / (1000 * 60);
      unit = "minutes";
    }
  }

  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!sample.startDate) return null;

  return {
    metric_type: metric,
    value,
    unit,
    recorded_at: sample.startDate,
    source: options.source ?? "apple_health",
    metadata,
  };
}

export function normalizeHealthKitSamples(
  samples: HealthKitSample[],
  options: NormalizeOptions = {},
): HealthMetricInsert[] {
  const out: HealthMetricInsert[] = [];
  for (const s of samples) {
    const row = normalizeHealthKitSample(s, options);
    if (row) out.push(row);
  }
  return out;
}
