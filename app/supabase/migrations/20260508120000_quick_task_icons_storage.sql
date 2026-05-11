-- App-style quick task icons (Gemini-generated, liquid glass look). Path: {user_id}/{slug}.ext
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quick-task-icons',
  'quick-task-icons',
  true,
  2097152,
  ARRAY['image/png', 'image/webp', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Quick task icons are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own quick task icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own quick task icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quick task icons" ON storage.objects;

CREATE POLICY "Quick task icons are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quick-task-icons');

CREATE POLICY "Users can insert own quick task icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quick-task-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own quick task icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quick-task-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'quick-task-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own quick task icons"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quick-task-icons'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
