-- Ask Your KB — shared semantic retrieval index.
--
-- Additive schema for cited retrieval across Knowledge Base, Doc Oracle,
-- AI Knowledge prompt runs, and future Life Agent readable domains.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- os_retrieval_documents
-- ============================================================

CREATE TABLE IF NOT EXISTS public.os_retrieval_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  source_domain TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  knowledge_item_id UUID REFERENCES public.knowledge_items(id) ON DELETE CASCADE,

  document_kind TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0 CHECK (chunk_index >= 0),

  title TEXT,
  body TEXT NOT NULL,
  body_preview TEXT,
  source_url TEXT,
  source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  page_number INTEGER,
  section_path TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',

  content_hash TEXT NOT NULL,
  embedding vector(768),
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-004',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT os_retrieval_documents_unique_chunk
    UNIQUE (user_id, source_domain, source_id, document_kind, chunk_index),
  CONSTRAINT os_retrieval_documents_metadata_is_object
    CHECK (jsonb_typeof(source_metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS os_retrieval_documents_user_domain_idx
  ON public.os_retrieval_documents (user_id, source_domain);
CREATE INDEX IF NOT EXISTS os_retrieval_documents_user_knowledge_item_idx
  ON public.os_retrieval_documents (user_id, knowledge_item_id)
  WHERE knowledge_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS os_retrieval_documents_user_content_hash_idx
  ON public.os_retrieval_documents (user_id, content_hash);
CREATE INDEX IF NOT EXISTS os_retrieval_documents_tags_idx
  ON public.os_retrieval_documents USING gin (tags);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'os_retrieval_documents_embedding_hnsw_idx'
  ) THEN
    EXECUTE 'CREATE INDEX os_retrieval_documents_embedding_hnsw_idx ON public.os_retrieval_documents USING hnsw (embedding vector_cosine_ops)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.os_retrieval_documents_set_updated_at()
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

DROP TRIGGER IF EXISTS os_retrieval_documents_set_updated_at
  ON public.os_retrieval_documents;
CREATE TRIGGER os_retrieval_documents_set_updated_at
  BEFORE UPDATE ON public.os_retrieval_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.os_retrieval_documents_set_updated_at();

ALTER TABLE public.os_retrieval_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_retrieval_documents_select_own
  ON public.os_retrieval_documents;
CREATE POLICY os_retrieval_documents_select_own
  ON public.os_retrieval_documents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_documents_insert_own
  ON public.os_retrieval_documents;
CREATE POLICY os_retrieval_documents_insert_own
  ON public.os_retrieval_documents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_documents_update_own
  ON public.os_retrieval_documents;
CREATE POLICY os_retrieval_documents_update_own
  ON public.os_retrieval_documents
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_documents_delete_own
  ON public.os_retrieval_documents;
CREATE POLICY os_retrieval_documents_delete_own
  ON public.os_retrieval_documents
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- os_retrieval_runs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.os_retrieval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  query TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (mode IN ('hybrid', 'semantic', 'keyword', 'recent')),
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_domains TEXT[] NOT NULL DEFAULT '{}',
  warnings TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT os_retrieval_runs_scope_is_object
    CHECK (jsonb_typeof(scope) = 'object')
);

CREATE INDEX IF NOT EXISTS os_retrieval_runs_user_created_idx
  ON public.os_retrieval_runs (user_id, created_at DESC);

ALTER TABLE public.os_retrieval_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_retrieval_runs_select_own
  ON public.os_retrieval_runs;
CREATE POLICY os_retrieval_runs_select_own
  ON public.os_retrieval_runs
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_runs_insert_own
  ON public.os_retrieval_runs;
CREATE POLICY os_retrieval_runs_insert_own
  ON public.os_retrieval_runs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_runs_update_own
  ON public.os_retrieval_runs;
CREATE POLICY os_retrieval_runs_update_own
  ON public.os_retrieval_runs
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_runs_delete_own
  ON public.os_retrieval_runs;
CREATE POLICY os_retrieval_runs_delete_own
  ON public.os_retrieval_runs
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- os_retrieval_run_results
-- ============================================================

