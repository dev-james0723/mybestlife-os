-- Knowledge Base Tag Taxonomy (Phase 2 foundation)
--
-- Adds three NEW tables for an explicit, hierarchical, normalized tag
-- taxonomy:
--
--   * knowledge_tag_categories  - top-level domains (Technology, Music, …)
--   * knowledge_tags            - canonical tags with parent_id, aliases,
--                                  category_id, type, item_count
--   * knowledge_item_tags       - join: which canonical tags an item has
--                                  + AI confidence + source ('ai' | 'manual')
--
-- IMPORTANT — non-breaking:
--   The existing `knowledge_items.ai_tags` / `manual_tags` text-array
--   columns are NOT removed. The application currently reads them and
--   folds raw strings onto canonical tags at render time via
--   `lib/knowledge/tags`. Once a future migration backfills these tables
--   from the existing arrays, the application can switch to reading
--   from these tables directly (and eventually deprecate the columns).
--
-- All tables are scoped by user_id and protected by RLS so each user only
-- sees their own taxonomy. The `parent_id` and `category_id` columns are
-- self-/cross-table FKs so taxonomy rearrangement (admin tooling) is safe.

-- ── knowledge_tag_categories ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_tag_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  accent TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS knowledge_tag_categories_user_id_idx
  ON public.knowledge_tag_categories (user_id);

ALTER TABLE public.knowledge_tag_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge_tag_categories"
  ON public.knowledge_tag_categories FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_tag_categories"
  ON public.knowledge_tag_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_tag_categories"
  ON public.knowledge_tag_categories FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_tag_categories"
  ON public.knowledge_tag_categories FOR DELETE
  USING (auth.uid() = user_id);

-- ── knowledge_tags (canonical) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.knowledge_tags(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.knowledge_tag_categories(id) ON DELETE SET NULL,
  -- Aliases: every spelling variant ("ai-agents", "ai agent", "ai 代理")
  -- that should fold onto this canonical tag. Stored normalized at the
  -- application layer; matching uses the lib/knowledge/tags normalizer.
  aliases TEXT[] NOT NULL DEFAULT '{}',
  -- Semantic role (matches CanonicalTagType in the app):
  --   topic | entity | tool | concept | method
  type TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug),
  CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS knowledge_tags_user_id_idx
  ON public.knowledge_tags (user_id);
CREATE INDEX IF NOT EXISTS knowledge_tags_parent_id_idx
  ON public.knowledge_tags (parent_id);
CREATE INDEX IF NOT EXISTS knowledge_tags_category_id_idx
  ON public.knowledge_tags (category_id);
CREATE INDEX IF NOT EXISTS knowledge_tags_aliases_gin_idx
  ON public.knowledge_tags USING gin (aliases);

ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge_tags"
  ON public.knowledge_tags FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_tags"
  ON public.knowledge_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_tags"
  ON public.knowledge_tags FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_tags"
  ON public.knowledge_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ── knowledge_item_tags (join) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_item_tags (
  knowledge_item_id UUID NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.knowledge_tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  -- 0..1 confidence score from the matcher (1 for exact / alias / manual).
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL DEFAULT 'ai'
    CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (knowledge_item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS knowledge_item_tags_user_id_idx
  ON public.knowledge_item_tags (user_id);
CREATE INDEX IF NOT EXISTS knowledge_item_tags_tag_id_idx
  ON public.knowledge_item_tags (tag_id);

ALTER TABLE public.knowledge_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own knowledge_item_tags"
  ON public.knowledge_item_tags FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_item_tags"
  ON public.knowledge_item_tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_item_tags"
  ON public.knowledge_item_tags FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_item_tags"
  ON public.knowledge_item_tags FOR DELETE
  USING (auth.uid() = user_id);

-- ── updated_at triggers ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_knowledge_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS knowledge_tag_categories_set_updated_at
  ON public.knowledge_tag_categories;
CREATE TRIGGER knowledge_tag_categories_set_updated_at
  BEFORE UPDATE ON public.knowledge_tag_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_knowledge_tags_updated_at();

DROP TRIGGER IF EXISTS knowledge_tags_set_updated_at
  ON public.knowledge_tags;
CREATE TRIGGER knowledge_tags_set_updated_at
  BEFORE UPDATE ON public.knowledge_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_knowledge_tags_updated_at();
