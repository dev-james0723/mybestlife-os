-- Resources → Assets expansion
--
-- Adds the fields required to support the Assets sub-tab redesign:
--   - is_favorite         → parity with Documents "Favorites" filter (Phase 3)
--   - current_value       → mark-to-market value, distinct from purchase `value`
--   - serial_number       → free-text identifier (vehicles, electronics)
--   - document_id         → optional FK into public.documents (linked paperwork)
--   - category_key        → constrained enum, replacing the legacy free-text
--                           `category` column for new writes. Existing rows
--                           keep their free-text `category` so historical data
--                           is never destroyed; app code will prefer
--                           `category_key` going forward and fall back to the
--                           legacy value when null.
--
-- This migration is idempotent (IF NOT EXISTS / DO blocks) so it can be
-- re-run safely against environments where a partial rollout already
-- applied some of these columns.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS is_favorite   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_value NUMERIC,
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS document_id   UUID,
  ADD COLUMN IF NOT EXISTS category_key  TEXT;

-- FK → documents. Done via DO block so re-runs don't error on duplicate
-- constraint names.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assets_document_id_fkey'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_document_id_fkey
      FOREIGN KEY (document_id)
      REFERENCES public.documents(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Constrained enum for category_key. Same idempotency pattern.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assets_category_key_chk'
  ) THEN
    ALTER TABLE public.assets
      ADD CONSTRAINT assets_category_key_chk
      CHECK (
        category_key IS NULL
        OR category_key IN (
          'real_estate',
          'vehicle',
          'electronics',
          'musical_instrument',
          'investment',
          'other'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS assets_user_favorite_idx
  ON public.assets (user_id, is_favorite)
  WHERE is_favorite;

CREATE INDEX IF NOT EXISTS assets_document_id_idx
  ON public.assets (document_id);

CREATE INDEX IF NOT EXISTS assets_category_key_idx
  ON public.assets (user_id, category_key);
