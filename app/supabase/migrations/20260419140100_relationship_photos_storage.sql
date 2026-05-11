-- Public bucket for relationship person-photos.
-- Objects live at `{auth.uid()}/{relationship_id_or_draft}/{uuid}.{ext}`.
--
-- Public read so <img> and next/image can render without signed URLs.
-- Write/update/delete scoped to the uploader via the first path segment.
--
-- Mirrors the `role-model-photos` bucket pattern
-- (20260620110000_role_model_photos_storage.sql).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'relationship-photos',
  'relationship-photos',
  true,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Relationship photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own relationship photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own relationship photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own relationship photos" ON storage.objects;

CREATE POLICY "Relationship photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'relationship-photos');

CREATE POLICY "Users can insert own relationship photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'relationship-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own relationship photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'relationship-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'relationship-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own relationship photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'relationship-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
