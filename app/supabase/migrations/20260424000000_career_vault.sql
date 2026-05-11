-- Career Vault (Phase 1 MVP): file storage for resumes, bios, photos, portfolios, etc.
-- Objects live in the private `career-vault` bucket at {auth.uid()}/{category}/{uuid}_{filename}.

-- ============================================================
-- 1. career_vault_files table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  category TEXT NOT NULL CHECK (category IN (
    'resume', 'cover_letter', 'photo', 'bio',
    'portfolio', 'credential', 'reference', 'application'
  )),
  tags TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,

  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_master BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mirror other tables: auto-fill user_id from JWT on insert.
ALTER TABLE public.career_vault_files
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_career_vault_user ON public.career_vault_files(user_id);
CREATE INDEX IF NOT EXISTS idx_career_vault_category ON public.career_vault_files(user_id, category);
CREATE INDEX IF NOT EXISTS idx_career_vault_starred
  ON public.career_vault_files(user_id, is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_career_vault_master
  ON public.career_vault_files(user_id, category) WHERE is_master = true;

-- Only one "master" file per (user, category).
CREATE UNIQUE INDEX IF NOT EXISTS uidx_career_vault_master_per_category
  ON public.career_vault_files(user_id, category) WHERE is_master = true;

-- RLS
ALTER TABLE public.career_vault_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own career_vault_files" ON public.career_vault_files;
DROP POLICY IF EXISTS "Users can insert own career_vault_files" ON public.career_vault_files;
DROP POLICY IF EXISTS "Users can update own career_vault_files" ON public.career_vault_files;
DROP POLICY IF EXISTS "Users can delete own career_vault_files" ON public.career_vault_files;

CREATE POLICY "Users can view own career_vault_files"
  ON public.career_vault_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own career_vault_files"
  ON public.career_vault_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own career_vault_files"
  ON public.career_vault_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own career_vault_files"
  ON public.career_vault_files FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. career-vault storage bucket (private)
-- ============================================================

-- 25 MB limit, PDF/DOCX/images/markdown/text only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'career-vault',
  'career-vault',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/markdown',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: users can only touch files under {auth.uid()}/...
DROP POLICY IF EXISTS "Users can read own career-vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own career-vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own career-vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own career-vault files" ON storage.objects;

CREATE POLICY "Users can read own career-vault files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'career-vault'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert own career-vault files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'career-vault'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own career-vault files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'career-vault'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'career-vault'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own career-vault files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'career-vault'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
