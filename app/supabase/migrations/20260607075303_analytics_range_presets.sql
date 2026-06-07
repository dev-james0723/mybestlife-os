CREATE TABLE IF NOT EXISTS public.analytics_range_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT analytics_range_presets_name_not_blank CHECK (char_length(btrim(name)) > 0),
  CONSTRAINT analytics_range_presets_name_length CHECK (char_length(btrim(name)) <= 48),
  CONSTRAINT analytics_range_presets_valid_dates CHECK (start_date <= end_date),
  CONSTRAINT analytics_range_presets_max_span CHECK ((end_date - start_date) <= 3652)
);

CREATE INDEX IF NOT EXISTS analytics_range_presets_user_order_idx
  ON public.analytics_range_presets(user_id, sort_order, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_range_presets_user_name_unique_idx
  ON public.analytics_range_presets(user_id, lower(btrim(name)));

ALTER TABLE public.analytics_range_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own analytics range presets" ON public.analytics_range_presets;
DROP POLICY IF EXISTS "Users insert own analytics range presets" ON public.analytics_range_presets;
DROP POLICY IF EXISTS "Users update own analytics range presets" ON public.analytics_range_presets;
DROP POLICY IF EXISTS "Users delete own analytics range presets" ON public.analytics_range_presets;

CREATE POLICY "Users view own analytics range presets"
  ON public.analytics_range_presets FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users insert own analytics range presets"
  ON public.analytics_range_presets FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users update own analytics range presets"
  ON public.analytics_range_presets FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users delete own analytics range presets"
  ON public.analytics_range_presets FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
