-- Software Vault expansion: new columns, icons storage bucket, AI autofill rate limit.
-- Preserves existing rows and legacy status/priority columns; adds spec-aligned fields
-- on top so the UI can migrate gradually.

-- 1. New columns on software_vault
ALTER TABLE public.software_vault
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated_fields TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_default_stack BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ;

-- Auto-fill user_id from JWT on insert (mirrors other tables).
ALTER TABLE public.software_vault ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_software_vault_user ON public.software_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_software_vault_category ON public.software_vault(category);
CREATE INDEX IF NOT EXISTS idx_software_vault_status ON public.software_vault(status);
CREATE INDEX IF NOT EXISTS idx_software_vault_default_stack
  ON public.software_vault(user_id) WHERE is_default_stack = true;

-- 2. Storage bucket for vault icons. Objects live at {auth.uid()}/{entry_id}.{ext}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-icons',
  'vault-icons',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Vault icons are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own vault icon" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own vault icon" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault icon" ON storage.objects;

CREATE POLICY "Vault icons are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vault-icons');

CREATE POLICY "Users can insert own vault icon"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vault-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own vault icon"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vault-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'vault-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own vault icon"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vault-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Rate limit table: one row per user per hour window
CREATE TABLE IF NOT EXISTS public.vault_autofill_rate_limit (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.vault_autofill_rate_limit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vault rate limit" ON public.vault_autofill_rate_limit;
DROP POLICY IF EXISTS "Users can upsert own vault rate limit" ON public.vault_autofill_rate_limit;

CREATE POLICY "Users can view own vault rate limit"
ON public.vault_autofill_rate_limit FOR SELECT
USING (auth.uid() = user_id);

-- The API route uses the user's JWT, so an INSERT/UPDATE policy is required for
-- the increment query to succeed. Writes are still scoped to the current user.
CREATE POLICY "Users can upsert own vault rate limit"
ON public.vault_autofill_rate_limit FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own vault rate limit" ON public.vault_autofill_rate_limit;
CREATE POLICY "Users can update own vault rate limit"
ON public.vault_autofill_rate_limit FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
