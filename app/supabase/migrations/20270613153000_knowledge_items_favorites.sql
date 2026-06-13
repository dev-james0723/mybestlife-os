-- Knowledge Base favorites.
-- Adds a persisted star toggle for knowledge cards and quick filtering.

ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS knowledge_items_user_favorite_idx
  ON public.knowledge_items (user_id, is_favorite)
  WHERE is_favorite;

COMMENT ON COLUMN public.knowledge_items.is_favorite IS
  'Whether the user has starred this knowledge item as a favorite.';
