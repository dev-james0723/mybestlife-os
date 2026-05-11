-- AI insights cache (habits + Bio Lab Gemini features).
-- Some deployments applied partial migrations; if `ai_insights` was never created,
-- Weekly Insight and other cached AI routes fail on upsert. This migration is
-- idempotent (CREATE IF NOT EXISTS + DROP POLICY IF EXISTS).

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  kind TEXT NOT NULL,

  target_kind TEXT,
  target_id UUID,

  input_hash TEXT NOT NULL,

  content_json JSONB,
  content_text TEXT,

  language TEXT NOT NULL,
  model_used TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, kind, input_hash, language)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_target
  ON public.ai_insights(user_id, kind, target_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_recent
  ON public.ai_insights(user_id, kind, created_at DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_insights" ON public.ai_insights;
CREATE POLICY "Users manage own ai_insights"
  ON public.ai_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_insights ALTER COLUMN user_id SET DEFAULT auth.uid();
