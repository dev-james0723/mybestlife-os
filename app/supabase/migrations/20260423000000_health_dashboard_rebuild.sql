-- Health Dashboard Rebuild
-- New schema for the four-pillar subjective + objective health dashboard.
-- Adds three tables (health_daily_logs, health_metrics, health_goals), RLS,
-- indexes, and an idempotent backfill from the legacy 1-5 scale tables
-- (sleep_logs, exercise_logs, daily_check_ins) to the new 1-10 scale.
--
-- Legacy tables are preserved (not dropped) so the previous UI can continue
-- to work during the transition and so the backfill can be re-run safely.

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Subjective daily log (the four pillars + notes + triggers)
CREATE TABLE IF NOT EXISTS public.health_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  log_date DATE NOT NULL,
  sleep_quality SMALLINT CHECK (sleep_quality BETWEEN 1 AND 10),
  energy_level SMALLINT CHECK (energy_level BETWEEN 1 AND 10),
  mood_valence SMALLINT CHECK (mood_valence BETWEEN 1 AND 10),
  mood_arousal SMALLINT CHECK (mood_arousal BETWEEN 1 AND 10),
  stress_level SMALLINT CHECK (stress_level BETWEEN 1 AND 10),
  notes TEXT,
  triggers TEXT[] DEFAULT '{}',
  logged_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_health_daily_logs_user_date
  ON public.health_daily_logs(user_id, log_date DESC);

-- Objective metrics (HealthKit, manual, or derived)
-- One row per measurement; metric_type is a string union documented below.
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  metric_type TEXT NOT NULL,
  -- Known values (kept in sync with `HealthMetricType` in src/types/database.ts):
  --   sleep_duration | sleep_deep | sleep_rem | sleep_light | sleep_awake
  --   hrv | rhr | heart_rate | spo2 | vo2_max
  --   steps | active_energy | workout_minutes
  --   weight | body_fat | bmi
  --   water_ml | caffeine_mg | alcohol_units | mindful_minutes
  --   menstrual_flow
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('apple_health', 'manual', 'derived', 'shortcut', 'import')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_user_type_recorded
  ON public.health_metrics(user_id, metric_type, recorded_at DESC);

-- Dedupe guard so repeated HealthKit syncs or re-imports don't pile up
-- duplicate samples. Apple Health uses (type, startDate, endDate, value) as
-- its natural key; we collapse startDate+endDate into recorded_at and add
-- value to the tuple so overlapping windows with different values coexist.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_health_metrics_natural
  ON public.health_metrics(user_id, metric_type, recorded_at, value);

