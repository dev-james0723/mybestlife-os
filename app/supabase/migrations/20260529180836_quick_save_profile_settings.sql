ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS quick_save_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quick_save_default_destination text NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS quick_save_require_review boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_quick_save_default_destination_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_quick_save_default_destination_check
  CHECK (quick_save_default_destination IN ('review', 'knowledge', 'idea'));

-- Quick Save ideas are created from the mobile OS share sheet.
ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_source_type_check;

ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_source_type_check
  CHECK (source_type IN ('text', 'voice', 'share'));
