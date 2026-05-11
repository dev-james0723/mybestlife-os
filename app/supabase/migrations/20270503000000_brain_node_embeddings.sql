-- Connected Brain Engine — generic node embeddings.
--
-- Stores text-embedding-004 (768-dim) embeddings for any Brain node
-- regardless of its source table. The Brain Engine reads these to
-- generate `semantic_similarity` candidate edges that are then scored,
-- filtered (via the rejected-evidence-hash mechanism), and persisted as
-- suggestions in `brain_edges`.
--
-- Why a separate table instead of adding `embedding` columns to every
-- domain table?
--   * Many Brain node types correspond to rows in tables we don't own
--     (e.g. `daily_plans`, `relationships`, `documents`).
--   * Embeddings get re-generated when the source content changes; a
--     dedicated table makes that lifecycle explicit and indexable.
--   * Cross-domain similarity (a quote ↔ a journal entry ↔ a knowledge
--     card) requires an embedding of the *Brain node*, not the source
--     row in isolation.
--
-- Multi-user safety: same model as everywhere else — `user_id DEFAULT
-- auth.uid()`, RLS owner-only, indexed by `(user_id, node_id)`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- brain_node_embeddings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_node_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  -- Brain-namespaced node id (e.g. "goal::abc-uuid"). Matches the ids
  -- the relationship engine uses, so similarity edges connect cleanly.
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,

  -- Source table reference (best-effort — used by backfill jobs to know
  -- which row this embedding came from).
  source_id TEXT,
  source_type TEXT,

  -- Stable hash of the embedded text. The backfill job recomputes the
  -- hash from the latest content; if it changed, the row is updated.
  content_hash TEXT NOT NULL,

  embedding vector(768),
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-004',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per (user, node, content_hash). Re-embedding the same content
  -- is idempotent; updating the source content yields a new hash and a
  -- new row (the old row is retained for audit until the backfill job
  -- evicts it).
  CONSTRAINT brain_node_embeddings_unique
    UNIQUE (user_id, node_id, content_hash)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS brain_node_embeddings_user_node_idx
  ON public.brain_node_embeddings (user_id, node_id);
CREATE INDEX IF NOT EXISTS brain_node_embeddings_user_type_idx
  ON public.brain_node_embeddings (user_id, node_type);

-- HNSW for sub-linear cosine retrieval. Self-building, no training step.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'brain_node_embeddings_hnsw_idx'
  ) THEN
    EXECUTE 'CREATE INDEX brain_node_embeddings_hnsw_idx ON public.brain_node_embeddings USING hnsw (embedding vector_cosine_ops)';
  END IF;
END $$;

-- ============================================================
-- Trigger: keep updated_at fresh
-- ============================================================

CREATE OR REPLACE FUNCTION public.brain_node_embeddings_set_updated_at()
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

DROP TRIGGER IF EXISTS brain_node_embeddings_set_updated_at
  ON public.brain_node_embeddings;
CREATE TRIGGER brain_node_embeddings_set_updated_at
  BEFORE UPDATE ON public.brain_node_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.brain_node_embeddings_set_updated_at();

-- ============================================================
-- RLS — owner-only CRUD
-- ============================================================

ALTER TABLE public.brain_node_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_node_embeddings_select_own
  ON public.brain_node_embeddings;
CREATE POLICY brain_node_embeddings_select_own
  ON public.brain_node_embeddings
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_node_embeddings_insert_own
  ON public.brain_node_embeddings;
CREATE POLICY brain_node_embeddings_insert_own
  ON public.brain_node_embeddings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_node_embeddings_update_own
  ON public.brain_node_embeddings;
CREATE POLICY brain_node_embeddings_update_own
  ON public.brain_node_embeddings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_node_embeddings_delete_own
  ON public.brain_node_embeddings;
CREATE POLICY brain_node_embeddings_delete_own
  ON public.brain_node_embeddings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Match RPC — k-NN cosine retrieval scoped by user (RLS-safe).
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_brain_nodes(
  query_embedding vector(768),
  match_count INTEGER DEFAULT 10,
  match_threshold DOUBLE PRECISION DEFAULT 0.55,
  exclude_node_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  node_id TEXT,
  node_type TEXT,
  source_id TEXT,
  source_type TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.node_id,
    e.node_type,
    e.source_id,
    e.source_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.brain_node_embeddings e
  WHERE e.embedding IS NOT NULL
    AND e.user_id = auth.uid()
    AND (exclude_node_id IS NULL OR e.node_id <> exclude_node_id)
    AND 1 - (e.embedding <=> query_embedding) >= match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE
  ON FUNCTION public.match_brain_nodes(vector(768), INTEGER, DOUBLE PRECISION, TEXT)
  TO authenticated;
