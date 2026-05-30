-- ============================================================
-- ASSET INTELLIGENCE HUB
-- ============================================================
--
-- Upgrades Resources → Assets from a static inventory into an AI-first
-- "Asset Intelligence Hub". Adds the evidence + intelligence layers:
--
--   asset_images            → multiple visuals per asset (uploaded photos,
--                             AI-generated product images, serial/condition
--                             photos). One row may be flagged is_primary.
--   asset_documents         → many documents per asset, each tagged with a
--                             role (receipt, warranty, insurance, …) and an
--                             optional extraction confidence. Links to the
--                             existing public.documents row.
--   asset_ai_extractions    → raw AI autofill/extraction results, retained for
--                             audit + re-review (never auto-applied).
--   asset_intelligence_reports → cached output of /api/ai/assets/analyze so the
--                             expensive multi-section report is generated on
--                             demand, not on every modal open.
--
-- Plus the `asset-images` public storage bucket for generated/uploaded visuals.
--
-- Idempotent (IF NOT EXISTS / DO blocks / ON CONFLICT) so it can be re-run.

-- ------------------------------------------------------------
-- asset_images
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id    UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  storage_path TEXT,
  image_type  TEXT NOT NULL DEFAULT 'other' CHECK (
    image_type IN (
      'uploaded_product_photo',
      'generated_product_image',
      'serial_number_photo',
      'condition_photo',
      'receipt_photo',
      'other'
    )
  ),
  prompt      TEXT,
  model_used  TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_images_asset_idx
  ON public.asset_images (asset_id);
CREATE INDEX IF NOT EXISTS asset_images_user_idx
  ON public.asset_images (user_id);
-- At most one primary image per asset.
CREATE UNIQUE INDEX IF NOT EXISTS asset_images_one_primary_idx
  ON public.asset_images (asset_id)
  WHERE is_primary;

-- ------------------------------------------------------------
-- asset_documents
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id      UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_role TEXT NOT NULL DEFAULT 'other' CHECK (
    document_role IN (
      'receipt',
      'invoice',
      'warranty',
      'insurance',
      'manual',
      'maintenance',
      'appraisal',
      'resale',
      'other'
    )
  ),
  confidence    NUMERIC,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, document_id)
);

CREATE INDEX IF NOT EXISTS asset_documents_asset_idx
  ON public.asset_documents (asset_id);
CREATE INDEX IF NOT EXISTS asset_documents_user_idx
  ON public.asset_documents (user_id);

-- ------------------------------------------------------------
-- asset_ai_extractions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_ai_extractions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id      UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  source_type   TEXT NOT NULL DEFAULT 'manual_text' CHECK (
    source_type IN (
      'image',
      'pdf',
      'receipt',
      'invoice',
      'warranty',
      'insurance',
      'manual_text'
    )
  ),
  source_url    TEXT,
  extracted_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence    NUMERIC NOT NULL DEFAULT 0,
  model_used    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asset_ai_extractions_asset_idx
  ON public.asset_ai_extractions (asset_id);
CREATE INDEX IF NOT EXISTS asset_ai_extractions_user_idx
  ON public.asset_ai_extractions (user_id);

-- ------------------------------------------------------------
-- asset_intelligence_reports
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_intelligence_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id     UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  report_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_hash   TEXT,
  language     TEXT,
  model_used   TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (asset_id, language)
);

CREATE INDEX IF NOT EXISTS asset_intelligence_reports_asset_idx
  ON public.asset_intelligence_reports (asset_id);
CREATE INDEX IF NOT EXISTS asset_intelligence_reports_user_idx
  ON public.asset_intelligence_reports (user_id);

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_asset_intel_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'asset_images',
      'asset_documents',
      'asset_intelligence_reports'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I '
      || 'FOR EACH ROW EXECUTE FUNCTION public.set_asset_intel_updated_at()',
      tbl
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Row Level Security: owner-only (auth.uid() = user_id)
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'asset_images',
      'asset_documents',
      'asset_ai_extractions',
      'asset_intelligence_reports'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %1$s" ON public.%1$I', tbl);
    EXECUTE format('CREATE POLICY "Users can view own %1$s" ON public.%1$I FOR SELECT USING (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can insert own %1$s" ON public.%1$I FOR INSERT WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can update own %1$s" ON public.%1$I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
    EXECUTE format('CREATE POLICY "Users can delete own %1$s" ON public.%1$I FOR DELETE USING (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;

-- ============================================================
-- Storage bucket: asset-images
-- ============================================================
-- Public read so <img> / next/image render generated + uploaded visuals
-- without signed URLs. Objects live at `{auth.uid()}/{asset_id}/{uuid}.{ext}`,
-- and write/update/delete are scoped to the uploader via the first path
-- segment. Mirrors the `relationship-photos` / `habit-visuals` bucket pattern.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'asset-images',
  'asset-images',
  true,
  10485760,  -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Asset images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own asset images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own asset images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own asset images" ON storage.objects;

CREATE POLICY "Asset images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'asset-images');

CREATE POLICY "Users can insert own asset images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own asset images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own asset images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'asset-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
