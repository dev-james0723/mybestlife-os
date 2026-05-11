import { createClient } from "@/lib/supabase/client";
import { ensureError } from "@/lib/utils/ensure-error";
import type {
  HealthDailyLog,
  HealthGoal,
  HealthGoalPeriod,
  HealthMetric,
  HealthMetricSource,
  HealthMetricType,
  Json,
} from "@/types/database";

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw ensureError(error, "Failed to resolve user");
  if (!data.user) {
    throw new Error("You must be signed in to save health data.");
  }
  return data.user.id;
}

// ============================================================
// health_daily_logs
// ============================================================

export type HealthDailyLogPatch = {
  log_date: string;
  sleep_quality?: number | null;
  energy_level?: number | null;
  mood_valence?: number | null;
  mood_arousal?: number | null;
  stress_level?: number | null;
  notes?: string | null;
  triggers?: string[] | null;
};

type HealthDailyLogUpsertFields = {
  log_date: string;
  sleep_quality?: number | null;
  energy_level?: number | null;
  mood_valence?: number | null;
  mood_arousal?: number | null;
  stress_level?: number | null;
  notes?: string | null;
  triggers?: string[] | null;
  logged_at: string;
};

type HealthDailyLogUpsertRow = HealthDailyLogUpsertFields & { user_id: string };

function toDailyLogUpsertRow(patch: HealthDailyLogPatch): HealthDailyLogUpsertFields {
  // Keep only the fields the caller set. Supabase upsert with sparse values
  // will NULL out any omitted column on conflict, so we first fetch the
  // existing row and merge. This function is the post-merge shape.
  return {
    log_date: patch.log_date,
    sleep_quality: patch.sleep_quality ?? null,
    energy_level: patch.energy_level ?? null,
    mood_valence: patch.mood_valence ?? null,
    mood_arousal: patch.mood_arousal ?? null,
    stress_level: patch.stress_level ?? null,
    notes: patch.notes ?? null,
    triggers: patch.triggers ?? [],
    logged_at: new Date().toISOString(),
  };
}

export const healthDailyLogsRepository = {
  async getByDate(date: string): Promise<HealthDailyLog | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_daily_logs")
      .select("*")
      .eq("log_date", date)
      .maybeSingle();
    if (error) throw ensureError(error, "Failed to load health daily log");
    return (data as HealthDailyLog) ?? null;
  },

  async getRange(fromDate: string, toDate: string): Promise<HealthDailyLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_daily_logs")
      .select("*")
      .gte("log_date", fromDate)
      .lte("log_date", toDate)
      .order("log_date", { ascending: true });
    if (error) throw ensureError(error, "Failed to load health daily logs");
    return (data ?? []) as HealthDailyLog[];
  },

  /**
   * Sparse upsert: fetches the current row for (user_id, log_date) and
   * merges the patch so omitted fields are preserved. This is important
   * because the PillarLogModal autosaves each field independently.
   */
  async upsert(patch: HealthDailyLogPatch): Promise<HealthDailyLog> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const existing = await healthDailyLogsRepository.getByDate(patch.log_date);
    const merged: HealthDailyLogUpsertRow = {
      user_id: userId,
      ...toDailyLogUpsertRow({
        log_date: patch.log_date,
        sleep_quality:
          patch.sleep_quality !== undefined
            ? patch.sleep_quality
            : (existing?.sleep_quality ?? null),
        energy_level:
          patch.energy_level !== undefined
            ? patch.energy_level
            : (existing?.energy_level ?? null),
        mood_valence:
          patch.mood_valence !== undefined
            ? patch.mood_valence
            : (existing?.mood_valence ?? null),
        mood_arousal:
          patch.mood_arousal !== undefined
            ? patch.mood_arousal
            : (existing?.mood_arousal ?? null),
        stress_level:
          patch.stress_level !== undefined
            ? patch.stress_level
            : (existing?.stress_level ?? null),
        notes: patch.notes !== undefined ? patch.notes : (existing?.notes ?? null),
        triggers:
          patch.triggers !== undefined ? patch.triggers : (existing?.triggers ?? []),
      }),
    };

    const { data, error } = await supabase
      .from("health_daily_logs")
      .upsert(merged, { onConflict: "user_id,log_date" })
      .select()
      .single();
    if (error) throw ensureError(error, "Failed to save health daily log");
    return data as HealthDailyLog;
  },
};

