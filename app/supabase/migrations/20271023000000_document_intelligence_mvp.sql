-- Document Intelligence MVP (candidate only).
--
-- This repository already contains migrations dated through 2027-10-22.
-- Although this migration was generated with `supabase migration new` on
-- 2026-09-03, it is intentionally ordered after those files so the stricter
-- asset_documents policies below are the final policies applied. In
-- particular, 20271001000000_asset_intelligence_hub.sql creates the same
-- relation with user_id-only policies; this migration replaces those policies
-- with ownership checks against both referenced rows.
--
-- No database is changed by this file until it is explicitly applied.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- documents: uploaded-file and AI processing metadata
-- ============================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS source_kind TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS original_file_name TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS ai_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Backfill only the new non-null metadata fields. Existing document records
-- remain manual records and are not made to look like uploaded files.
UPDATE public.documents
SET source_kind = 'manual'
WHERE source_kind IS NULL;

UPDATE public.documents
SET ai_status = 'not_requested'
WHERE ai_status IS NULL;

UPDATE public.documents
SET ai_metadata = '{}'::JSONB
WHERE ai_metadata IS NULL;

ALTER TABLE public.documents
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN source_kind SET DEFAULT 'manual',
  ALTER COLUMN source_kind SET NOT NULL,
  ALTER COLUMN ai_status SET DEFAULT 'not_requested',
  ALTER COLUMN ai_status SET NOT NULL,
  ALTER COLUMN ai_metadata SET DEFAULT '{}'::JSONB,
  ALTER COLUMN ai_metadata SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_source_kind_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_source_kind_check
      CHECK (
        source_kind IN (
          'manual',
          'upload',
          'external_link',
          'knowledge',
          'camera_scan'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_storage_pair_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_storage_pair_check
      CHECK ((storage_bucket IS NULL) = (storage_path IS NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_storage_path_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_storage_path_check
      CHECK (
        storage_path IS NULL
        OR (
          BTRIM(storage_path) <> ''
          AND storage_path !~ '(^/|(^|/)\.\.(/|$))'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_storage_bucket_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_storage_bucket_check
      CHECK (
        storage_bucket IS NULL
        OR storage_bucket = 'document-files'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_document_file_owner_path_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_document_file_owner_path_check
      CHECK (
        storage_bucket IS DISTINCT FROM 'document-files'
        OR storage_path LIKE user_id::TEXT || '/_%'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_upload_source_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_upload_source_check
      CHECK (
        source_kind NOT IN ('upload', 'camera_scan')
        OR (
          storage_bucket = 'document-files'
          AND storage_path IS NOT NULL
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_external_link_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_external_link_check
      CHECK (
        source_kind <> 'external_link'
        OR (
          file_url IS NOT NULL
          AND file_url ~* '^https?://'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_file_size_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_file_size_check
      CHECK (
        file_size IS NULL
        OR (
          file_size >= 0
          AND (
            storage_bucket IS DISTINCT FROM 'document-files'
            OR file_size <= 26214400
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_ai_status_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_ai_status_check
      CHECK (ai_status IN ('not_requested', 'skipped', 'complete', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_ai_confidence_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_ai_confidence_check
      CHECK (ai_confidence IS NULL OR ai_confidence BETWEEN 0 AND 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.documents'::REGCLASS
      AND conname = 'documents_ai_metadata_object_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_ai_metadata_object_check
      CHECK (JSONB_TYPEOF(ai_metadata) = 'object');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS documents_user_id_idx
  ON public.documents (user_id);

CREATE INDEX IF NOT EXISTS documents_user_source_kind_idx
  ON public.documents (user_id, source_kind);

CREATE INDEX IF NOT EXISTS documents_user_ai_status_idx
  ON public.documents (user_id, ai_status);

CREATE INDEX IF NOT EXISTS documents_user_expiration_idx
  ON public.documents (user_id, expiration_date)
  WHERE expiration_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_user_storage_object_idx
  ON public.documents (user_id, storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

-- A stored object is owned by exactly one Document record. Besides matching
-- the delete lifecycle, this makes a retried save after an ambiguous network
-- response fail closed instead of creating two records for the same file.
CREATE UNIQUE INDEX IF NOT EXISTS documents_storage_object_unique_idx
  ON public.documents (storage_bucket, storage_path)
  WHERE storage_path IS NOT NULL;

-- ============================================================
-- document_intake_uploads: durable direct-upload reservations
-- ============================================================
--
-- The browser uploads to one signed, owner-scoped object path instead of
-- sending the file through a Vercel Function. Keeping the reservation after a
-- cancellation closes the upload-versus-delete race; stale uncommitted rows
-- are swept opportunistically by the intake API.

CREATE TABLE IF NOT EXISTS public.document_intake_uploads (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'document-files',
  storage_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_intake_uploads_bucket_check
    CHECK (storage_bucket = 'document-files'),
  CONSTRAINT document_intake_uploads_status_check
    CHECK (status IN ('pending', 'uploading', 'uploaded', 'cancelled')),
  CONSTRAINT document_intake_uploads_owner_path_check
    CHECK (
      storage_path LIKE user_id::TEXT || '/' || id::TEXT || '/%'
      AND storage_path !~ '(^/|(^|/)\.\.(/|$))'
    )
);

CREATE INDEX IF NOT EXISTS document_intake_uploads_user_updated_idx
  ON public.document_intake_uploads (user_id, updated_at);

ALTER TABLE public.document_intake_uploads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.document_intake_uploads FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.document_intake_uploads
  TO authenticated;

DROP POLICY IF EXISTS document_intake_uploads_select_own
  ON public.document_intake_uploads;
DROP POLICY IF EXISTS document_intake_uploads_insert_own
  ON public.document_intake_uploads;
DROP POLICY IF EXISTS document_intake_uploads_update_own
  ON public.document_intake_uploads;
DROP POLICY IF EXISTS document_intake_uploads_delete_own
  ON public.document_intake_uploads;

CREATE POLICY document_intake_uploads_select_own
  ON public.document_intake_uploads
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY document_intake_uploads_insert_own
  ON public.document_intake_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY document_intake_uploads_update_own
  ON public.document_intake_uploads
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY document_intake_uploads_delete_own
  ON public.document_intake_uploads
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================
-- document-files: private, owner-scoped document storage
-- ============================================================
--
-- Object names must be `{auth.uid()}/...`. Bucket MIME checks are only the
-- first validation layer; the API must still validate extension, MIME, and
-- file signature before processing. XLSX/PPTX/RTF/OpenDocument/TIFF/BMP are
-- accepted for private storage but are storage-only in this MVP.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'document-files',
  'document-files',
  false,
  26214400, -- 25 MiB
  ARRAY[
    -- Full MVP processing support.
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    -- Storage-only in the MVP.
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/rtf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
    'image/tiff',
    'image/bmp',
    'image/x-ms-bmp'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS document_files_select_own ON storage.objects;
DROP POLICY IF EXISTS document_files_insert_own ON storage.objects;
DROP POLICY IF EXISTS document_files_update_own ON storage.objects;
DROP POLICY IF EXISTS document_files_delete_own ON storage.objects;

CREATE POLICY document_files_select_own
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'document-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY document_files_insert_own
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'document-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY document_files_update_own
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'document-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  )
  WITH CHECK (
    bucket_id = 'document-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

CREATE POLICY document_files_delete_own
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'document-files'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- ============================================================
-- asset_documents: secure many-to-many evidence links
-- ============================================================

CREATE TABLE IF NOT EXISTS public.asset_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL
    REFERENCES public.assets(id) ON DELETE CASCADE,
  document_id UUID NOT NULL
    REFERENCES public.documents(id) ON DELETE CASCADE,
  document_role TEXT NOT NULL DEFAULT 'other',
  confidence NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT asset_documents_asset_id_document_id_key
    UNIQUE (asset_id, document_id),
  CONSTRAINT asset_documents_document_role_check
    CHECK (
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
  CONSTRAINT asset_documents_confidence_check
    CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1)
);

ALTER TABLE public.asset_documents
  ALTER COLUMN user_id SET DEFAULT auth.uid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.asset_documents'::REGCLASS
      AND conname = 'asset_documents_confidence_check'
  ) THEN
    ALTER TABLE public.asset_documents
      ADD CONSTRAINT asset_documents_confidence_check
      CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS asset_documents_asset_idx
  ON public.asset_documents (asset_id);

CREATE INDEX IF NOT EXISTS asset_documents_document_idx
  ON public.asset_documents (document_id);

CREATE INDEX IF NOT EXISTS asset_documents_user_idx
  ON public.asset_documents (user_id);

CREATE OR REPLACE FUNCTION public.set_document_intelligence_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_intake_uploads_updated_at
  ON public.document_intake_uploads;

CREATE TRIGGER trg_document_intake_uploads_updated_at
  BEFORE UPDATE ON public.document_intake_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_intelligence_updated_at();

DROP TRIGGER IF EXISTS trg_asset_documents_updated_at
  ON public.asset_documents;

CREATE TRIGGER trg_asset_documents_updated_at
  BEFORE UPDATE ON public.asset_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_intelligence_updated_at();

-- A successful document insert/update atomically consumes an uploaded
-- reservation. Cancellation and commit contend for the same row lock, so a
-- cancelled object cannot be committed and a committed object cannot later be
-- removed by temporary-upload cleanup.
CREATE OR REPLACE FUNCTION public.commit_document_intake_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.storage_bucket IS NOT DISTINCT FROM OLD.storage_bucket
    AND NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path
  THEN
    RETURN NEW;
  END IF;

  IF NEW.storage_bucket = 'document-files' AND NEW.storage_path IS NOT NULL THEN
    DELETE FROM public.document_intake_uploads
    WHERE user_id = NEW.user_id
      AND storage_path = NEW.storage_path
      AND status = 'uploaded';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Document upload reservation is missing or cancelled.'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.commit_document_intake_upload() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_documents_commit_intake_upload
  ON public.documents;

CREATE TRIGGER trg_documents_commit_intake_upload
  AFTER INSERT OR UPDATE OF storage_bucket, storage_path
  ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.commit_document_intake_upload();

ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

-- Keep signed-out clients entirely outside this private relation, then grant
-- only the CRUD operations required by the authenticated application.
REVOKE ALL ON TABLE public.asset_documents FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.asset_documents
  TO authenticated;

-- Remove the earlier user_id-only policies before installing relationship
-- policies. PostgreSQL permissive policies combine with OR, so leaving the old
-- policies in place would weaken the parent-row ownership checks below.
DROP POLICY IF EXISTS "Users can view own asset_documents"
  ON public.asset_documents;
DROP POLICY IF EXISTS "Users can insert own asset_documents"
  ON public.asset_documents;
DROP POLICY IF EXISTS "Users can update own asset_documents"
  ON public.asset_documents;
DROP POLICY IF EXISTS "Users can delete own asset_documents"
  ON public.asset_documents;

DROP POLICY IF EXISTS asset_documents_select_owned_relations
  ON public.asset_documents;
DROP POLICY IF EXISTS asset_documents_insert_owned_relations
  ON public.asset_documents;
DROP POLICY IF EXISTS asset_documents_update_owned_relations
  ON public.asset_documents;
DROP POLICY IF EXISTS asset_documents_delete_owned_relations
  ON public.asset_documents;

CREATE POLICY asset_documents_select_owned_relations
  ON public.asset_documents
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assets AS owned_asset
      WHERE owned_asset.id = asset_documents.asset_id
        AND owned_asset.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.documents AS owned_document
      WHERE owned_document.id = asset_documents.document_id
        AND owned_document.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY asset_documents_insert_owned_relations
  ON public.asset_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assets AS owned_asset
      WHERE owned_asset.id = asset_documents.asset_id
        AND owned_asset.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.documents AS owned_document
      WHERE owned_document.id = asset_documents.document_id
        AND owned_document.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY asset_documents_update_owned_relations
  ON public.asset_documents
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assets AS owned_asset
      WHERE owned_asset.id = asset_documents.asset_id
        AND owned_asset.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.documents AS owned_document
      WHERE owned_document.id = asset_documents.document_id
        AND owned_document.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assets AS owned_asset
      WHERE owned_asset.id = asset_documents.asset_id
        AND owned_asset.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.documents AS owned_document
      WHERE owned_document.id = asset_documents.document_id
        AND owned_document.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY asset_documents_delete_owned_relations
  ON public.asset_documents
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.assets AS owned_asset
      WHERE owned_asset.id = asset_documents.asset_id
        AND owned_asset.user_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1
      FROM public.documents AS owned_document
      WHERE owned_document.id = asset_documents.document_id
        AND owned_document.user_id = (SELECT auth.uid())
    )
  );
