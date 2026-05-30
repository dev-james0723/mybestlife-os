-- App-wide VoxCPM TTS preferences and user-owned voice reference samples.

CREATE TABLE IF NOT EXISTS public.user_tts_voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'reference_clone'
    CHECK (kind IN ('reference_clone')),
  reference_storage_path text NOT NULL,
  reference_transcript text,
  consent_confirmed_at timestamptz NOT NULL,
  sample_duration_seconds integer
    CHECK (sample_duration_seconds IS NULL OR sample_duration_seconds BETWEEN 1 AND 600),
  mime_type text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_tts_voice_profiles_user_status_idx
  ON public.user_tts_voice_profiles (user_id, status, created_at DESC);

ALTER TABLE public.user_tts_voice_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tts_voice_profiles_select_own
  ON public.user_tts_voice_profiles;
CREATE POLICY user_tts_voice_profiles_select_own
  ON public.user_tts_voice_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_tts_voice_profiles_insert_own
  ON public.user_tts_voice_profiles;
CREATE POLICY user_tts_voice_profiles_insert_own
  ON public.user_tts_voice_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_tts_voice_profiles_update_own
  ON public.user_tts_voice_profiles;
CREATE POLICY user_tts_voice_profiles_update_own
  ON public.user_tts_voice_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_tts_voice_profiles_delete_own
  ON public.user_tts_voice_profiles;
CREATE POLICY user_tts_voice_profiles_delete_own
  ON public.user_tts_voice_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_tts_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'voxcpm'
    CHECK (provider IN ('voxcpm')),
  voice_mode text NOT NULL DEFAULT 'preset'
    CHECK (voice_mode IN ('preset', 'reference_clone')),
  preset_id text NOT NULL DEFAULT 'calm_hk_cantonese_female',
  active_voice_profile_id uuid REFERENCES public.user_tts_voice_profiles (id)
    ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tts_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_tts_preferences_select_own
  ON public.user_tts_preferences;
CREATE POLICY user_tts_preferences_select_own
  ON public.user_tts_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_tts_preferences_insert_own
  ON public.user_tts_preferences;
CREATE POLICY user_tts_preferences_insert_own
  ON public.user_tts_preferences FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      active_voice_profile_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.user_tts_voice_profiles profile
        WHERE profile.id = active_voice_profile_id
          AND profile.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS user_tts_preferences_update_own
  ON public.user_tts_preferences;
CREATE POLICY user_tts_preferences_update_own
  ON public.user_tts_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      active_voice_profile_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.user_tts_voice_profiles profile
        WHERE profile.id = active_voice_profile_id
          AND profile.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS user_tts_preferences_delete_own
  ON public.user_tts_preferences;
CREATE POLICY user_tts_preferences_delete_own
  ON public.user_tts_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_tts_voice_profiles_touch_updated_at
  ON public.user_tts_voice_profiles;
CREATE TRIGGER user_tts_voice_profiles_touch_updated_at
  BEFORE UPDATE ON public.user_tts_voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS user_tts_preferences_touch_updated_at
  ON public.user_tts_preferences;
CREATE TRIGGER user_tts_preferences_touch_updated_at
  BEFORE UPDATE ON public.user_tts_preferences
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

DROP POLICY IF EXISTS "Users can read own tts voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own tts voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own tts voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own tts voice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own knowledge-files root" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own knowledge-files root" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own knowledge-files root" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own knowledge-files root" ON storage.objects;

CREATE POLICY "Users can read own knowledge-files root"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can upload own knowledge-files root"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can update own knowledge-files root"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can delete own knowledge-files root"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
  );

CREATE POLICY "Users can read own tts voice files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND (storage.foldername(name))[2] = 'tts'
  );

CREATE POLICY "Users can upload own tts voice files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND (storage.foldername(name))[2] = 'tts'
  );

CREATE POLICY "Users can update own tts voice files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND (storage.foldername(name))[2] = 'tts'
  )
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND (storage.foldername(name))[2] = 'tts'
  );

CREATE POLICY "Users can delete own tts voice files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'knowledge-files'
    AND (storage.foldername(name))[1] = (select auth.uid())::text
    AND (storage.foldername(name))[2] = 'tts'
  );
