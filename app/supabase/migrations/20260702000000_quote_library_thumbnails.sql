-- Quote Library — automatic cinematic thumbnail backgrounds.
--
-- Adds Gemini-driven thumbnail metadata to `quotes` and provisions a
-- `quote-thumbnails` Storage bucket so every saved quote can carry its own
-- mood-aware editorial background image.
--
-- Generation flow (server-side, see `lib/quote-library/thumbnail/`):
--   1. New quote insert → `thumbnail_status = 'pending'`.
--   2. Server route flips it to `generating`, calls Gemini for analysis,
--      renders an image, uploads to Storage, then persists the public URL
--      back onto the row alongside the structured visual direction.
--   3. Failures → `failed` (or `fallback` once the deterministic CSS
--      gradient kicks in client-side). `thumbnail_error` carries the
--      detail so the UI can surface a retry button.

-- ============================================================
-- Columns on `quotes`
-- ============================================================

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_prompt TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_status TEXT
    NOT NULL DEFAULT 'pending'
    CHECK (
      thumbnail_status IN ('pending', 'generating', 'completed', 'failed', 'fallback')
    ),
  ADD COLUMN IF NOT EXISTS thumbnail_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS thumbnail_error TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_mood TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_palette JSONB,
  ADD COLUMN IF NOT EXISTS thumbnail_visual_keywords JSONB,
  ADD COLUMN IF NOT EXISTS thumbnail_provider TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_version TEXT;

-- Index used by the backfill script + the “rows still pending” admin query.
CREATE INDEX IF NOT EXISTS idx_quotes_thumbnail_status
  ON public.quotes (user_id, thumbnail_status)
  WHERE thumbnail_status IN ('pending', 'failed');


-- ============================================================
-- Storage bucket: `quote-thumbnails`
-- ============================================================
--
-- Public bucket — thumbnails ship as plain <img> backgrounds in cards, so a
-- public URL avoids the per-render signed-URL round trip. Path convention:
-- `{auth.uid()}/{quote_id}/thumbnail-v{n}.png`. Write/update/delete are
-- scoped to the uploader via the first path segment.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote-thumbnails',
  'quote-thumbnails',
  true,
  6291456,  -- 6 MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Quote thumbnails are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own quote thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own quote thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quote thumbnails" ON storage.objects;

CREATE POLICY "Quote thumbnails are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote-thumbnails');

CREATE POLICY "Users can insert own quote thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own quote thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quote-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'quote-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own quote thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-thumbnails'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
