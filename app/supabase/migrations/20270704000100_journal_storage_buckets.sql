-- Private buckets for journal AI media.
-- Objects live at `{auth.uid()}/{entry_id}-{timestamp}.{ext}`.
-- Access is owner-only via signed URLs (no public reads).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-illustrations',
  'journal-illustrations',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-audio',
  'journal-audio',
  false,
  20971520,
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- journal-illustrations policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own journal illustrations" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own journal illustrations" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own journal illustrations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own journal illustrations" ON storage.objects;

CREATE POLICY "Users can view own journal illustrations"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert own journal illustrations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own journal illustrations"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'journal-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own journal illustrations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-illustrations'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- journal-audio policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view own journal audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own journal audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own journal audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own journal audio" ON storage.objects;

CREATE POLICY "Users can view own journal audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert own journal audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own journal audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own journal audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-audio'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
