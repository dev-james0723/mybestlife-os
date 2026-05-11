-- Document Brain / DocOracle: extraction jobs + normalized document intelligence.
-- document_id references knowledge_items(id) — one KB card is the canonical document.

-- ── Profiles: SaaS quota fields (plan-ready) ───────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS document_limit integer,
  ADD COLUMN IF NOT EXISTS page_limit integer,
  ADD COLUMN IF NOT EXISTS storage_limit_bytes bigint,
  ADD COLUMN IF NOT EXISTS monthly_extraction_limit integer;

COMMENT ON COLUMN public.profiles.plan IS 'Subscription tier label (free, pro, …).';
COMMENT ON COLUMN public.profiles.document_limit IS 'Max knowledge documents with Doc Brain; NULL = use app default.';
COMMENT ON COLUMN public.profiles.page_limit IS 'Max pages per document; NULL = default.';
COMMENT ON COLUMN public.profiles.storage_limit_bytes IS 'Max bytes in knowledge-files for user; NULL = default.';
COMMENT ON COLUMN public.profiles.monthly_extraction_limit IS 'Max MinerU-style extractions per calendar month; NULL = default.';

-- ── Tenant guard: document_id must belong to same user as row ─────────────
CREATE OR REPLACE FUNCTION public.document_brain_assert_knowledge_item_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.knowledge_items ki
    WHERE ki.id = NEW.document_id
      AND ki.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'document_brain_invalid_document' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- ── document_extraction_jobs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_extraction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'processing', 'parsing', 'normalizing', 'enriching', 'indexing',
      'completed', 'failed', 'cancelled'
    )),
  parser text NOT NULL DEFAULT 'mineru',
  parser_mode text,
  input_file_path text NOT NULL,
  output_base_path text,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_stage text,
  priority integer NOT NULL DEFAULT 0,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE INDEX IF NOT EXISTS document_extraction_jobs_user_doc_created_idx
  ON public.document_extraction_jobs (user_id, document_id, created_at DESC);

DROP TRIGGER IF EXISTS document_brain_jobs_assert_owner ON public.document_extraction_jobs;
CREATE TRIGGER document_brain_jobs_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_extraction_jobs
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_extraction_jobs_touch_updated_at ON public.document_extraction_jobs;
-- (no updated_at column on jobs)

ALTER TABLE public.document_extraction_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_extraction_jobs_select_own ON public.document_extraction_jobs;
CREATE POLICY document_extraction_jobs_select_own
  ON public.document_extraction_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS document_extraction_jobs_insert_own ON public.document_extraction_jobs;
CREATE POLICY document_extraction_jobs_insert_own
  ON public.document_extraction_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS document_extraction_jobs_update_own ON public.document_extraction_jobs;
CREATE POLICY document_extraction_jobs_update_own
  ON public.document_extraction_jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS document_extraction_jobs_delete_own ON public.document_extraction_jobs;
CREATE POLICY document_extraction_jobs_delete_own
  ON public.document_extraction_jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── document_analyses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  parser text NOT NULL DEFAULT 'mineru',
  parser_version text,
  document_title text,
  document_type text,
  language text,
  total_pages integer,
  visual_density text,
  extraction_risk text,
  summary text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX IF NOT EXISTS document_analyses_user_document_idx
  ON public.document_analyses (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_analyses_assert_owner ON public.document_analyses;
CREATE TRIGGER document_brain_analyses_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_analyses
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_analyses_touch_updated_at ON public.document_analyses;
CREATE TRIGGER document_analyses_touch_updated_at
  BEFORE UPDATE ON public.document_analyses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_analyses_select_own ON public.document_analyses;
CREATE POLICY document_analyses_select_own
  ON public.document_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS document_analyses_insert_own ON public.document_analyses;
CREATE POLICY document_analyses_insert_own
  ON public.document_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS document_analyses_update_own ON public.document_analyses;
CREATE POLICY document_analyses_update_own
  ON public.document_analyses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS document_analyses_delete_own ON public.document_analyses;
CREATE POLICY document_analyses_delete_own
  ON public.document_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── document_pages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  page_label text,
  page_type text,
  raw_text text,
  markdown text,
  page_summary text,
  interpreted_page_meaning text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  rendered_image_path text,
  rendered_image_url text,
  source_pdf_page_ref text,
  has_visual_assets boolean NOT NULL DEFAULT false,
  suggested_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  extraction_risk text,
  uncertainties jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, page_number)
);

