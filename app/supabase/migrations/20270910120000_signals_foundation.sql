-- Signals — the daily awareness layer of My Best Life OS.
--
-- This migration lays the persistence FOUNDATION for Signals. The MVP runs
-- entirely on localStorage + an on-demand fetch (see
-- `src/lib/signals/preferences-store.ts` and `src/lib/signals/client-fetch.ts`),
-- so nothing here is required yet — but the schema is real and RLS-correct so
-- the hooks can be pointed at Supabase without a data-model rewrite.
--
-- Two table families:
--   * Per-user, RLS-scoped to auth.uid():
--       user_signal_prefs      — 1 row/user (mirrors SignalsPreferences)
--       user_daily_signals     — daily ranked snapshot (v2 cron output)
--       user_signal_actions    — save/dismiss/more/less feedback log (v2 memory)
--       signal_followups       — "track this story" list (v2)
--   * Global, source-grounded caches (read-only to clients; written by the
--     service role / daily job — NEVER by the browser):
--       signal_sources         — curated source-quality registry
--       signal_items           — normalized, deduped candidate pool
--       signal_summaries       — cached AI summaries (source-grounded only)
--
-- Source-grounding rule (§15): a signal row cannot exist without source_url +
-- published_at. AI is never used to rank (deterministic scoring is client-side).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- user_signal_prefs  (per-user, 1 row)  — migration target for localStorage
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_signal_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  purposes TEXT[] NOT NULL DEFAULT '{}',
  followed_topics TEXT[] NOT NULL DEFAULT '{}',
  hidden_topics TEXT[] NOT NULL DEFAULT '{}',
  preferred_sources TEXT[] NOT NULL DEFAULT '{}',
  muted_sources TEXT[] NOT NULL DEFAULT '{}',

  feed_intensity TEXT NOT NULL DEFAULT 'light' CHECK (
    feed_intensity IN ('top3', 'light', 'balanced', 'deep')
  ),
  tone TEXT NOT NULL DEFAULT 'calm' CHECK (
    tone IN (
      'calm', 'executive', 'analytical', 'local-first',
      'global-first', 'career-focused', 'learning-focused'
    )
  ),

  -- Granular Life OS data-consent toggles (privacy-safe: all OFF by default).
  use_brain_context BOOLEAN NOT NULL DEFAULT false,
  use_projects BOOLEAN NOT NULL DEFAULT false,
  use_calendar BOOLEAN NOT NULL DEFAULT false,
  use_tasks BOOLEAN NOT NULL DEFAULT false,
  use_location BOOLEAN NOT NULL DEFAULT false,
  use_reading_behavior BOOLEAN NOT NULL DEFAULT false,

  -- { city, region, country, countryCode, latitude, longitude, precision }
  local_location JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_signal_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_signal_prefs" ON public.user_signal_prefs;
CREATE POLICY "Users manage own user_signal_prefs"
  ON public.user_signal_prefs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- signal_sources  (global curated registry — read-only to clients)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT UNIQUE,
  quality_tier TEXT NOT NULL DEFAULT 'unknown' CHECK (
    quality_tier IN ('high', 'medium', 'unknown')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_sources ENABLE ROW LEVEL SECURITY;
-- Authenticated users may READ the registry; only the service role writes it.
DROP POLICY IF EXISTS "Authenticated read signal_sources" ON public.signal_sources;
CREATE POLICY "Authenticated read signal_sources"
  ON public.signal_sources FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- signal_items  (global normalized + deduped candidate pool, read-only)
-- ============================================================
-- `id` is the deterministic hash of the canonical URL (see normalize.ts) so the
-- same article from the same URL is one row. Source-grounding enforced via NOT
-- NULL source_url + published_at.

CREATE TABLE IF NOT EXISTS public.signal_items (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  domain TEXT,
  quality_tier TEXT NOT NULL DEFAULT 'unknown' CHECK (
    quality_tier IN ('high', 'medium', 'unknown')
  ),
  published_at TIMESTAMPTZ NOT NULL,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  topic TEXT NOT NULL DEFAULT 'World affairs',
  region TEXT,
  content_type TEXT NOT NULL DEFAULT 'analysis' CHECK (
    content_type IN (
      'breaking', 'developing', 'analysis', 'opinion', 'local', 'global', 'personal'
    )
  ),
  tags TEXT[] NOT NULL DEFAULT '{}',
  why_it_matters TEXT NOT NULL DEFAULT '',
  corroboration_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_items_published
  ON public.signal_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_items_topic
  ON public.signal_items (topic, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_items_region
  ON public.signal_items (region) WHERE region IS NOT NULL;

ALTER TABLE public.signal_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read signal_items" ON public.signal_items;
CREATE POLICY "Authenticated read signal_items"
  ON public.signal_items FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- signal_summaries  (cached source-grounded AI summaries, read-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signal_summaries (
  signal_id TEXT PRIMARY KEY REFERENCES public.signal_items(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  model TEXT,
  -- True only when generated from real fetched source text (never headline-only).
  grounded BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read signal_summaries" ON public.signal_summaries;
CREATE POLICY "Authenticated read signal_summaries"
  ON public.signal_summaries FOR SELECT
  USING (auth.role() = 'authenticated');


-- ============================================================
-- user_daily_signals  (per-user daily ranked snapshot — v2 cron output)
-- ============================================================
-- Soft link to signal_items.id (TEXT) so a cache eviction never cascades a
-- user's history away. Score is stored as JSONB (the SignalScore breakdown).

CREATE TABLE IF NOT EXISTS public.user_daily_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  signal_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  section TEXT NOT NULL CHECK (section IN ('top3', 'world', 'local', 'personal')),
  signal_id TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  relevance_basis TEXT,
  why_relevant TEXT,
  score JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_daily_signals_uniq UNIQUE (user_id, signal_date, section, signal_id)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_signals_user_date
  ON public.user_daily_signals (user_id, signal_date DESC, section);

ALTER TABLE public.user_daily_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_daily_signals" ON public.user_daily_signals;
CREATE POLICY "Users manage own user_daily_signals"
  ON public.user_daily_signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- user_signal_actions  (per-user feedback log — v2 Signal Memory)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_signal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  signal_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN (
      'save', 'dismiss', 'more_like_this', 'less_like_this',
      'open', 'to_brain', 'mute_source', 'follow_topic'
    )
  ),
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_signal_actions_user
  ON public.user_signal_actions (user_id, created_at DESC);

ALTER TABLE public.user_signal_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_signal_actions" ON public.user_signal_actions;
CREATE POLICY "Users manage own user_signal_actions"
  ON public.user_signal_actions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- signal_followups  (per-user "track this story" — v2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signal_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  signal_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  source_url TEXT NOT NULL,
  topic TEXT,
  status TEXT NOT NULL DEFAULT 'watching' CHECK (
    status IN ('watching', 'done', 'dismissed')
  ),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_followups_user_status
  ON public.signal_followups (user_id, status, updated_at DESC);

ALTER TABLE public.signal_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own signal_followups" ON public.signal_followups;
CREATE POLICY "Users manage own signal_followups"
  ON public.signal_followups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- updated_at triggers (reuse the shared helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_signal_prefs_touch_updated_at ON public.user_signal_prefs;
CREATE TRIGGER user_signal_prefs_touch_updated_at
  BEFORE UPDATE ON public.user_signal_prefs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS signal_followups_touch_updated_at ON public.signal_followups;
CREATE TRIGGER signal_followups_touch_updated_at
  BEFORE UPDATE ON public.signal_followups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
