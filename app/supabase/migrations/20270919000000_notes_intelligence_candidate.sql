-- Notes Intelligence candidate migration.
--
-- This is intentionally additive and safe to review before applying. The app
-- MVP works with the existing notes CRUD shape; these columns/tables enable the
-- richer AI metadata and human-approved conversion flow.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- notes — lightweight intelligence metadata
-- ============================================================

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'inbox';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS ai_tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS manual_tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMPTZ;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_status_check'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_status_check
      CHECK (status IN ('inbox', 'reviewed', 'processed', 'archived'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notes_note_type_check'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_note_type_check
      CHECK (
        note_type IN (
          'brain-dump',
          'meeting',
          'research',
          'decision',
          'reflection',
          'project-note',
          'resource',
          'learning',
          'general'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notes_user_status_idx
  ON public.notes (user_id, status);

CREATE INDEX IF NOT EXISTS notes_user_note_type_idx
  ON public.notes (user_id, note_type);

CREATE INDEX IF NOT EXISTS notes_user_last_processed_idx
  ON public.notes (user_id, last_processed_at DESC);

-- ============================================================
-- note_links — human/AI suggested links to OS objects
-- ============================================================

CREATE TABLE IF NOT EXISTS public.note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT,
  confidence NUMERIC,
  created_by TEXT NOT NULL DEFAULT 'user',
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_links_note_idx
  ON public.note_links (note_id);

CREATE INDEX IF NOT EXISTS note_links_target_idx
  ON public.note_links (target_type, target_id);

CREATE INDEX IF NOT EXISTS note_links_user_idx
  ON public.note_links (user_id);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS note_links_select_own ON public.note_links;
CREATE POLICY note_links_select_own
  ON public.note_links
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS note_links_insert_own ON public.note_links;
CREATE POLICY note_links_insert_own
  ON public.note_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS note_links_update_own ON public.note_links;
CREATE POLICY note_links_update_own
  ON public.note_links
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS note_links_delete_own ON public.note_links;
CREATE POLICY note_links_delete_own
  ON public.note_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- note_action_candidates — suggested actions before task creation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.note_action_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT,
  due_date DATE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'suggested',
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ai_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_action_candidates_note_idx
  ON public.note_action_candidates (note_id);

CREATE INDEX IF NOT EXISTS note_action_candidates_user_status_idx
  ON public.note_action_candidates (user_id, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'note_action_candidates_status_check'
  ) THEN
    ALTER TABLE public.note_action_candidates
      ADD CONSTRAINT note_action_candidates_status_check
      CHECK (status IN ('suggested', 'accepted', 'dismissed'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.note_action_candidates_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS note_action_candidates_set_updated_at ON public.note_action_candidates;
CREATE TRIGGER note_action_candidates_set_updated_at
  BEFORE UPDATE ON public.note_action_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.note_action_candidates_set_updated_at();

ALTER TABLE public.note_action_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS note_action_candidates_select_own ON public.note_action_candidates;
CREATE POLICY note_action_candidates_select_own
  ON public.note_action_candidates
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS note_action_candidates_insert_own ON public.note_action_candidates;
CREATE POLICY note_action_candidates_insert_own
  ON public.note_action_candidates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS note_action_candidates_update_own ON public.note_action_candidates;
CREATE POLICY note_action_candidates_update_own
  ON public.note_action_candidates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS note_action_candidates_delete_own ON public.note_action_candidates;
CREATE POLICY note_action_candidates_delete_own
  ON public.note_action_candidates
  FOR DELETE
  USING (auth.uid() = user_id);
