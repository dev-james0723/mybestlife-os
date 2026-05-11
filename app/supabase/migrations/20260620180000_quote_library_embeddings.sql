-- Quote Library — pgvector embeddings + semantic match RPC (Phase 5).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW index for sub-linear cosine-similarity retrieval. Self-building;
-- no post-insert training step required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_quotes_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX idx_quotes_embedding_hnsw ON public.quotes USING hnsw (embedding vector_cosine_ops)';
  END IF;
END $$;

-- Resonance matching — respects RLS because SECURITY INVOKER + auth.uid().
CREATE OR REPLACE FUNCTION public.match_quotes(
  query_embedding vector(768),
  match_count INTEGER DEFAULT 10,
  match_threshold DOUBLE PRECISION DEFAULT 0.15
)
RETURNS TABLE (
  id UUID,
  quote_text TEXT,
  source_author TEXT,
  category TEXT,
  emotion_tone TEXT,
  is_favorite BOOLEAN,
  similarity DOUBLE PRECISION
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  SELECT
    q.id,
    q.quote_text,
    q.source_author,
    q.category,
    q.emotion_tone,
    q.is_favorite,
    1 - (q.embedding <=> query_embedding) AS similarity
  FROM public.quotes q
  WHERE q.embedding IS NOT NULL
    AND q.user_id = auth.uid()
    AND 1 - (q.embedding <=> query_embedding) >= match_threshold
  ORDER BY q.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_quotes(vector(768), INTEGER, DOUBLE PRECISION) TO authenticated;
