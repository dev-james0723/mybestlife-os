-- Role Models: richer profile schema for the AI Auto-Fill feature.
--
-- Additive-only migration. The legacy columns `description`, `image_url`,
-- and the `linked_*_ids` arrays are PRESERVED so existing rows and any
-- consumer of the old shape keep working. The UI now reads `bio` instead
-- of `description`; we backfill `bio` from `description` once below.
--
-- New columns map 1:1 to the AI Auto-Fill output contract:
--   photo_url           — primary portrait (external URL or Supabase Storage path)
--   admiration_blurb    — short user-facing reason ("Why I admire them")
--   bio                 — long-form biography
--   category            — domain tag (single value, free-form for now)
--   quotes              — jsonb[] of { text, source }
--   key_lessons         — jsonb[] of { title, detail }
--   tags                — flat text[] for cross-cutting search/filter
--   links               — jsonb[] of { label, url, kind }
--   notes               — user's private reflections
--   is_favorite         — gallery favorites toggle
--
-- Phase 3 will introduce a `role-model-photos` Storage bucket; this migration
-- does NOT create it (kept here as schema-only DDL so DB and Storage migrate
-- in separate, reviewable steps).

ALTER TABLE public.role_models
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS admiration_blurb TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS quotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS key_lessons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- One-time backfill: if `bio` is empty but `description` has content, copy it.
UPDATE public.role_models
SET bio = description
WHERE bio IS NULL AND description IS NOT NULL;

-- Mirror the rest of the schema's RLS pattern: user_id default to auth.uid() so
-- inserts from authenticated clients don't need to send it.
ALTER TABLE public.role_models
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Filter / sort indexes for the gallery view.
CREATE INDEX IF NOT EXISTS role_models_user_category_idx
  ON public.role_models (user_id, category);

CREATE INDEX IF NOT EXISTS role_models_user_favorite_idx
  ON public.role_models (user_id, is_favorite)
  WHERE is_favorite = true;

CREATE INDEX IF NOT EXISTS role_models_user_created_idx
  ON public.role_models (user_id, created_at DESC);

-- Sanity: structural shape constraints on the JSONB columns. We keep these
-- loose (just "must be an array") so the UI/API can evolve item shape without
-- another migration.
ALTER TABLE public.role_models
  ADD CONSTRAINT role_models_quotes_is_array
    CHECK (jsonb_typeof(quotes) = 'array') NOT VALID;

ALTER TABLE public.role_models
  ADD CONSTRAINT role_models_key_lessons_is_array
    CHECK (jsonb_typeof(key_lessons) = 'array') NOT VALID;

ALTER TABLE public.role_models
  ADD CONSTRAINT role_models_links_is_array
    CHECK (jsonb_typeof(links) = 'array') NOT VALID;

-- Validate now (cheap on small data; also catches any accidental non-array
-- defaults that might have been set previously).
ALTER TABLE public.role_models
  VALIDATE CONSTRAINT role_models_quotes_is_array;

ALTER TABLE public.role_models
  VALIDATE CONSTRAINT role_models_key_lessons_is_array;

ALTER TABLE public.role_models
  VALIDATE CONSTRAINT role_models_links_is_array;
