-- Bucket List — the aspiration layer of My Best Life OS.
--
-- Adds six additive, RLS-scoped tables:
--
--   * bucket_items              — one row per dream (aspiration → execution)
--   * bucket_item_integrations  — polymorphic join (bucket ↔ any external entity)
--   * bucket_reflections        — photos, story + AI summary for completed dreams
--   * bucket_flight_quotes      — cached flight-watch snapshots (vendor-agnostic)
--   * bucket_ai_usage           — per-user daily quota table
--   * bucket_settings           — one-row-per-user preferences (origin airport,
--                                 display currency, seed-cleared flag, etc.)
--
-- All FKs to auth.users use ON DELETE CASCADE. Links to projects / savings
-- goals / notes / etc. are **soft** foreign keys (plain UUIDs, no FK clause)
-- so cross-module renames never break this migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- bucket_items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bucket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  -- Core dream content
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT,
  why_this_matters TEXT,

  -- Classification
  type TEXT NOT NULL CHECK (
    type IN ('travel', 'achievement', 'growth', 'relationship', 'purchase', 'lifestyle')
  ),
  status TEXT NOT NULL DEFAULT 'dreaming' CHECK (
    status IN (
      'dreaming', 'exploring', 'planning', 'active',
      'funded', 'scheduled', 'booked',
      'completed', 'paused', 'archived'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'someday')
  ),
  difficulty TEXT NOT NULL DEFAULT 'med' CHECK (
    difficulty IN ('easy', 'med', 'hard', 'epic')
  ),
  time_horizon TEXT CHECK (
    time_horizon IS NULL
    OR time_horizon IN ('this_year', '1_3_years', '3_5_years', 'lifetime')
  ),

  -- Budgeting (cost in the user's display currency; Finance integration handles FX)
  estimated_cost NUMERIC(12, 2),
  cost_currency TEXT DEFAULT 'USD' CHECK (cost_currency ~ '^[A-Z]{3}$'),
  cost_band TEXT CHECK (
    cost_band IS NULL OR cost_band IN ('$', '$$', '$$$', '$$$$')
  ),

  -- Timing
  target_date DATE,
  target_month TEXT CHECK (target_month IS NULL OR target_month ~ '^[0-9]{4}-[0-9]{2}$'),

  -- Presentation
  category_tags TEXT[] NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  quote_inspiration TEXT,
  inspiration_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,

  -- Travel-specific (all nullable for non-travel dreams)
  destination_name TEXT,
  destination_country TEXT,
  destination_city TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  origin_location TEXT,
  origin_airport TEXT,            -- IATA 3-letter
  destination_airport TEXT,       -- IATA 3-letter
  best_season TEXT,
  travel_budget_level TEXT CHECK (
    travel_budget_level IS NULL
    OR travel_budget_level IN ('budget', 'mid', 'premium', 'luxury')
  ),
  travel_style TEXT CHECK (
    travel_style IS NULL
    OR travel_style IN ('solo', 'couple', 'family', 'friends', 'workation')
  ),
  trip_length_days INTEGER CHECK (trip_length_days IS NULL OR trip_length_days BETWEEN 1 AND 365),

  -- Flight watch settings
  exploratory_price_min NUMERIC(10, 2),
  exploratory_price_max NUMERIC(10, 2),
  latest_live_price NUMERIC(10, 2),
  latest_live_price_currency TEXT,
  last_price_check_time TIMESTAMPTZ,
  flight_watch_enabled BOOLEAN NOT NULL DEFAULT false,
  price_alert_rule JSONB,         -- { when: "below", amount: number, currency: string }

  -- AI-generated enrichment (Gemini)
  ai_destination_brief JSONB,     -- { overview, best_time, food[], stay[], transport[], must_do[], fetched_at }
  ai_trip_plan JSONB,             -- { days: [{ date, theme, morning, afternoon, evening }], fetched_at }
  ai_reframe_suggestions JSONB,   -- { smaller_versions: string[], fetched_at }

  -- Soft foreign keys — resolved app-side so cross-module renames never break this table.
  linked_project_id UUID,
  linked_budget_id UUID,
  linked_savings_goal_id UUID,
  linked_calendar_event_ids UUID[] NOT NULL DEFAULT '{}',
  linked_task_ids UUID[] NOT NULL DEFAULT '{}',
  linked_knowledge_resource_ids UUID[] NOT NULL DEFAULT '{}',
  linked_memory_entry_id UUID,

  -- Lifecycle
  is_seed BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bucket_items_user_created
  ON public.bucket_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bucket_items_user_status
  ON public.bucket_items (user_id, status);
CREATE INDEX IF NOT EXISTS idx_bucket_items_user_type
  ON public.bucket_items (user_id, type);
CREATE INDEX IF NOT EXISTS idx_bucket_items_user_featured
  ON public.bucket_items (user_id, is_featured) WHERE is_featured;
CREATE INDEX IF NOT EXISTS idx_bucket_items_user_target
  ON public.bucket_items (user_id, target_date);
CREATE INDEX IF NOT EXISTS idx_bucket_items_tags_gin
  ON public.bucket_items USING GIN (category_tags);
CREATE INDEX IF NOT EXISTS idx_bucket_items_travel_geo
  ON public.bucket_items (user_id, destination_lat, destination_lng)
  WHERE type = 'travel' AND destination_lat IS NOT NULL;

ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_items" ON public.bucket_items;
CREATE POLICY "Users manage own bucket_items"
  ON public.bucket_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- bucket_item_integrations
-- ============================================================
-- Polymorphic join — lets a bucket item link to "any" entity without needing a
-- dedicated column per module. The soft FK pattern keeps us decoupled from
-- cross-module table renames.

CREATE TABLE IF NOT EXISTS public.bucket_item_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  bucket_item_id UUID NOT NULL REFERENCES public.bucket_items(id) ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK (
    kind IN (
      'project', 'task', 'budget', 'savings_goal',
      'calendar_event', 'note', 'knowledge_entry', 'journal_entry',
      'resource_link', 'map_marker'
    )
  ),
  external_id UUID,              -- when `kind` points to a row in another table
  external_label TEXT,           -- display label (denormalised for fast render)
  external_url TEXT,             -- for free-form resource links
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bucket_item_integrations_uniq
    UNIQUE (bucket_item_id, kind, external_id, external_url)
);

