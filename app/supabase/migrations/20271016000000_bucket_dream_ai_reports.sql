-- Bucket List · Phase 3 — Dream Intelligence reports.
--
-- Caches AI dream-analysis output so the Dream Intelligence Hub does not
-- regenerate on every dialog open. One row per (user, dream, report_type).
-- Additive; RLS auth.uid() = user_id.

CREATE TABLE IF NOT EXISTS public.bucket_dream_ai_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_item_id uuid NOT NULL
    REFERENCES public.bucket_items(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'dream_intelligence' CHECK (
    report_type IN (
      'dream_intelligence',
      'readiness',
      'blockers',
      'smallest_version',
      'identity_meaning'
    )
  ),
  report_json jsonb NOT NULL,
  model_used text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One cached report per type per dream.
CREATE UNIQUE INDEX IF NOT EXISTS bucket_dream_ai_reports_unique
  ON public.bucket_dream_ai_reports (user_id, bucket_item_id, report_type);
CREATE INDEX IF NOT EXISTS idx_bucket_dream_ai_reports_item
  ON public.bucket_dream_ai_reports (bucket_item_id, report_type);

ALTER TABLE public.bucket_dream_ai_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bucket_dream_ai_reports_select_own ON public.bucket_dream_ai_reports;
CREATE POLICY bucket_dream_ai_reports_select_own
  ON public.bucket_dream_ai_reports FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_ai_reports_insert_own ON public.bucket_dream_ai_reports;
CREATE POLICY bucket_dream_ai_reports_insert_own
  ON public.bucket_dream_ai_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_ai_reports_update_own ON public.bucket_dream_ai_reports;
CREATE POLICY bucket_dream_ai_reports_update_own
  ON public.bucket_dream_ai_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_ai_reports_delete_own ON public.bucket_dream_ai_reports;
CREATE POLICY bucket_dream_ai_reports_delete_own
  ON public.bucket_dream_ai_reports FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS bucket_dream_ai_reports_touch_updated_at ON public.bucket_dream_ai_reports;
CREATE TRIGGER bucket_dream_ai_reports_touch_updated_at
  BEFORE UPDATE ON public.bucket_dream_ai_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
