-- Career Vault Phase 2: AI integration + Coach
-- Tables:
--   * career_profile          (structured About-Me used by the prompt compiler)
--   * user_ai_preferences     (default AI tool, prompt lang, toggles)
--   * system_prompt_templates (curated library, i18n as JSONB)
--   * user_custom_prompts     (user-authored prompts)
--   * user_prompt_favorites   (star on system templates; custom prompts use is_favorite)
--   * prompt_usage_history    (analytics; never stores compiled prompt text)

-- ============================================================
-- 1. career_profile
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  current_role TEXT,
  industry TEXT,
  years_experience SMALLINT CHECK (years_experience IS NULL OR years_experience BETWEEN 0 AND 80),
  top_skills TEXT[] NOT NULL DEFAULT '{}',
  career_goals TEXT,
  pain_points TEXT,
  target_roles TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_profile" ON public.career_profile;
CREATE POLICY "Users manage own career_profile"
  ON public.career_profile FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. user_ai_preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_ai_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  default_ai TEXT NOT NULL DEFAULT 'chatgpt' CHECK (default_ai IN (
    'chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'custom'
  )),
  custom_ai_url TEXT,
  custom_ai_name TEXT,

  -- null = follow profiles.language; otherwise hard-pin prompt output language
  prompt_language TEXT,
  auto_copy_to_clipboard BOOLEAN NOT NULL DEFAULT true,
  show_prompt_preview BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai preferences" ON public.user_ai_preferences;
CREATE POLICY "Users manage own ai preferences"
  ON public.user_ai_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. system_prompt_templates  (public read; curated by app)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'resume', 'interview', 'discovery', 'transition', 'growth', 'branding', 'application', 'other'
  )),
  icon TEXT NOT NULL,

  title_i18n JSONB NOT NULL,
  description_i18n JSONB NOT NULL,
  prompt_i18n JSONB NOT NULL,

  required_variables TEXT[] NOT NULL DEFAULT '{}',
  optional_variables TEXT[] NOT NULL DEFAULT '{}',
  attachment_categories TEXT[] NOT NULL DEFAULT '{}',

  is_premium BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_prompts_category
  ON public.system_prompt_templates(category, sort_order);

ALTER TABLE public.system_prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system templates" ON public.system_prompt_templates;
CREATE POLICY "Anyone can read system templates"
  ON public.system_prompt_templates FOR SELECT
  USING (true);

-- ============================================================
-- 4. user_custom_prompts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_custom_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  prompt_body TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💡',
  tags TEXT[] NOT NULL DEFAULT '{}',
  attachment_categories TEXT[] NOT NULL DEFAULT '{}',
  required_variables TEXT[] NOT NULL DEFAULT '{}',
  optional_variables TEXT[] NOT NULL DEFAULT '{}',

  is_favorite BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_custom_prompts
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_user_custom_prompts_user
  ON public.user_custom_prompts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_custom_prompts_favorite
  ON public.user_custom_prompts(user_id, is_favorite) WHERE is_favorite = true;

ALTER TABLE public.user_custom_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own custom prompts" ON public.user_custom_prompts;
CREATE POLICY "Users manage own custom prompts"
  ON public.user_custom_prompts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. user_prompt_favorites  (star on system templates)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_prompt_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.system_prompt_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);

ALTER TABLE public.user_prompt_favorites
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.user_prompt_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own favorites" ON public.user_prompt_favorites;
DROP POLICY IF EXISTS "Users insert own favorites" ON public.user_prompt_favorites;
DROP POLICY IF EXISTS "Users delete own favorites" ON public.user_prompt_favorites;

CREATE POLICY "Users view own favorites"
  ON public.user_prompt_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites"
  ON public.user_prompt_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own favorites"
  ON public.user_prompt_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. prompt_usage_history  (metadata only — never stores full prompt text)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prompt_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.system_prompt_templates(id) ON DELETE SET NULL,
  custom_prompt_id UUID REFERENCES public.user_custom_prompts(id) ON DELETE SET NULL,
  ai_tool TEXT NOT NULL CHECK (ai_tool IN (
    'chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'custom'
  )),
  attached_file_ids UUID[] NOT NULL DEFAULT '{}',
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT prompt_usage_history_one_source CHECK (
    (template_id IS NOT NULL AND custom_prompt_id IS NULL) OR
    (template_id IS NULL AND custom_prompt_id IS NOT NULL)
  )
);

ALTER TABLE public.prompt_usage_history
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_prompt_usage_user
  ON public.prompt_usage_history(user_id, used_at DESC);

ALTER TABLE public.prompt_usage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own usage history" ON public.prompt_usage_history;
DROP POLICY IF EXISTS "Users insert own usage history" ON public.prompt_usage_history;

CREATE POLICY "Users view own usage history"
  ON public.prompt_usage_history FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own usage history"
  ON public.prompt_usage_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