CREATE INDEX IF NOT EXISTS idx_bucket_integrations_bucket
  ON public.bucket_item_integrations (bucket_item_id, kind);
CREATE INDEX IF NOT EXISTS idx_bucket_integrations_user_kind
  ON public.bucket_item_integrations (user_id, kind);

ALTER TABLE public.bucket_item_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_item_integrations"
  ON public.bucket_item_integrations;
CREATE POLICY "Users manage own bucket_item_integrations"
  ON public.bucket_item_integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- bucket_reflections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bucket_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  bucket_item_id UUID NOT NULL REFERENCES public.bucket_items(id) ON DELETE CASCADE,

  reflection_text TEXT,
  ai_summary TEXT,               -- short evocative recap
  photo_gallery JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ url, caption, taken_at }]
  mood TEXT CHECK (
    mood IS NULL
    OR mood IN ('elated', 'proud', 'grateful', 'peaceful', 'bittersweet', 'surprised', 'changed')
  ),
  reflected_on TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bucket_reflections_bucket
  ON public.bucket_reflections (bucket_item_id, reflected_on DESC);

ALTER TABLE public.bucket_reflections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_reflections" ON public.bucket_reflections;
CREATE POLICY "Users manage own bucket_reflections"
  ON public.bucket_reflections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- bucket_flight_quotes
-- ============================================================
-- Vendor-agnostic cache of flight-watch responses. The provider adapter writes
-- a row here each time it refreshes a bucket item's flight data.

CREATE TABLE IF NOT EXISTS public.bucket_flight_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  bucket_item_id UUID NOT NULL REFERENCES public.bucket_items(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (
    provider IN ('mock', 'skyscanner', 'kiwi', 'duffel', 'amadeus', 'custom')
  ),
  mode TEXT NOT NULL CHECK (mode IN ('exploratory', 'live')),
  origin_airport TEXT NOT NULL,
  destination_airport TEXT NOT NULL,
  depart_date TEXT,                -- exact date (YYYY-MM-DD) or month (YYYY-MM)
  return_date TEXT,
  currency TEXT NOT NULL,
  cheapest_price NUMERIC(10, 2),
  fastest_price NUMERIC(10, 2),
  direct_price NUMERIC(10, 2),
  raw_payload JSONB,               -- provider response snapshot (debugging)
  cheapest_deeplink TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bucket_flight_quotes_item
  ON public.bucket_flight_quotes (bucket_item_id, fetched_at DESC);

ALTER TABLE public.bucket_flight_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_flight_quotes"
  ON public.bucket_flight_quotes;
CREATE POLICY "Users manage own bucket_flight_quotes"
  ON public.bucket_flight_quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- bucket_ai_usage
-- ============================================================
-- Per-user daily quota for Gemini-backed calls. Mirrors `quote_ai_usage`.

CREATE TABLE IF NOT EXISTS public.bucket_ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  usage_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'smart_tag', 'inspire', 'destination_brief', 'trip_plan',
      'reframe', 'reflection_summary'
    )
  ),
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, usage_date, kind)
);

ALTER TABLE public.bucket_ai_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_ai_usage" ON public.bucket_ai_usage;
CREATE POLICY "Users manage own bucket_ai_usage"
  ON public.bucket_ai_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- bucket_settings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bucket_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  default_origin_location TEXT,
  default_origin_airport TEXT,
  default_currency TEXT DEFAULT 'USD' CHECK (default_currency ~ '^[A-Z]{3}$'),
  preferred_flight_provider TEXT DEFAULT 'mock' CHECK (
    preferred_flight_provider IN ('mock', 'skyscanner', 'kiwi', 'duffel', 'amadeus', 'custom')
  ),
  seeds_cleared BOOLEAN NOT NULL DEFAULT false,
  show_closed_dreams BOOLEAN NOT NULL DEFAULT true,
  travel_map_center_lat DOUBLE PRECISION DEFAULT 30.0,
  travel_map_center_lng DOUBLE PRECISION DEFAULT 10.0,
  travel_map_zoom INTEGER DEFAULT 2 CHECK (travel_map_zoom BETWEEN 1 AND 10),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bucket_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bucket_settings" ON public.bucket_settings;
CREATE POLICY "Users manage own bucket_settings"
  ON public.bucket_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- updated_at triggers (lightweight, no extension required)
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bucket_items_touch_updated_at ON public.bucket_items;
CREATE TRIGGER bucket_items_touch_updated_at
  BEFORE UPDATE ON public.bucket_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS bucket_reflections_touch_updated_at ON public.bucket_reflections;
CREATE TRIGGER bucket_reflections_touch_updated_at
  BEFORE UPDATE ON public.bucket_reflections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS bucket_settings_touch_updated_at ON public.bucket_settings;
CREATE TRIGGER bucket_settings_touch_updated_at
  BEFORE UPDATE ON public.bucket_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
