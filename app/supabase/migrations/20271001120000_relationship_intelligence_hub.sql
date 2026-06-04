-- Relationship Intelligence Hub — persistence foundation.
--
-- Transforms the personal-CRM `relationships` table (see 20260419140000)
-- into an AI-first "Relationship Intelligence Hub" by adding the memory,
-- commitment, image, AI-report, and message-draft layers around it.
--
-- New tables (all user-scoped, all RLS self-only — `auth.uid() = user_id`):
--   relationship_interactions   captured/logged touchpoints (raw note + AI summary)
--   relationship_promises       tracked commitments ("Promise Keeper")
--   relationship_ai_reports     cached AI intelligence reports (1 per relationship)
--   relationship_message_drafts generated follow-up drafts (never auto-sent)
--   relationship_images         multi-image memory layer (profile / 合照 / cards / …)
--
-- New storage bucket:
--   relationship-images         memory images + business cards + screenshots
--
-- Conventions matched against 20260419140000_relationships_redesign.sql:
--   - uuid PK gen_random_uuid(); user_id NOT NULL DEFAULT auth.uid()
--     REFERENCES auth.users ON DELETE CASCADE.
--   - relationship_id REFERENCES public.relationships ON DELETE CASCADE so
--     deleting a person tears down their whole memory graph.
--   - enums stored as TEXT slugs (no CHECK) for forward-compat / i18n.
--   - per-domain set_*_updated_at() trigger functions with a fixed search_path
--     (matches 20260419140200_relationships_function_search_path.sql).

BEGIN;

-- ===========================================================================
-- 1. relationship_interactions
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.relationship_interactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL DEFAULT auth.uid()
                      REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id   UUID NOT NULL
                      REFERENCES public.relationships(id) ON DELETE CASCADE,

  interaction_date  DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  interaction_type  TEXT NOT NULL DEFAULT 'other',

  raw_note          TEXT NOT NULL DEFAULT '',
  summary           TEXT NOT NULL DEFAULT '',

  -- AI-extracted structure (commitments, preferences, tags, …) for audit.
  extracted_json    JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relationship_interactions_user_rel_idx
  ON public.relationship_interactions (user_id, relationship_id, interaction_date DESC);

