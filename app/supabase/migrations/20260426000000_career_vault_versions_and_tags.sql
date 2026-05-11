-- Career Vault Phase 3: version history + retention + AI analysis toggle.
-- This migration is additive; it does not touch Phase 1/2 data or policies.

-- ============================================================
-- 1. career_vault_files: current_version column
-- ============================================================

ALTER TABLE public.career_vault_files
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1;

-- ============================================================
-- 2. career_vault_file_versions table
-- Archived copies of previous file bytes. The "current" version is
-- implicit: it lives on career_vault_files (current_version column).
-- Only past versions are stored here.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_vault_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.career_vault_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  change_note TEXT,
  -- { "filename": { "from": "...", "to": "..." }, "category": {...} }
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (file_id, version_number)
);

-- Mirror other tables: auto-fill user_id from JWT on insert.
ALTER TABLE public.career_vault_file_versions
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_vault_versions_file
  ON public.career_vault_file_versions(file_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_vault_versions_user
  ON public.career_vault_file_versions(user_id, created_at DESC);

ALTER TABLE public.career_vault_file_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vault versions" ON public.career_vault_file_versions;
DROP POLICY IF EXISTS "Users can insert own vault versions" ON public.career_vault_file_versions;
DROP POLICY IF EXISTS "Users can delete own vault versions" ON public.career_vault_file_versions;

CREATE POLICY "Users can view own vault versions"
  ON public.career_vault_file_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault versions"
  ON public.career_vault_file_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vault versions"
  ON public.career_vault_file_versions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. user_ai_preferences: retention limit + AI analysis toggle
-- ============================================================

ALTER TABLE public.user_ai_preferences
  ADD COLUMN IF NOT EXISTS version_retention_limit INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS allow_ai_analysis BOOLEAN NOT NULL DEFAULT true;

-- Sanity bounds (1..1000). 0 would defeat the versioning feature entirely,
-- and unbounded limits are capped to protect storage.
ALTER TABLE public.user_ai_preferences
  DROP CONSTRAINT IF EXISTS user_ai_preferences_retention_limit_check;

ALTER TABLE public.user_ai_preferences
  ADD CONSTRAINT user_ai_preferences_retention_limit_check
  CHECK (version_retention_limit BETWEEN 1 AND 1000);