CREATE TABLE IF NOT EXISTS public.os_retrieval_run_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  run_id UUID NOT NULL REFERENCES public.os_retrieval_runs(id) ON DELETE CASCADE,
  retrieval_document_id UUID REFERENCES public.os_retrieval_documents(id) ON DELETE SET NULL,

  rank INTEGER NOT NULL CHECK (rank > 0),
  combined_score REAL NOT NULL DEFAULT 0,
  semantic_score REAL,
  metadata_score REAL,
  recency_score REAL,
  connection_score REAL,
  snippet TEXT,
  why TEXT[] NOT NULL DEFAULT '{}',
  result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT os_retrieval_run_results_unique_doc
    UNIQUE (run_id, retrieval_document_id),
  CONSTRAINT os_retrieval_run_results_metadata_is_object
    CHECK (jsonb_typeof(result_metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS os_retrieval_run_results_user_run_idx
  ON public.os_retrieval_run_results (user_id, run_id, rank);
CREATE INDEX IF NOT EXISTS os_retrieval_run_results_doc_idx
  ON public.os_retrieval_run_results (retrieval_document_id)
  WHERE retrieval_document_id IS NOT NULL;

ALTER TABLE public.os_retrieval_run_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_retrieval_run_results_select_own
  ON public.os_retrieval_run_results;
CREATE POLICY os_retrieval_run_results_select_own
  ON public.os_retrieval_run_results
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS os_retrieval_run_results_insert_own
  ON public.os_retrieval_run_results;
CREATE POLICY os_retrieval_run_results_insert_own
  ON public.os_retrieval_run_results
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.os_retrieval_runs r
      WHERE r.id = run_id
        AND r.user_id = (select auth.uid())
    )
    AND (
      retrieval_document_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.os_retrieval_documents d
        WHERE d.id = retrieval_document_id
          AND d.user_id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS os_retrieval_run_results_delete_own
  ON public.os_retrieval_run_results;
CREATE POLICY os_retrieval_run_results_delete_own
  ON public.os_retrieval_run_results
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- Match RPC — k-NN cosine retrieval scoped by auth.uid().
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_os_retrieval_documents(
  query_embedding vector(768),
  match_count INTEGER DEFAULT 24,
  match_threshold DOUBLE PRECISION DEFAULT 0.35,
  filter_source_domains TEXT[] DEFAULT NULL,
  filter_knowledge_item_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_domain TEXT,
  source_table TEXT,
  source_id TEXT,
  knowledge_item_id UUID,
  document_kind TEXT,
  chunk_index INTEGER,
  title TEXT,
  body_preview TEXT,
  source_url TEXT,
  source_metadata JSONB,
  page_number INTEGER,
  section_path TEXT,
  tags TEXT[],
  content_hash TEXT,
  embedding_model TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    d.id,
    d.source_domain,
    d.source_table,
    d.source_id,
    d.knowledge_item_id,
    d.document_kind,
    d.chunk_index,
    d.title,
    d.body_preview,
    d.source_url,
    d.source_metadata,
    d.page_number,
    d.section_path,
    d.tags,
    d.content_hash,
    d.embedding_model,
    d.created_at,
    d.updated_at,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM public.os_retrieval_documents d
  WHERE d.embedding IS NOT NULL
    AND d.user_id = (select auth.uid())
    AND (
      filter_source_domains IS NULL
      OR cardinality(filter_source_domains) = 0
      OR d.source_domain = ANY(filter_source_domains)
    )
    AND (
      filter_knowledge_item_ids IS NULL
      OR cardinality(filter_knowledge_item_ids) = 0
      OR d.knowledge_item_id = ANY(filter_knowledge_item_ids)
    )
    AND 1 - (d.embedding <=> query_embedding) >= match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE
  ON FUNCTION public.match_os_retrieval_documents(vector(768), INTEGER, DOUBLE PRECISION, TEXT[], UUID[])
  TO authenticated;

-- ============================================================
-- AI Knowledge prompt-run provenance bridge.
-- ============================================================

ALTER TABLE public.ai_prompt_runs
  ADD COLUMN IF NOT EXISTS retrieval_run_id UUID REFERENCES public.os_retrieval_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retrieval_evidence JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_retrieval_run
  ON public.ai_prompt_runs(retrieval_run_id)
  WHERE retrieval_run_id IS NOT NULL;
