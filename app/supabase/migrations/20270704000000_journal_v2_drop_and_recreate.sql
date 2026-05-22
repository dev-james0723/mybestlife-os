-- ===========================================================================
-- Journal v2: structured emotional-processing entries.
--
-- DESTRUCTIVE: replaces the legacy `journal_entries` table (HTML content +
-- pleasantness/activation 5x5 emotion map) with the RULER quadrant + 100
-- emotions model + topic-specific extras + AI output/media JSONB columns.
--
-- All previous rows are dropped. Storage objects under `journal-illustrations`
-- and `journal-audio` are unaffected by this migration (handled separately).
-- ===========================================================================

DROP TABLE IF EXISTS public.journal_entries CASCADE;

CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,

  topic TEXT NOT NULL,
  quadrant TEXT NOT NULL,
  primary_emotion TEXT NOT NULL,
  secondary_emotion TEXT,
  intensity SMALLINT NOT NULL,
  target TEXT,

  bullets JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb,
  self_story TEXT,
  needs JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb,
  next_tiny_step TEXT NOT NULL,
  appreciation TEXT,
  topic_extras JSONB,
  context_factors JSONB,

  -- First-class link arrays (mirroring the project's existing convention
  -- on ideas / role_models — preferred over a metadata JSONB blob).
  project_ids UUID[] NOT NULL DEFAULT '{}',
  task_ids UUID[] NOT NULL DEFAULT '{}',

  ai_output JSONB,
  ai_media JSONB,

  source TEXT NOT NULL DEFAULT 'journal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT journal_entries_topic_check CHECK (
    topic IN (
      'Work/Study',
      'People/Relationships',
      'Body/Health',
      'Stress Event',
      'Achievement/Confidence',
      'Creativity/Music',
      'Big Decisions',
      'Quick Reset'
    )
  ),
  CONSTRAINT journal_entries_quadrant_check CHECK (
    quadrant IN ('RED', 'YELLOW', 'BLUE', 'GREEN')
  ),
  CONSTRAINT journal_entries_intensity_check CHECK (
    intensity BETWEEN 1 AND 10
  ),
  CONSTRAINT journal_entries_target_check CHECK (
    target IS NULL OR target IN ('Myself', 'Someone', 'Situation', 'Future', 'Body')
  ),
  CONSTRAINT journal_entries_next_tiny_step_length_check CHECK (
    char_length(next_tiny_step) BETWEEN 1 AND 140
  )
);

CREATE INDEX journal_entries_user_entry_date_idx
  ON public.journal_entries (user_id, entry_date DESC);

CREATE INDEX journal_entries_user_created_at_idx
  ON public.journal_entries (user_id, created_at DESC);

-- ----------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.journal_entries_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_entries_set_updated_at ON public.journal_entries;
CREATE TRIGGER journal_entries_set_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.journal_entries_set_updated_at();

-- ----------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal_entries" ON public.journal_entries;

CREATE POLICY "Users can view own journal_entries"
  ON public.journal_entries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal_entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal_entries"
  ON public.journal_entries
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal_entries"
  ON public.journal_entries
  FOR DELETE
  USING (auth.uid() = user_id);