-- User-defined goals
CREATE TABLE IF NOT EXISTS public.health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  metric_type TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'daily'
    CHECK (period IN ('daily', 'weekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, metric_type, period)
);

-- ============================================================
-- 2. UPDATED_AT TRIGGERS
-- ============================================================

-- The codebase convention is to update `updated_at` from app-side inserts
-- via upsert, but we guard with a trigger as well for safety.
CREATE OR REPLACE FUNCTION public.set_health_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_health_daily_logs_updated_at ON public.health_daily_logs;
CREATE TRIGGER trg_health_daily_logs_updated_at
  BEFORE UPDATE ON public.health_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_health_updated_at();

DROP TRIGGER IF EXISTS trg_health_goals_updated_at ON public.health_goals;
CREATE TRIGGER trg_health_goals_updated_at
  BEFORE UPDATE ON public.health_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_health_updated_at();

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================
-- Matches the pattern applied at the bottom of schema.sql. Four policies
-- per table (SELECT / INSERT / UPDATE / DELETE) so UPDATE always has a
-- corresponding SELECT row visibility (Postgres RLS requires SELECT to
-- UPDATE, otherwise updates silently return 0 rows).

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['health_daily_logs', 'health_metrics', 'health_goals'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %1$s" ON public.%1$I', tbl);

    EXECUTE format(
      'CREATE POLICY "Users can view own %1$s" ON public.%1$I FOR SELECT USING (auth.uid() = user_id)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can insert own %1$s" ON public.%1$I FOR INSERT WITH CHECK (auth.uid() = user_id)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can update own %1$s" ON public.%1$I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Users can delete own %1$s" ON public.%1$I FOR DELETE USING (auth.uid() = user_id)',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- 4. BACKFILL FROM LEGACY TABLES
-- ============================================================
-- Idempotent: every insert uses ON CONFLICT DO NOTHING so the migration
-- can be re-run safely. Scale conversions:
--   sleep_logs.quality 1-5  -> health_daily_logs.sleep_quality 1-10 (*2)
--   daily_check_ins.mood 1-5 -> mood_valence 1-10 (*2)
--   daily_check_ins.energy 1-5 -> energy_level 1-10 (*2)
-- Rescaling loses a half-step of resolution. Notes carried over verbatim.

-- sleep_logs -> health_metrics (sleep_duration)
INSERT INTO public.health_metrics (user_id, metric_type, value, unit, recorded_at, source, metadata)
SELECT
  s.user_id,
  'sleep_duration',
  s.duration_hours,
  'hours',
  (s.log_date::timestamp AT TIME ZONE 'UTC'),
  'derived',
  jsonb_build_object(
    'legacy_table', 'sleep_logs',
    'legacy_id', s.id,
    'bed_time', s.bed_time,
    'wake_time', s.wake_time
  )
FROM public.sleep_logs s
WHERE s.duration_hours IS NOT NULL
ON CONFLICT (user_id, metric_type, recorded_at, value) DO NOTHING;

-- sleep_logs.quality -> health_daily_logs.sleep_quality (1-5 -> 1-10)
-- We only upsert the sleep_quality column; other pillars left untouched.
INSERT INTO public.health_daily_logs (user_id, log_date, sleep_quality, notes)
SELECT
  s.user_id,
  s.log_date,
  (s.quality * 2)::SMALLINT,
  s.notes
FROM public.sleep_logs s
WHERE s.quality IS NOT NULL
ON CONFLICT (user_id, log_date) DO UPDATE
  SET sleep_quality = EXCLUDED.sleep_quality
  WHERE public.health_daily_logs.sleep_quality IS NULL;

-- exercise_logs -> health_metrics (workout_minutes)
INSERT INTO public.health_metrics (user_id, metric_type, value, unit, recorded_at, source, metadata)
SELECT
  e.user_id,
  'workout_minutes',
  e.duration_minutes,
  'minutes',
  (e.log_date::timestamp AT TIME ZONE 'UTC'),
  'derived',
  jsonb_build_object(
    'legacy_table', 'exercise_logs',
    'legacy_id', e.id,
    'exercise_type', e.exercise_type,
    'intensity', e.intensity
  )
FROM public.exercise_logs e
WHERE e.duration_minutes IS NOT NULL
ON CONFLICT (user_id, metric_type, recorded_at, value) DO NOTHING;

-- daily_check_ins.mood -> mood_valence, daily_check_ins.energy -> energy_level
INSERT INTO public.health_daily_logs (user_id, log_date, mood_valence, energy_level, notes)
SELECT
  c.user_id,
  c.check_date,
  (c.mood * 2)::SMALLINT,
  (c.energy * 2)::SMALLINT,
  c.notes
FROM public.daily_check_ins c
WHERE c.mood IS NOT NULL OR c.energy IS NOT NULL
ON CONFLICT (user_id, log_date) DO UPDATE
  SET
    mood_valence = COALESCE(public.health_daily_logs.mood_valence, EXCLUDED.mood_valence),
    energy_level = COALESCE(public.health_daily_logs.energy_level, EXCLUDED.energy_level),
    notes = COALESCE(public.health_daily_logs.notes, EXCLUDED.notes);
