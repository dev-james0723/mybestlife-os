ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS idea_quick_filters JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.idea_quick_filters IS
  'Profile-synced Idea Capture quick filter definitions and rule-builder preferences.';
