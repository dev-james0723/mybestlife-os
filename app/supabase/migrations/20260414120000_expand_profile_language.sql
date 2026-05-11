-- Expand profiles.language allowed values (run on existing Supabase projects).
-- Fresh installs can rely on app/supabase/schema.sql instead.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_language_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'fr', 'it', 'es', 'vi'));