-- ===========================================================================
-- 2. relationship_promises
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.relationship_promises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL DEFAULT auth.uid()
                          REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id       UUID NOT NULL
                          REFERENCES public.relationships(id) ON DELETE CASCADE,

  promise_text          TEXT NOT NULL,
  due_date              DATE,
  status                TEXT NOT NULL DEFAULT 'open',  -- open | done | overdue | cancelled

  source_interaction_id UUID
                          REFERENCES public.relationship_interactions(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relationship_promises_user_rel_idx
  ON public.relationship_promises (user_id, relationship_id);

CREATE INDEX IF NOT EXISTS relationship_promises_user_open_idx
  ON public.relationship_promises (user_id, status)
  WHERE status = 'open';

-- ===========================================================================
-- 3. relationship_ai_reports  (one cached report per relationship)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.relationship_ai_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL DEFAULT auth.uid()
                      REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id   UUID NOT NULL
                      REFERENCES public.relationships(id) ON DELETE CASCADE,

  report_json       JSONB NOT NULL,
  model_used        TEXT,
  -- Hash of the inputs the report was generated from, so the UI can tell
  -- when the underlying profile/interactions have drifted from the report.
  input_hash        TEXT,

  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS relationship_ai_reports_relationship_id_key
  ON public.relationship_ai_reports (relationship_id);

-- ===========================================================================
-- 4. relationship_message_drafts  (generated, never auto-sent)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.relationship_message_drafts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL DEFAULT auth.uid()
                      REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id   UUID NOT NULL
                      REFERENCES public.relationships(id) ON DELETE CASCADE,

  purpose           TEXT NOT NULL DEFAULT 'follow_up',
  tone              TEXT NOT NULL DEFAULT 'warm',
  language          TEXT NOT NULL DEFAULT 'en',
  subject           TEXT,
  body              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',  -- draft | copied | archived

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relationship_message_drafts_user_rel_idx
  ON public.relationship_message_drafts (user_id, relationship_id, created_at DESC);

-- ===========================================================================
-- 5. relationship_images  (multi-image memory layer)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.relationship_images (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL DEFAULT auth.uid()
                        REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id     UUID NOT NULL
                        REFERENCES public.relationships(id) ON DELETE CASCADE,

  image_url           TEXT NOT NULL,
  -- profile_photo | shared_photo | event_photo | business_card | screenshot | memory_photo | other
  image_type          TEXT NOT NULL DEFAULT 'memory_photo',

  caption             TEXT,
  ai_caption          TEXT,
  event_date          DATE,
  location            TEXT,
  related_project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  is_primary          BOOLEAN NOT NULL DEFAULT false,
  extracted_json      JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relationship_images_user_rel_idx
  ON public.relationship_images (user_id, relationship_id, created_at DESC);

-- ===========================================================================
-- 6. updated_at triggers (per-domain functions with pinned search_path)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.set_relationship_child_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_relationship_interactions_updated_at ON public.relationship_interactions;
CREATE TRIGGER trg_relationship_interactions_updated_at
  BEFORE UPDATE ON public.relationship_interactions
  FOR EACH ROW EXECUTE FUNCTION public.set_relationship_child_updated_at();

DROP TRIGGER IF EXISTS trg_relationship_promises_updated_at ON public.relationship_promises;
CREATE TRIGGER trg_relationship_promises_updated_at
  BEFORE UPDATE ON public.relationship_promises
  FOR EACH ROW EXECUTE FUNCTION public.set_relationship_child_updated_at();

DROP TRIGGER IF EXISTS trg_relationship_ai_reports_updated_at ON public.relationship_ai_reports;
CREATE TRIGGER trg_relationship_ai_reports_updated_at
  BEFORE UPDATE ON public.relationship_ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_relationship_child_updated_at();

DROP TRIGGER IF EXISTS trg_relationship_images_updated_at ON public.relationship_images;
CREATE TRIGGER trg_relationship_images_updated_at
  BEFORE UPDATE ON public.relationship_images
  FOR EACH ROW EXECUTE FUNCTION public.set_relationship_child_updated_at();

-- ===========================================================================
-- 7. Row Level Security — self-only on every table.
-- ===========================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'relationship_interactions',
    'relationship_promises',
    'relationship_ai_reports',
    'relationship_message_drafts',
    'relationship_images'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %1$s" ON public.%1$I;', t);

    EXECUTE format(
      'CREATE POLICY "Users can view own %1$s" ON public.%1$I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);', t);
    EXECUTE format(
      'CREATE POLICY "Users can insert own %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);', t);
    EXECUTE format(
      'CREATE POLICY "Users can update own %1$s" ON public.%1$I FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);', t);
    EXECUTE format(
      'CREATE POLICY "Users can delete own %1$s" ON public.%1$I FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);', t);
  END LOOP;
END $$;

-- ===========================================================================
-- 8. Storage bucket for the image memory layer.
--    Path layout: {auth.uid()}/{relationship_id_or_drafts}/{uuid}.{ext}
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'relationship-images',
  'relationship-images',
  true,
  10485760, -- 10 MB (business cards / screenshots can be larger than avatars)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Relationship images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own relationship images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own relationship images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own relationship images" ON storage.objects;

CREATE POLICY "Relationship images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relationship-images');

CREATE POLICY "Users can insert own relationship images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relationship-images'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users can update own relationship images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'relationship-images'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
)
WITH CHECK (
  bucket_id = 'relationship-images'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

CREATE POLICY "Users can delete own relationship images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'relationship-images'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

COMMIT;
