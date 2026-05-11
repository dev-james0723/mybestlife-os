-- Quote Library — core tables + RLS (Phase 1 foundation).
--
-- Adds three tables that scope fully to `auth.uid()`:
--
--   * quotes                     — one row per saved quote. 16 spec fields plus
--                                  system bookkeeping (id, user_id, created_at,
--                                  updated_at, is_seed, source_intelligence
--                                  JSONB enrichment blob, last_surfaced_on).
--   * quote_collections          — named buckets. Multi-membership via join.
--   * quote_collection_items     — join table (quote ↔ collection).
--
-- Phase 3 (Smart Tagging / Source Intelligence) writes into columns already
-- present here — future migrations add pgvector + wisdom profile.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- quotes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  -- Core quote content (spec §1 fields 1–3)
  quote_text TEXT NOT NULL CHECK (char_length(quote_text) BETWEEN 1 AND 4000),
  source_author TEXT,
  source_context TEXT,         -- book / essay / speech / etc.

  -- Provenance (spec §1 fields 4–6)
  source_url TEXT,
  source_type TEXT CHECK (
    source_type IS NULL
    OR source_type IN (
      'book', 'article', 'speech', 'conversation',
      'movie', 'song', 'poem', 'personal', 'other'
    )
  ),
  source_module TEXT CHECK (
    source_module IS NULL
    OR source_module IN (
      'manual', 'mindclear', 'journal', 'dashboard',
      'goals', 'knowledge-base', 'ocr', 'import'
    )
  ),

  -- Classification (spec §1 fields 7–9) — populated by Smart Tagging in Phase 3
  category TEXT,               -- one of the 30 canonical categories; see lib/quote-library/categories
  tags TEXT[] NOT NULL DEFAULT '{}',
  emotion_tone TEXT CHECK (
    emotion_tone IS NULL
    OR emotion_tone IN (
      'uplifting', 'contemplative', 'challenging', 'grounding',
      'bittersweet', 'playful', 'fierce', 'tender', 'curious', 'resolute'
    )
  ),

  -- Personalization (spec §1 fields 10–12)
  personal_note TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  linked_goal_id UUID,         -- soft FK — resolved app-side so we don't break
                               -- if the goals table lives under a different name

  -- Display / localization (spec §1 fields 13–14)
  language TEXT NOT NULL DEFAULT 'en' CHECK (char_length(language) BETWEEN 2 AND 10),
  confidence_score NUMERIC(3, 2) CHECK (
    confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
  ),

  -- AI enrichment (spec §1 fields 15–16)
  is_ai_enriched BOOLEAN NOT NULL DEFAULT false,
  source_intelligence JSONB,   -- { author_bio, historical_context,
                               --   related_quotes[], confidence, fetched_at,
                               --   unverified: bool }

  -- System bookkeeping
  is_seed BOOLEAN NOT NULL DEFAULT false,
  last_surfaced_on DATE,       -- Phase 3 Quote-of-the-Day tracker
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes that the UI actually uses.
CREATE INDEX IF NOT EXISTS idx_quotes_user_created
  ON public.quotes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_user_favorite
  ON public.quotes (user_id, is_favorite)
  WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_quotes_user_category
  ON public.quotes (user_id, category);
CREATE INDEX IF NOT EXISTS idx_quotes_user_linked_goal
  ON public.quotes (user_id, linked_goal_id)
  WHERE linked_goal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_user_seed
  ON public.quotes (user_id, is_seed)
  WHERE is_seed = true;
CREATE INDEX IF NOT EXISTS idx_quotes_tags_gin
  ON public.quotes USING GIN (tags);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quotes" ON public.quotes;
CREATE POLICY "Users manage own quotes"
  ON public.quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- quote_collections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quote_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT,
  color TEXT,                  -- optional accent token, app-level validated
  icon TEXT,                   -- optional lucide icon name

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT quote_collections_user_name_key UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_quote_collections_user
  ON public.quote_collections (user_id, created_at DESC);

ALTER TABLE public.quote_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quote_collections" ON public.quote_collections;
CREATE POLICY "Users manage own quote_collections"
  ON public.quote_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- quote_collection_items (join)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quote_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  collection_id UUID NOT NULL REFERENCES public.quote_collections(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT quote_collection_items_unique
    UNIQUE (collection_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_collection_items_collection
  ON public.quote_collection_items (collection_id);
CREATE INDEX IF NOT EXISTS idx_quote_collection_items_quote
  ON public.quote_collection_items (quote_id);

ALTER TABLE public.quote_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own quote_collection_items"
  ON public.quote_collection_items;
CREATE POLICY "Users manage own quote_collection_items"
  ON public.quote_collection_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- updated_at auto-touch trigger (reusable if not already defined)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON public.quotes;
CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_quote_collections_updated_at ON public.quote_collections;
CREATE TRIGGER trg_quote_collections_updated_at
  BEFORE UPDATE ON public.quote_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();
