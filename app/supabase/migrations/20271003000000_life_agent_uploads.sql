-- Life Agent multimodal uploads (Phase 7).
-- Private bucket + metadata table. Files at `{user_id}/{upload_id}/{filename}`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'life-agent-uploads',
  'life-agent-uploads',
  false,
  20971520,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'application/pdf',
    'text/plain', 'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can view own life agent uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own life agent uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own life agent uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own life agent uploads" ON storage.objects;

CREATE POLICY "Users can view own life agent uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'life-agent-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert own life agent uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'life-agent-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own life agent uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'life-agent-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'life-agent-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own life agent uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'life-agent-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- life_agent_uploads
-- ============================================================

CREATE TABLE IF NOT EXISTS public.life_agent_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  upload_type text NOT NULL DEFAULT 'unknown',
  analysis_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT life_agent_uploads_upload_type_check CHECK (
    upload_type IN (
      'receipt', 'business_card', 'relationship_photo', 'asset_photo',
      'document', 'screenshot', 'text', 'unknown'
    )
  )
);

CREATE INDEX IF NOT EXISTS life_agent_uploads_user_created_idx
  ON public.life_agent_uploads (user_id, created_at DESC);

ALTER TABLE public.life_agent_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS life_agent_uploads_select_own ON public.life_agent_uploads;
DROP POLICY IF EXISTS life_agent_uploads_insert_own ON public.life_agent_uploads;
DROP POLICY IF EXISTS life_agent_uploads_update_own ON public.life_agent_uploads;
DROP POLICY IF EXISTS life_agent_uploads_delete_own ON public.life_agent_uploads;

CREATE POLICY life_agent_uploads_select_own
  ON public.life_agent_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY life_agent_uploads_insert_own
  ON public.life_agent_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY life_agent_uploads_update_own
  ON public.life_agent_uploads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY life_agent_uploads_delete_own
  ON public.life_agent_uploads FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS life_agent_uploads_touch_updated_at ON public.life_agent_uploads;
CREATE TRIGGER life_agent_uploads_touch_updated_at
  BEFORE UPDATE ON public.life_agent_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