CREATE INDEX IF NOT EXISTS document_pages_user_doc_idx
  ON public.document_pages (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_pages_assert_owner ON public.document_pages;
CREATE TRIGGER document_brain_pages_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_pages
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_pages_touch_updated_at ON public.document_pages;
CREATE TRIGGER document_pages_touch_updated_at
  BEFORE UPDATE ON public.document_pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_pages_select_own ON public.document_pages;
CREATE POLICY document_pages_select_own ON public.document_pages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_pages_insert_own ON public.document_pages;
CREATE POLICY document_pages_insert_own ON public.document_pages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_pages_update_own ON public.document_pages;
CREATE POLICY document_pages_update_own ON public.document_pages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_pages_delete_own ON public.document_pages;
CREATE POLICY document_pages_delete_own ON public.document_pages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_sections ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  title text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES public.document_sections (id) ON DELETE SET NULL,
  page_start integer,
  page_end integer,
  summary text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  representative_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_sections_user_doc_idx ON public.document_sections (user_id, document_id);
CREATE INDEX IF NOT EXISTS document_sections_analysis_idx ON public.document_sections (analysis_id);

DROP TRIGGER IF EXISTS document_brain_sections_assert_owner ON public.document_sections;
CREATE TRIGGER document_brain_sections_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_sections
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_sections_touch_updated_at ON public.document_sections;
CREATE TRIGGER document_sections_touch_updated_at
  BEFORE UPDATE ON public.document_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_sections_select_own ON public.document_sections;
CREATE POLICY document_sections_select_own ON public.document_sections FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_sections_insert_own ON public.document_sections;
CREATE POLICY document_sections_insert_own ON public.document_sections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_sections_update_own ON public.document_sections;
CREATE POLICY document_sections_update_own ON public.document_sections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_sections_delete_own ON public.document_sections;
CREATE POLICY document_sections_delete_own ON public.document_sections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_glossary_terms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_glossary_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  term text NOT NULL,
  definition text,
  category text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_glossary_user_doc_idx ON public.document_glossary_terms (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_glossary_assert_owner ON public.document_glossary_terms;
CREATE TRIGGER document_brain_glossary_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_glossary_terms_touch_updated_at ON public.document_glossary_terms;
CREATE TRIGGER document_glossary_terms_touch_updated_at
  BEFORE UPDATE ON public.document_glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_glossary_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_glossary_terms_select_own ON public.document_glossary_terms;
CREATE POLICY document_glossary_terms_select_own ON public.document_glossary_terms FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_glossary_terms_insert_own ON public.document_glossary_terms;
CREATE POLICY document_glossary_terms_insert_own ON public.document_glossary_terms FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_glossary_terms_update_own ON public.document_glossary_terms;
CREATE POLICY document_glossary_terms_update_own ON public.document_glossary_terms FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_glossary_terms_delete_own ON public.document_glossary_terms;
CREATE POLICY document_glossary_terms_delete_own ON public.document_glossary_terms FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_visual_assets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  source_page_number integer,
  type text,
  semantic_category text,
  title text,
  description text,
  image_path text,
  image_url text,
  extracted_labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  retrieval_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_terms jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence real,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_visual_assets_user_doc_idx ON public.document_visual_assets (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_visuals_assert_owner ON public.document_visual_assets;
CREATE TRIGGER document_brain_visuals_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_visual_assets
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_visual_assets_touch_updated_at ON public.document_visual_assets;
CREATE TRIGGER document_visual_assets_touch_updated_at
  BEFORE UPDATE ON public.document_visual_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_visual_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_visual_assets_select_own ON public.document_visual_assets;
CREATE POLICY document_visual_assets_select_own ON public.document_visual_assets FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_visual_assets_insert_own ON public.document_visual_assets;
CREATE POLICY document_visual_assets_insert_own ON public.document_visual_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_visual_assets_update_own ON public.document_visual_assets;
CREATE POLICY document_visual_assets_update_own ON public.document_visual_assets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_visual_assets_delete_own ON public.document_visual_assets;
CREATE POLICY document_visual_assets_delete_own ON public.document_visual_assets FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_chunks (optional embedding added later via extension migration) ─
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.document_analyses (id) ON DELETE CASCADE,
  chunk_type text NOT NULL DEFAULT 'text',
  page_number integer,
  section_id uuid REFERENCES public.document_sections (id) ON DELETE SET NULL,
  section_path text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  chunk_text text NOT NULL,
  has_visual boolean NOT NULL DEFAULT false,
  related_visual_asset_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_user_doc_idx ON public.document_chunks (user_id, document_id);
CREATE INDEX IF NOT EXISTS document_chunks_analysis_idx ON public.document_chunks (analysis_id);

DROP TRIGGER IF EXISTS document_brain_chunks_assert_owner ON public.document_chunks;
CREATE TRIGGER document_brain_chunks_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_chunks_touch_updated_at ON public.document_chunks;
CREATE TRIGGER document_chunks_touch_updated_at
  BEFORE UPDATE ON public.document_chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_chunks_select_own ON public.document_chunks;
CREATE POLICY document_chunks_select_own ON public.document_chunks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chunks_insert_own ON public.document_chunks;
CREATE POLICY document_chunks_insert_own ON public.document_chunks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chunks_update_own ON public.document_chunks;
CREATE POLICY document_chunks_update_own ON public.document_chunks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chunks_delete_own ON public.document_chunks;
CREATE POLICY document_chunks_delete_own ON public.document_chunks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_chat_sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chat_sessions_user_doc_idx
  ON public.document_chat_sessions (user_id, document_id);

DROP TRIGGER IF EXISTS document_brain_chat_sessions_assert_owner ON public.document_chat_sessions;
CREATE TRIGGER document_brain_chat_sessions_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

DROP TRIGGER IF EXISTS document_chat_sessions_touch_updated_at ON public.document_chat_sessions;
CREATE TRIGGER document_chat_sessions_touch_updated_at
  BEFORE UPDATE ON public.document_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.document_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_chat_sessions_select_own ON public.document_chat_sessions;
CREATE POLICY document_chat_sessions_select_own ON public.document_chat_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_sessions_insert_own ON public.document_chat_sessions;
CREATE POLICY document_chat_sessions_insert_own ON public.document_chat_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_sessions_update_own ON public.document_chat_sessions;
CREATE POLICY document_chat_sessions_update_own ON public.document_chat_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_sessions_delete_own ON public.document_chat_sessions;
CREATE POLICY document_chat_sessions_delete_own ON public.document_chat_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── document_chat_messages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.document_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.knowledge_items (id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.document_chat_sessions (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_visuals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chat_messages_session_idx
  ON public.document_chat_messages (session_id, created_at);

DROP TRIGGER IF EXISTS document_brain_chat_messages_assert_owner ON public.document_chat_messages;
CREATE TRIGGER document_brain_chat_messages_assert_owner
  BEFORE INSERT OR UPDATE OF document_id, user_id ON public.document_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.document_brain_assert_knowledge_item_owner();

ALTER TABLE public.document_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_chat_messages_select_own ON public.document_chat_messages;
CREATE POLICY document_chat_messages_select_own ON public.document_chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_messages_insert_own ON public.document_chat_messages;
CREATE POLICY document_chat_messages_insert_own ON public.document_chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_messages_update_own ON public.document_chat_messages;
CREATE POLICY document_chat_messages_update_own ON public.document_chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS document_chat_messages_delete_own ON public.document_chat_messages;
CREATE POLICY document_chat_messages_delete_own ON public.document_chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.document_extraction_jobs IS 'MinerU / Doc Brain async extraction pipeline; document_id = knowledge_items.id';
COMMENT ON TABLE public.document_analyses IS 'Normalized DocOracle analysis root per knowledge document';
