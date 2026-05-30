-- Explorer Console — the Travel workspace inside Bucket List.
--
-- Adds five additive, RLS-scoped tables. `bucket_items` ALREADY carries
-- destination_lat/lng/city/country, so no change is made there — a Travel
-- view can correspond to an existing bucket_item (soft FK) OR a free-form
-- city the user searches here (standalone travel_destination).
--
--   * travel_destinations    — one row per remembered city (the "fast on
--                              return" cache record: landing params +
--                              discovered place_ids + last_fetched_at).
--   * travel_saved_places    — the user's saved POIs for a destination,
--                              keyed by provider place_id + USER metadata.
--   * travel_itinerary_days  — Wanderlog-style day buckets.
--   * travel_itinerary_items — places assigned to a day (+ travel time).
--   * travel_places_usage    — per-user daily request ledger (cost cap),
--                              mirroring the proven bucket_ai_usage pattern.
--
-- COMPLIANCE (written into the schema on purpose):
--   Google Places CONTENT (photos, ratings, reviews, hours, price) may NOT
--   be persisted long-term. Only the `place_id` is persistable indefinitely.
--   Therefore display_name/lat/lng snapshots below are a render SHELL only:
--     - For provider='google' rows they are short-cache and may be cleared.
--     - For provider='osm' rows (OpenStreetMap, ODbL) they MAY persist with
--       attribution.
--   Live content is always re-fetched by place_id at display time.
--
-- All auth.users FKs use ON DELETE CASCADE. Links to bucket_items / tasks /
-- daily-plan are SOFT (plain UUIDs, no FK clause) so cross-module renames
-- never break this migration — matching the bucket_list convention.
--
-- Idempotent + self-sufficient: safe to run more than once, and re-defines
-- public.touch_updated_at() so it does not depend on migration order.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- travel_destinations  (the "remembered city" cache record)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  slug TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  native_name TEXT,
  country TEXT,
  country_code TEXT CHECK (country_code IS NULL OR country_code ~ '^[A-Za-z]{2}$'),

  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  bbox JSONB,                       -- { minLat, minLng, maxLat, maxLng }

  landing_params JSONB,             -- { center:{lat,lng,altitude}, tilt, range, heading }

  provider TEXT NOT NULL DEFAULT 'mock' CHECK (
    provider IN ('google', 'osm', 'mock', 'manual')
  ),
  discovered_place_ids TEXT[] NOT NULL DEFAULT '{}',
  last_fetched_at TIMESTAMPTZ,

  bucket_item_id UUID,              -- optional soft FK to bucket_items

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_travel_destinations_user_updated
  ON public.travel_destinations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_destinations_user_bucket
  ON public.travel_destinations (user_id, bucket_item_id);

ALTER TABLE public.travel_destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own travel_destinations" ON public.travel_destinations;
CREATE POLICY "Users manage own travel_destinations"
  ON public.travel_destinations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- travel_saved_places  (user's POIs; place_id + user metadata only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  destination_id UUID NOT NULL
    REFERENCES public.travel_destinations(id) ON DELETE CASCADE,
  bucket_item_id UUID,              -- optional soft FK to a dream

  provider TEXT NOT NULL DEFAULT 'google' CHECK (
    provider IN ('google', 'osm', 'mock', 'manual')
  ),
  place_id TEXT NOT NULL,

  -- Render shell ONLY (short-cache for google; ODbL-persistable for osm)
  display_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  category TEXT,

  -- USER-generated metadata (this is what we truly own + persist)
  user_note TEXT,
  color_group TEXT,
  progress TEXT NOT NULL DEFAULT 'want' CHECK (
    progress IN ('want', 'planned', 'visited')
  ),
  position INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT true,

  linked_task_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, destination_id, provider, place_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_saved_places_user_dest
  ON public.travel_saved_places (user_id, destination_id, position);
CREATE INDEX IF NOT EXISTS idx_travel_saved_places_user_bucket
  ON public.travel_saved_places (user_id, bucket_item_id);

ALTER TABLE public.travel_saved_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own travel_saved_places" ON public.travel_saved_places;
CREATE POLICY "Users manage own travel_saved_places"
  ON public.travel_saved_places FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- travel_itinerary_days  (Wanderlog day buckets)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  destination_id UUID NOT NULL
    REFERENCES public.travel_destinations(id) ON DELETE CASCADE,

  day_index INTEGER NOT NULL CHECK (day_index >= 0),
  date DATE,
  title TEXT,
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (destination_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_travel_itinerary_days_user_dest
  ON public.travel_itinerary_days (user_id, destination_id, position);

ALTER TABLE public.travel_itinerary_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own travel_itinerary_days" ON public.travel_itinerary_days;
CREATE POLICY "Users manage own travel_itinerary_days"
  ON public.travel_itinerary_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- travel_itinerary_items  (places assigned to a day)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  day_id UUID NOT NULL
    REFERENCES public.travel_itinerary_days(id) ON DELETE CASCADE,
  saved_place_id UUID
    REFERENCES public.travel_saved_places(id) ON DELETE SET NULL,

  position INTEGER NOT NULL DEFAULT 0,
  start_time TIME,
  notes TEXT,
  travel_minutes_to_next INTEGER,   -- distance/time between stops

  linked_daily_plan_block_id UUID,  -- relation seam → Daily Plan
  linked_task_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_itinerary_items_user_day
  ON public.travel_itinerary_items (user_id, day_id, position);

ALTER TABLE public.travel_itinerary_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own travel_itinerary_items" ON public.travel_itinerary_items;
CREATE POLICY "Users manage own travel_itinerary_items"
  ON public.travel_itinerary_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- travel_places_usage  (per-user daily request ledger / cost cap)
--   Mirrors bucket_ai_usage. Guards paid Places/Tiles calls AND free
--   OSM Overpass calls (fair-use). One row per (user, date, kind).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.travel_places_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  usage_date DATE NOT NULL DEFAULT current_date,
  kind TEXT NOT NULL CHECK (
    kind IN ('nearby', 'text', 'autocomplete', 'details', 'photos',
             'tiles_session', 'osm_overpass')
  ),
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, usage_date, kind)
);

CREATE INDEX IF NOT EXISTS idx_travel_places_usage_user_date
  ON public.travel_places_usage (user_id, usage_date);

ALTER TABLE public.travel_places_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own travel_places_usage" ON public.travel_places_usage;
CREATE POLICY "Users manage own travel_places_usage"
  ON public.travel_places_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- updated_at triggers. The touch helper is (re)defined here so this
-- migration is self-sufficient and order-independent — identical to the
-- bucket_list definition, so CREATE OR REPLACE is a harmless no-op.
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS travel_destinations_touch_updated_at ON public.travel_destinations;
CREATE TRIGGER travel_destinations_touch_updated_at
  BEFORE UPDATE ON public.travel_destinations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS travel_saved_places_touch_updated_at ON public.travel_saved_places;
CREATE TRIGGER travel_saved_places_touch_updated_at
  BEFORE UPDATE ON public.travel_saved_places
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS travel_itinerary_days_touch_updated_at ON public.travel_itinerary_days;
CREATE TRIGGER travel_itinerary_days_touch_updated_at
  BEFORE UPDATE ON public.travel_itinerary_days
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS travel_itinerary_items_touch_updated_at ON public.travel_itinerary_items;
CREATE TRIGGER travel_itinerary_items_touch_updated_at
  BEFORE UPDATE ON public.travel_itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS travel_places_usage_touch_updated_at ON public.travel_places_usage;
CREATE TRIGGER travel_places_usage_touch_updated_at
  BEFORE UPDATE ON public.travel_places_usage
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
