-- Doc Oracle: persisted generated infographics and audio summaries.

CREATE TABLE IF NOT EXISTS public.document_generated_infographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  aspect_ratio text NOT NULL,
  style text NOT NULL,
  focus_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  prompt_used text,
  storage_path text NOT NULL,
  image_url text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_generated_infographics_user_doc_created_idx
  ON public.document_generated_infographics (user_id, document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_generated_infographics_analysis_idx
  ON public.document_generated_infographics (analysis_id);

DROP TRIGGER IF EXISTS document_brain_infographics_assert_owner ON public.document_generated_infographics;
CREATE TRIGGER document_brain_infographics_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_generated_infographics
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

ALTER TABLE public.document_generated_infographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_generated_infographics_select_own ON public.document_generated_infographics;
CREATE POLICY document_generated_infographics_select_own
  ON public.document_generated_infographics FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_generated_infographics_insert_own ON public.document_generated_infographics;
CREATE POLICY document_generated_infographics_insert_own
  ON public.document_generated_infographics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_generated_infographics_update_own ON public.document_generated_infographics;
CREATE POLICY document_generated_infographics_update_own
  ON public.document_generated_infographics FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_generated_infographics_delete_own ON public.document_generated_infographics;
CREATE POLICY document_generated_infographics_delete_own
  ON public.document_generated_infographics FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.document_audio_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  provider text NOT NULL,
  voice_gender text NOT NULL,
  voice_name text,
  format text NOT NULL,
  duration_seconds integer,
  focus_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  transcript text,
  chapters jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_pages integer[] NOT NULL DEFAULT '{}'::integer[],
  source_sections text[] NOT NULL DEFAULT '{}'::text[],
  storage_path text NOT NULL,
  audio_url text NOT NULL,
  audio_mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_audio_summaries_user_doc_created_idx
  ON public.document_audio_summaries (user_id, document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_audio_summaries_analysis_idx
  ON public.document_audio_summaries (analysis_id);

DROP TRIGGER IF EXISTS document_brain_audio_summaries_assert_owner ON public.document_audio_summaries;
CREATE TRIGGER document_brain_audio_summaries_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_audio_summaries
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

ALTER TABLE public.document_audio_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_audio_summaries_select_own ON public.document_audio_summaries;
CREATE POLICY document_audio_summaries_select_own
  ON public.document_audio_summaries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_audio_summaries_insert_own ON public.document_audio_summaries;
CREATE POLICY document_audio_summaries_insert_own
  ON public.document_audio_summaries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_audio_summaries_update_own ON public.document_audio_summaries;
CREATE POLICY document_audio_summaries_update_own
  ON public.document_audio_summaries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_audio_summaries_delete_own ON public.document_audio_summaries;
CREATE POLICY document_audio_summaries_delete_own
  ON public.document_audio_summaries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.document_generated_infographics IS 'Doc Oracle Gemini-generated infographics per document';
COMMENT ON TABLE public.document_audio_summaries IS 'Doc Oracle TTS audio summaries per document';
