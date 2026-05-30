CREATE TABLE IF NOT EXISTS public.quick_save_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  text text,
  url text,
  normalized_url text,
  file_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  destination text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quick_save_captures_status_check
    CHECK (status IN ('pending', 'saved', 'discarded', 'failed')),
  CONSTRAINT quick_save_captures_destination_check
    CHECK (destination IS NULL OR destination IN ('knowledge', 'idea'))
);

ALTER TABLE public.quick_save_captures
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS normalized_url text,
  ADD COLUMN IF NOT EXISTS file_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.quick_save_captures
  DROP CONSTRAINT IF EXISTS quick_save_captures_status_check,
  DROP CONSTRAINT IF EXISTS quick_save_captures_destination_check;

ALTER TABLE public.quick_save_captures
  ADD CONSTRAINT quick_save_captures_status_check
    CHECK (status IN ('pending', 'saved', 'discarded', 'failed')),
  ADD CONSTRAINT quick_save_captures_destination_check
    CHECK (destination IS NULL OR destination IN ('knowledge', 'idea'));

CREATE INDEX IF NOT EXISTS quick_save_captures_user_created_idx
  ON public.quick_save_captures (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS quick_save_captures_user_status_idx
  ON public.quick_save_captures (user_id, status);

ALTER TABLE public.quick_save_captures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quick_save_captures_select_own ON public.quick_save_captures;
DROP POLICY IF EXISTS quick_save_captures_insert_own ON public.quick_save_captures;
DROP POLICY IF EXISTS quick_save_captures_update_own ON public.quick_save_captures;
DROP POLICY IF EXISTS quick_save_captures_delete_own ON public.quick_save_captures;

CREATE POLICY quick_save_captures_select_own
  ON public.quick_save_captures
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY quick_save_captures_insert_own
  ON public.quick_save_captures
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY quick_save_captures_update_own
  ON public.quick_save_captures
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY quick_save_captures_delete_own
  ON public.quick_save_captures
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS quick_save_captures_touch_updated_at
  ON public.quick_save_captures;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER quick_save_captures_touch_updated_at
  BEFORE UPDATE ON public.quick_save_captures
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('knowledge-files', 'knowledge-files', false, 1073741824, NULL)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = greatest(
    coalesce(storage.buckets.file_size_limit, 0),
    excluded.file_size_limit
  ),
  allowed_mime_types = NULL;

DROP POLICY IF EXISTS "Users can read own quick-save files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own quick-save files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own quick-save files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quick-save files" ON storage.objects;

CREATE POLICY "Users can read own quick-save files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = 'quick-save'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

CREATE POLICY "Users can upload own quick-save files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = 'quick-save'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

CREATE POLICY "Users can update own quick-save files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = 'quick-save'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = 'quick-save'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

CREATE POLICY "Users can delete own quick-save files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = 'quick-save'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );
