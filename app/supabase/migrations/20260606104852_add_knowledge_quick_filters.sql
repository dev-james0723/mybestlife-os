ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS knowledge_quick_filters JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.knowledge_quick_filters IS
  'User-customized Knowledge Base quick filter definitions, including built-in visibility/order and custom rule buttons.';
