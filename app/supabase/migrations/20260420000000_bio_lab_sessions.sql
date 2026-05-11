-- Bio Lab — session history for the four "regulation toolkit" tools.
-- Currently the four tools persist client-side via zustand-persist
-- (localStorage). These tables move authoritative storage to Supabase so
-- session history survives across devices, clears, and reinstalls; the
-- localStorage cache becomes an offline buffer the client reconciles on
-- connect.
--
-- Each table:
--   * `user_id` defaults to `auth.uid()` so the repository can omit it on
--     insert (matches the grateful_things / habits / finance pattern).
--   * RLS is enabled with a single "users manage own rows" policy.
--   * `ai_assisted` + `ai_metadata` columns let the rule engine and analytics
--     layer distinguish AI-driven sessions from manual ones without schema
--     churn later.
--   * Indexes are tuned for the dominant query: "most recent N rows for the
--     current user".

-- ============================================================
-- 1. bio_lab_state_scans
-- One row per State Scan check-in.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bio_lab_state_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
  focus SMALLINT NOT NULL CHECK (focus BETWEEN 1 AND 5),
  stress SMALLINT NOT NULL CHECK (stress BETWEEN 1 AND 5),

  note TEXT NOT NULL DEFAULT '',

  -- AI inference attribution. When `ai_assisted` is true, `ai_metadata`
  -- typically contains `{ "rawInput": "...", "modelUsed": "...", "inferred": {...} }`.
  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  ai_metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_lab_state_scans
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_bio_lab_state_scans_recent
  ON public.bio_lab_state_scans(user_id, created_at DESC);

ALTER TABLE public.bio_lab_state_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bio_lab_state_scans"
  ON public.bio_lab_state_scans;
CREATE POLICY "Users manage own bio_lab_state_scans"
  ON public.bio_lab_state_scans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. bio_lab_mind_sweeps
-- One row per completed sweep. Items live in a single JSONB column —
-- the consumer always reads them as a unit (per-item edits happen in the
-- live store; the row is only written when the sweep "settles").
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bio_lab_mind_sweeps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Array of { text, kind, ai_label_confidence }. Validated at the
  -- repository boundary (Zod). Capped softly to 200 items in app code.
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  triage_insight TEXT,

  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  ai_metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_lab_mind_sweeps
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_bio_lab_mind_sweeps_recent
  ON public.bio_lab_mind_sweeps(user_id, created_at DESC);

ALTER TABLE public.bio_lab_mind_sweeps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bio_lab_mind_sweeps"
  ON public.bio_lab_mind_sweeps;
CREATE POLICY "Users manage own bio_lab_mind_sweeps"
  ON public.bio_lab_mind_sweeps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. bio_lab_focus_sprints
-- One row per completed sprint (also written when a sprint is ended early).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bio_lab_focus_sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  intention TEXT NOT NULL DEFAULT '',
  work_seconds INTEGER NOT NULL CHECK (work_seconds > 0),
  break_seconds INTEGER NOT NULL CHECK (break_seconds >= 0),

  outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'partial', 'blocked')),
  -- Self-reported focus rating from the post-sprint micro-reflection.
  focus_rating SMALLINT CHECK (focus_rating BETWEEN 1 AND 5),
  reflection_note TEXT NOT NULL DEFAULT '',

  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  ai_metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_lab_focus_sprints
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_bio_lab_focus_sprints_recent
  ON public.bio_lab_focus_sprints(user_id, created_at DESC);

ALTER TABLE public.bio_lab_focus_sprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bio_lab_focus_sprints"
  ON public.bio_lab_focus_sprints;
CREATE POLICY "Users manage own bio_lab_focus_sprints"
  ON public.bio_lab_focus_sprints FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. bio_lab_system_resets
-- One row per completed reset sequence.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bio_lab_system_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Array of { id, durationSeconds, skipped }. For static sequences the ids
  -- match SYSTEM_RESET_STEPS; for AI-adaptive sequences the AI generates
  -- step ids that the client also persists into ai_metadata for full replay.
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,

  ai_assisted BOOLEAN NOT NULL DEFAULT false,
  ai_metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bio_lab_system_resets
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_bio_lab_system_resets_recent
  ON public.bio_lab_system_resets(user_id, created_at DESC);

ALTER TABLE public.bio_lab_system_resets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bio_lab_system_resets"
  ON public.bio_lab_system_resets;
CREATE POLICY "Users manage own bio_lab_system_resets"
  ON public.bio_lab_system_resets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
