-- Public bucket for gratitude entry photos.
-- Objects live at `{auth.uid()}/{entry_id_or_drafts}/{uuid}.{ext}`.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grateful-things-photos',
  'grateful-things-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Grateful things photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own grateful things photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own grateful things photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own grateful things photos" ON storage.objects;

CREATE POLICY "Grateful things photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'grateful-things-photos');

CREATE POLICY "Users can insert own grateful things photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'grateful-things-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own grateful things photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'grateful-things-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'grateful-things-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own grateful things photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'grateful-things-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
