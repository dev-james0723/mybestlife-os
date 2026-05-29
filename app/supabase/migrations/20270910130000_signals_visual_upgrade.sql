-- Signals — visual + media + custom-topics upgrade (foundation, NOT yet applied).
--
-- Extends the Signals foundation (20270910120000) for the visual upgrade:
--   * signal_items       — thumbnail, AI overview, media/video/market columns
--   * user_signal_prefs  — view_mode, gallery, markets/video toggles
--   * user_custom_topics — NEW per-user table (RLS-scoped to auth.uid())
--
-- The MVP still runs on localStorage (see preferences-store.ts); this is the
-- clean migration target so the hooks can be pointed at Supabase with no
-- data-model rewrite. Hard rules preserved: a signal row still cannot exist
-- without source_url + published_at, thumbnails are stored with truthful
-- provenance (never a fabricated image), and AI never ranks.

-- ============================================================
-- signal_items — visual + media columns (all nullable; existing rows unaffected)
-- ============================================================

ALTER TABLE public.signal_items
  -- Lead image: { url?, alt?, source, attribution?, dominantColor?, isFallback }.
  -- `source = 'fallback'` marks a deterministic topic abstract (no real image).
  ADD COLUMN IF NOT EXISTS thumbnail JSONB,
  -- Source-grounded AI overview, cached SEPARATELY from the headline/summary.
  ADD COLUMN IF NOT EXISTS ai_overview TEXT,
  -- True only when ai_overview came from real fetched source text.
  ADD COLUMN IF NOT EXISTS ai_overview_grounded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'article' CHECK (
    media_type IN ('article', 'video', 'audio', 'market', 'alert')
  ),
  -- Video signals: real, resolvable watch URL + provider + channel + duration.
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_provider TEXT CHECK (
    video_provider IS NULL OR video_provider IN ('youtube', 'publisher', 'other')
  ),
  ADD COLUMN IF NOT EXISTS channel_name TEXT,
  ADD COLUMN IF NOT EXISTS duration TEXT,
  ADD COLUMN IF NOT EXISTS transcript_available BOOLEAN NOT NULL DEFAULT false,
  -- Market signals: tag + ticker (only when the source clearly names one).
  ADD COLUMN IF NOT EXISTS market_tag TEXT,
  ADD COLUMN IF NOT EXISTS ticker TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_items_media_type
  ON public.signal_items (media_type, published_at DESC);

-- ============================================================
-- user_signal_prefs — view mode + gallery + section toggles
-- ============================================================

ALTER TABLE public.user_signal_prefs
  ADD COLUMN IF NOT EXISTS view_mode TEXT NOT NULL DEFAULT 'editorial' CHECK (
    view_mode IN ('editorial', 'grid', 'table', 'compact', 'gallery')
  ),
  -- { enabled: boolean, speed: 'slow' | 'normal' | 'fast' }. OFF by default.
  ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '{"enabled": false, "speed": "slow"}'::jsonb,
  ADD COLUMN IF NOT EXISTS markets_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_enabled BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- user_custom_topics — per-user follows (RLS-scoped to auth.uid())
-- ============================================================
-- Mirrors CustomSignalTopic. Keywords/sources/rss_feeds drive matching, ranking,
-- and source queries; include_in_top3 makes a follow eligible for the Daily Top 3.

CREATE TABLE IF NOT EXISTS public.user_custom_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  sources TEXT[] NOT NULL DEFAULT '{}',
  rss_feeds TEXT[] NOT NULL DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  include_in_top3 BOOLEAN NOT NULL DEFAULT false,
  muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_custom_topics_user
  ON public.user_custom_topics (user_id, priority);

ALTER TABLE public.user_custom_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own user_custom_topics" ON public.user_custom_topics;
CREATE POLICY "Users manage own user_custom_topics"
  ON public.user_custom_topics FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_custom_topics_touch_updated_at ON public.user_custom_topics;
CREATE TRIGGER user_custom_topics_touch_updated_at
  BEFORE UPDATE ON public.user_custom_topics
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- signal_summaries — distinguish a grounded overview from a snippet fallback
-- ============================================================
-- (grounded already exists on signal_summaries; add the media columns parity on
--  cached items so the daily job can persist a thumbnail alongside a summary.)

-- TODO(v2 cron): when the daily Tier-A job lands, also extend user_daily_signals
-- section CHECK to include 'markets' and 'video' (currently top3/world/local/
-- personal). Left intentionally for the cron migration to avoid churning the
-- foundation constraint before the writer exists.