// ============================================================
// health_metrics
// ============================================================

export type HealthMetricInsert = {
  metric_type: HealthMetricType | string;
  value: number;
  unit: string;
  recorded_at: string;
  source?: HealthMetricSource;
  metadata?: Json | null;
};

export const healthMetricsRepository = {
  async getByTypeRange(
    metricType: HealthMetricType | string,
    fromISO: string,
    toISO: string,
  ): Promise<HealthMetric[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("metric_type", metricType)
      .gte("recorded_at", fromISO)
      .lte("recorded_at", toISO)
      .order("recorded_at", { ascending: true });
    if (error) throw ensureError(error, "Failed to load health metrics");
    return (data ?? []) as HealthMetric[];
  },

  async getLatest(
    metricType: HealthMetricType | string,
  ): Promise<HealthMetric | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_metrics")
      .select("*")
      .eq("metric_type", metricType)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw ensureError(error, "Failed to load latest health metric");
    return (data as HealthMetric) ?? null;
  },

  async create(input: HealthMetricInsert): Promise<HealthMetric> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("health_metrics")
      .insert({
        user_id: userId,
        metric_type: input.metric_type,
        value: input.value,
        unit: input.unit,
        recorded_at: input.recorded_at,
        source: input.source ?? "manual",
        metadata: input.metadata ?? null,
      })
      .select()
      .single();
    if (error) throw ensureError(error, "Failed to log health metric");
    return data as HealthMetric;
  },

  /**
   * Bulk insert (used by HealthKit sync and CSV import). The natural-key
   * unique index on (user_id, metric_type, recorded_at, value) will reject
   * duplicate rows; we swallow 23505 and return successful inserts only.
   */
  async createMany(inputs: HealthMetricInsert[]): Promise<HealthMetric[]> {
    if (inputs.length === 0) return [];
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const rows = inputs.map((i) => ({
      user_id: userId,
      metric_type: i.metric_type,
      value: i.value,
      unit: i.unit,
      recorded_at: i.recorded_at,
      source: i.source ?? "manual",
      metadata: i.metadata ?? null,
    }));
    const { data, error } = await supabase
      .from("health_metrics")
      .upsert(rows, {
        onConflict: "user_id,metric_type,recorded_at,value",
        ignoreDuplicates: true,
      })
      .select();
    if (error) throw ensureError(error, "Failed to sync health metrics");
    return (data ?? []) as HealthMetric[];
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("health_metrics").delete().eq("id", id);
    if (error) throw ensureError(error, "Failed to delete health metric");
  },
};

// ============================================================
// health_goals
// ============================================================

export type HealthGoalUpsert = {
  metric_type: HealthMetricType | string;
  target_value: number;
  unit: string;
  period?: HealthGoalPeriod;
};

export const healthGoalsRepository = {
  async getAll(): Promise<HealthGoal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("health_goals")
      .select("*")
      .order("metric_type", { ascending: true });
    if (error) throw ensureError(error, "Failed to load health goals");
    return (data ?? []) as HealthGoal[];
  },

  async upsert(input: HealthGoalUpsert): Promise<HealthGoal> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("health_goals")
      .upsert(
        {
          user_id: userId,
          metric_type: input.metric_type,
          target_value: input.target_value,
          unit: input.unit,
          period: input.period ?? "daily",
        },
        { onConflict: "user_id,metric_type,period" },
      )
      .select()
      .single();
    if (error) throw ensureError(error, "Failed to save health goal");
    return data as HealthGoal;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("health_goals").delete().eq("id", id);
    if (error) throw ensureError(error, "Failed to delete health goal");
  },
};
