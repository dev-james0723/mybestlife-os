-- Phase 3 backfill: populate `category_key` for existing assets that have
-- a legacy free-text `category` but no enum key yet.
--
-- Decision (Phase 3 planning, "Legacy category free-text backfill" = option C):
--   Bucket *everything* with a non-null legacy `category` into `other`.
--   This is the safe, brain-dead minimum: no regex guessing, no data loss.
--   Users can correct the category in the UI via the new category Select.
--
-- Requirements:
--   - Idempotent: re-running is a no-op.
--   - Does NOT overwrite existing category_key values.
--   - Leaves legacy `category` text intact (read-path still uses it for
--     display if ever needed).

UPDATE public.assets
SET category_key = 'other'
WHERE category_key IS NULL
  AND category IS NOT NULL
  AND trim(category) <> '';
