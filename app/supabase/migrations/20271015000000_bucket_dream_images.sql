-- Bucket List · Phase 2 — Dream images & inspiration system.
--
-- Adds a per-dream image gallery (user uploads, AI-generated dream visuals,
-- screenshots, article/travel photos) plus a public storage bucket. Fully
-- additive: the existing `bucket_items.cover_image_url` keeps working as the
-- resolved cover, and the static catalog fallback is untouched.
--
-- RLS: auth.uid() = user_id on every row. Storage: per-user folder isolation.

-- ── 1. Flag so cover provenance is available without an extra query ──
ALTER TABLE public.bucket_items
  ADD COLUMN IF NOT EXISTS cover_image_is_ai boolean NOT NULL DEFAULT false;

-- ── 2. Image gallery table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bucket_dream_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_item_id uuid NOT NULL
    REFERENCES public.bucket_items(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text NOT NULL DEFAULT 'inspiration' CHECK (
    image_type IN (
      'cover',
      'inspiration',
      'generated_visual',
      'screenshot',
      'travel_photo',
      'memory_photo',
      'article_image',
      'other'
    )
  ),
  caption text,
  ai_caption text,
  source_type text NOT NULL DEFAULT 'uploaded' CHECK (
    source_type IN (
      'uploaded',
      'generated',
      'static_catalog',
      'external_url',
      'api'
    )
  ),
  source_url text,
  prompt text,
  model_used text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bucket_dream_images_item
  ON public.bucket_dream_images (bucket_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bucket_dream_images_user
  ON public.bucket_dream_images (user_id);
-- At most one primary image per dream.
CREATE UNIQUE INDEX IF NOT EXISTS bucket_dream_images_one_primary_idx
  ON public.bucket_dream_images (bucket_item_id) WHERE is_primary;

ALTER TABLE public.bucket_dream_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bucket_dream_images_select_own ON public.bucket_dream_images;
CREATE POLICY bucket_dream_images_select_own
  ON public.bucket_dream_images FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_images_insert_own ON public.bucket_dream_images;
CREATE POLICY bucket_dream_images_insert_own
  ON public.bucket_dream_images FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_images_update_own ON public.bucket_dream_images;
CREATE POLICY bucket_dream_images_update_own
  ON public.bucket_dream_images FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bucket_dream_images_delete_own ON public.bucket_dream_images;
CREATE POLICY bucket_dream_images_delete_own
  ON public.bucket_dream_images FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS bucket_dream_images_touch_updated_at ON public.bucket_dream_images;
CREATE TRIGGER bucket_dream_images_touch_updated_at
  BEFORE UPDATE ON public.bucket_dream_images
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── 3. Public storage bucket for uploaded + generated dream images ────────────
-- Objects live at `{auth.uid()}/{bucket_item_id_or_drafts}/{uuid}.{ext}`.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bucket-dream-images',
  'bucket-dream-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Dream images are publicly accessible" ON storage.objects;
CREATE POLICY "Dream images are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bucket-dream-images');

DROP POLICY IF EXISTS "Users can insert own dream images" ON storage.objects;
CREATE POLICY "Users can insert own dream images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bucket-dream-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own dream images" ON storage.objects;
CREATE POLICY "Users can update own dream images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bucket-dream-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'bucket-dream-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own dream images" ON storage.objects;
CREATE POLICY "Users can delete own dream images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bucket-dream-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
