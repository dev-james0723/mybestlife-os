-- AI Career Mirror (WS1): Setup wizard, AI diagnosis, banner art & memory.
--
-- Extends existing career_profile with the data foundation for the Career
-- Mirror experience (setup wizard state, AI summary/diagnosis/next actions,
-- identity & positioning, personality & work-style, environment fit,
-- transition planning, and personal-brand / banner assets).
--
-- Tables added:
--   * career_weekly_reviews  (one structured AI review per user per week)
--   * career_scenarios       (saved "what-if" career simulations)
--   * career_memory          (append-only log of mirror observations)
--   * career_prompt_packs     (generated prompt bundles for the user)
--
-- A public `career-banners` Storage bucket backs AI-generated banner art.
--
-- All ALTER TABLE calls are idempotent (IF NOT EXISTS) so this migration is
-- safe to re-run. New tables enforce RLS (owner-only CRUD).

-- ============================================================
-- 1. Extend career_profile for the Career Mirror
-- ============================================================

ALTER TABLE public.career_profile
  ADD COLUMN IF NOT EXISTS setup_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (setup_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS setup_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_score SMALLINT CHECK (
    completion_score IS NULL OR (completion_score BETWEEN 0 AND 100)
  ),
  ADD COLUMN IF NOT EXISTS missing_fields TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_diagnosis JSONB,
  ADD COLUMN IF NOT EXISTS ai_next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_reframed_problem TEXT,
  ADD COLUMN IF NOT EXISTS career_identity TEXT,
  ADD COLUMN IF NOT EXISTS career_stage TEXT,
  ADD COLUMN IF NOT EXISTS current_status_summary TEXT,
  ADD COLUMN IF NOT EXISTS motivation_drivers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ambition_style TEXT,
  ADD COLUMN IF NOT EXISTS desired_reputation TEXT,
  ADD COLUMN IF NOT EXISTS visibility_goal TEXT,
  ADD COLUMN IF NOT EXISTS personal_brand_strategy TEXT,
  ADD COLUMN IF NOT EXISTS content_strategy_direction TEXT,
  ADD COLUMN IF NOT EXISTS self_reported_personality_type TEXT,
  ADD COLUMN IF NOT EXISTS work_energy_pattern TEXT,
  ADD COLUMN IF NOT EXISTS work_style_profile JSONB,
  ADD COLUMN IF NOT EXISTS decision_style TEXT,
  ADD COLUMN IF NOT EXISTS feedback_preference TEXT,
  ADD COLUMN IF NOT EXISTS preferred_mentor_style TEXT,
  ADD COLUMN IF NOT EXISTS ideal_work_environment TEXT,
  ADD COLUMN IF NOT EXISTS culture_fit TEXT,
  ADD COLUMN IF NOT EXISTS organizational_triggers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS transition_type TEXT,
  ADD COLUMN IF NOT EXISTS transition_timeline TEXT,
  ADD COLUMN IF NOT EXISTS blocker_category TEXT,
  ADD COLUMN IF NOT EXISTS risk_factors TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS career_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS career_banner_prompt TEXT,
  ADD COLUMN IF NOT EXISTS career_banner_style TEXT,
  ADD COLUMN IF NOT EXISTS career_banner_status TEXT NOT NULL DEFAULT 'none'
    CHECK (career_banner_status IN ('none', 'pending', 'generating', 'completed', 'failed', 'fallback')),
  ADD COLUMN IF NOT EXISTS career_banner_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS personal_brand_assets JSONB NOT NULL DEFAULT '{}'::jsonb;

-- No new RLS needed — career_profile already enforces owner-only policy.


-- ============================================================
-- 2. Storage bucket: `career-banners`
-- ============================================================
--
-- Public bucket — banners ship as plain <img> backgrounds on the mirror
-- header, so a public URL avoids the per-render signed-URL round trip. Path
-- convention: `{auth.uid()}/banner-v{n}.png`. Write/update/delete are scoped
-- to the uploader via the first path segment.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-banners',
  'career-banners',
  true,
  6291456,  -- 6 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Career banners are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own career banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own career banners" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own career banners" ON storage.objects;

CREATE POLICY "Career banners are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'career-banners');

CREATE POLICY "Users can insert own career banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'career-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own career banners"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'career-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'career-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own career banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'career-banners'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- 3. career_weekly_reviews
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  week_start DATE NOT NULL,
  review JSONB NOT NULL,
  model_used TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, week_start)
);

ALTER TABLE public.career_weekly_reviews ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user_week
  ON public.career_weekly_reviews(user_id, week_start DESC);

ALTER TABLE public.career_weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_weekly_reviews" ON public.career_weekly_reviews;
CREATE POLICY "Users manage own career_weekly_reviews"
  ON public.career_weekly_reviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 4. career_scenarios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_scenarios ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_scenarios_user_date
  ON public.career_scenarios(user_id, created_at DESC);

ALTER TABLE public.career_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_scenarios" ON public.career_scenarios;
CREATE POLICY "Users manage own career_scenarios"
  ON public.career_scenarios FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 5. career_memory (append-only log)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  kind TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_memory ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_memory_user_date
  ON public.career_memory(user_id, created_at DESC);

ALTER TABLE public.career_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_memory" ON public.career_memory;
CREATE POLICY "Users manage own career_memory"
  ON public.career_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 6. career_prompt_packs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_prompt_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT,
  prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_for JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_prompt_packs ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_prompt_packs_user_date
  ON public.career_prompt_packs(user_id, created_at DESC);

ALTER TABLE public.career_prompt_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_prompt_packs" ON public.career_prompt_packs;
CREATE POLICY "Users manage own career_prompt_packs"
  ON public.career_prompt_packs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
