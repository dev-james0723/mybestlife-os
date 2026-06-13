ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS knowledge_command_light_opacity integer NOT NULL DEFAULT 82;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_knowledge_command_light_opacity_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_knowledge_command_light_opacity_check
  CHECK (knowledge_command_light_opacity BETWEEN 0 AND 100);

COMMENT ON COLUMN public.profiles.knowledge_command_light_opacity IS
  'Profile-synced Knowledge Base command-button gradient-wave opacity, from 0 (off) to 100 (vivid).';
