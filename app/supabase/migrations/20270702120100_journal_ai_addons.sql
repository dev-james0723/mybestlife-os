-- Journal AI add-ons: structured fields, reflection JSON, audio script, storage bucket.

ALTER TABLE public.journal_entries
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.journal_entries
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS primary_emotion TEXT,
  ADD COLUMN IF NOT EXISTS secondary_emotion TEXT,
  ADD COLUMN IF NOT EXISTS intensity SMALLINT CHECK (intensity IS NULL OR intensity BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS target TEXT,
  ADD COLUMN IF NOT EXISTS bullets TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS self_story TEXT,
  ADD COLUMN IF NOT EXISTS next_tiny_step TEXT,
  ADD COLUMN IF NOT EXISTS appreciation TEXT,
  ADD COLUMN IF NOT EXISTS topic_extras JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS context_factors JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_reflection JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_audio_script TEXT,
  ADD COLUMN IF NOT EXISTS ai_audio_quotes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_illustration_style TEXT DEFAULT 'symbolic_cinematic',
  ADD COLUMN IF NOT EXISTS ai_illustration_symbolic_ratio SMALLINT DEFAULT 70 CHECK (
    ai_illustration_symbolic_ratio BETWEEN 0 AND 100
  );

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete own journal_entries" ON public.journal_entries;

CREATE POLICY "Users can view own journal_entries"
ON public.journal_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal_entries"
ON public.journal_entries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal_entries"
ON public.journal_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal_entries"
ON public.journal_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'journal-media',
  'journal-media',
  true,
  15728640,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/mp3', 'audio/wav']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Journal media are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own journal media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own journal media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own journal media" ON storage.objects;

CREATE POLICY "Journal media are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'journal-media');

CREATE POLICY "Users can insert own journal media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'journal-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own journal media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'journal-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'journal-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own journal media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'journal-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
