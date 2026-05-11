-- Public bucket for role model portrait photos.
-- Objects live at `{auth.uid()}/{role_model_id}/{uuid}.{ext}`.
--
-- Public read so <img> and next/image can render without signed URLs.
-- Write/update/delete scoped to the uploader via the first path segment.
--
-- Mirrors the `avatars` bucket pattern (20260415000000_profile_avatars_storage.sql).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'role-model-photos',
  'role-model-photos',
  true,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Role model photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own role model photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own role model photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own role model photos" ON storage.objects;

CREATE POLICY "Role model photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'role-model-photos');

CREATE POLICY "Users can insert own role model photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'role-model-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own role model photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'role-model-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'role-model-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own role model photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'role-model-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
