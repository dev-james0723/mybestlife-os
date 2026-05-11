-- AI Knowledge — prompt library + personal prompts (parallel to Career Coach).
--
-- Tables:
--   * ai_prompt_categories         (2-level taxonomy: top-level + optional subcategory)
--   * ai_prompt_library            (curated library, seeded from awesome-prompts)
--   * ai_user_prompts              (user-authored / forked prompts)
--   * ai_prompt_favorites          (user favorites on library prompts)
--   * ai_prompt_runs               (per-execution audit + "re-run" history)
--
-- Conventions:
--   * Additive-only: Career Coach tables (`system_prompt_templates`, `user_custom_prompts`,
--     `user_prompt_favorites`, `prompt_usage_history`) are NOT modified or dropped. A
--     read-only backfill copies their rows into the new AI Knowledge tables so Phase 1
--     starts with preserved data. Future phases may deprecate the old tables explicitly.
--   * Canonical variable syntax in prompt bodies is `{variable}` (single braces).
--   * i18n strings are JSONB with required `en` key; additional locales optional and fall
--     back to English in the client.

-- ============================================================
-- 1. ai_prompt_categories
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  parent_slug TEXT REFERENCES public.ai_prompt_categories(slug) ON DELETE SET NULL,
  top_category TEXT NOT NULL CHECK (top_category IN (
    'writing_content',
    'productivity_planning',
    'coding_development',
    'research_analysis',
    'business_strategy',
    'learning_education',
    'career_professional',
    'life_personal_growth',
    'arts_creative',
    'language_learning',
    'expert_personas',
    'meta_prompt_engineering'
  )),
  name_i18n JSONB NOT NULL,
  description_i18n JSONB,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_prompt_categories_name_i18n_has_en CHECK (
    name_i18n ? 'en'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_categories_top
  ON public.ai_prompt_categories(top_category, sort_order);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_categories_parent
  ON public.ai_prompt_categories(parent_slug);

ALTER TABLE public.ai_prompt_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ai_prompt_categories" ON public.ai_prompt_categories;
CREATE POLICY "Anyone can read ai_prompt_categories"
  ON public.ai_prompt_categories FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE policies: writes restricted to service role via seed script.

-- Seed the 12 curated top-level categories so prompts can FK them from day one.
-- Idempotent via ON CONFLICT (slug).
INSERT INTO public.ai_prompt_categories (slug, parent_slug, top_category, name_i18n, description_i18n, icon, sort_order)
VALUES
  ('writing_content',        NULL, 'writing_content',
    jsonb_build_object('en','Writing & Content'),
    jsonb_build_object('en','Academic writing, copywriting, editing, creative writing, translation, newsletters.'),
    '✍️', 10),
  ('productivity_planning',  NULL, 'productivity_planning',
    jsonb_build_object('en','Productivity & Planning'),
    jsonb_build_object('en','Task breakdown, meeting notes, decision frameworks, weekly review.'),
    '🗓️', 20),
  ('coding_development',     NULL, 'coding_development',
    jsonb_build_object('en','Coding & Development'),
    jsonb_build_object('en','Code review, debugging, architecture, refactoring, testing, docs.'),
    '💻', 30),
  ('research_analysis',      NULL, 'research_analysis',
    jsonb_build_object('en','Research & Analysis'),
    jsonb_build_object('en','Literature review, competitive analysis, data analysis, synthesis.'),
    '🔬', 40),
  ('business_strategy',      NULL, 'business_strategy',
    jsonb_build_object('en','Business & Strategy'),
    jsonb_build_object('en','Strategy frameworks, financials, pitching, go-to-market.'),
    '📈', 50),
  ('learning_education',     NULL, 'learning_education',
    jsonb_build_object('en','Learning & Education'),
    jsonb_build_object('en','Tutoring, study plans, Socratic method, ELI5.'),
    '🎓', 60),
  ('career_professional',    NULL, 'career_professional',
    jsonb_build_object('en','Career & Professional'),
    jsonb_build_object('en','Resumes, cover letters, interview prep, networking.'),
    '🧭', 70),
  ('life_personal_growth',   NULL, 'life_personal_growth',
    jsonb_build_object('en','Life & Personal Growth'),
    jsonb_build_object('en','Journaling, reflection, habit design, relationships.'),
    '🌱', 80),
  ('arts_creative',          NULL, 'arts_creative',
    jsonb_build_object('en','Arts & Creative'),
    jsonb_build_object('en','Music, visual direction, storytelling, poetry.'),
    '🎨', 90),
  ('language_learning',      NULL, 'language_learning',
    jsonb_build_object('en','Language Learning'),
    jsonb_build_object('en','Conversation practice, grammar, translation with context.'),
    '🌍', 100),
  ('expert_personas',        NULL, 'expert_personas',
    jsonb_build_object('en','Expert Personas / Roleplay'),
    jsonb_build_object('en','Lawyer, consultant, therapist, coach, financial advisor.'),
    '🎭', 110),
  ('meta_prompt_engineering',NULL, 'meta_prompt_engineering',
    jsonb_build_object('en','Meta & Prompt Engineering'),
    jsonb_build_object('en','SuperPrompt, chain-of-thought, few-shot templates, self-review.'),
    '🧠', 120)
ON CONFLICT (slug) DO UPDATE
  SET name_i18n = EXCLUDED.name_i18n,
      description_i18n = EXCLUDED.description_i18n,
      icon = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order;

-- ============================================================
-- 2. ai_prompt_library  (curated library; publicly readable to all auth users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,

  title_i18n JSONB NOT NULL,
  description_i18n JSONB NOT NULL,
  body TEXT NOT NULL,
  body_locale TEXT NOT NULL DEFAULT 'en',

  top_category TEXT NOT NULL CHECK (top_category IN (
    'writing_content',
    'productivity_planning',
    'coding_development',
    'research_analysis',
    'business_strategy',
    'learning_education',
    'career_professional',
    'life_personal_growth',
    'arts_creative',
    'language_learning',
    'expert_personas',
    'meta_prompt_engineering'
  )),
  sub_category_slug TEXT REFERENCES public.ai_prompt_categories(slug) ON DELETE SET NULL,

  tags TEXT[] NOT NULL DEFAULT '{}',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT,

  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- provenance (required for imported prompts; NULLs allowed for in-app authored libs)
  source_repo TEXT NOT NULL,
  source_url TEXT,
  source_path TEXT,
  license TEXT,
  attribution TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_prompt_library_title_has_en CHECK (title_i18n ? 'en'),
  CONSTRAINT ai_prompt_library_description_has_en CHECK (description_i18n ? 'en'),
  CONSTRAINT ai_prompt_library_variables_is_array CHECK (jsonb_typeof(variables) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_category
  ON public.ai_prompt_library(top_category, sort_order);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_sub_category
  ON public.ai_prompt_library(sub_category_slug);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_featured
  ON public.ai_prompt_library(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_ai_prompt_library_tags
  ON public.ai_prompt_library USING GIN (tags);

ALTER TABLE public.ai_prompt_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ai_prompt_library" ON public.ai_prompt_library;
CREATE POLICY "Anyone can read ai_prompt_library"
  ON public.ai_prompt_library FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE policies: library writes are restricted to service role.

-- ============================================================
-- 3. ai_user_prompts  (user-authored / forked)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_user_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  slug TEXT NOT NULL,
  title_i18n JSONB NOT NULL,
  description_i18n JSONB NOT NULL,
  body TEXT NOT NULL,
  body_locale TEXT NOT NULL DEFAULT 'en',

  top_category TEXT NOT NULL CHECK (top_category IN (
    'writing_content',
    'productivity_planning',
    'coding_development',
    'research_analysis',
    'business_strategy',
    'learning_education',
    'career_professional',
    'life_personal_growth',
    'arts_creative',
    'language_learning',
    'expert_personas',
    'meta_prompt_engineering'
  )),
  sub_category_slug TEXT REFERENCES public.ai_prompt_categories(slug) ON DELETE SET NULL,

  tags TEXT[] NOT NULL DEFAULT '{}',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT,

  is_favorite BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  forked_from_prompt_slug TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_user_prompts_slug_per_user UNIQUE (user_id, slug),
  CONSTRAINT ai_user_prompts_title_has_en CHECK (title_i18n ? 'en'),
  CONSTRAINT ai_user_prompts_description_has_en CHECK (description_i18n ? 'en'),
  CONSTRAINT ai_user_prompts_variables_is_array CHECK (jsonb_typeof(variables) = 'array')
);

ALTER TABLE public.ai_user_prompts
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ai_user_prompts_user
  ON public.ai_user_prompts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_user_prompts_category
  ON public.ai_user_prompts(user_id, top_category);
CREATE INDEX IF NOT EXISTS idx_ai_user_prompts_favorite
  ON public.ai_user_prompts(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_ai_user_prompts_tags
  ON public.ai_user_prompts USING GIN (tags);

ALTER TABLE public.ai_user_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_user_prompts" ON public.ai_user_prompts;
CREATE POLICY "Users manage own ai_user_prompts"
  ON public.ai_user_prompts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. ai_prompt_favorites  (library-prompt favorites, keyed by library row id)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  library_prompt_id UUID NOT NULL REFERENCES public.ai_prompt_library(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, library_prompt_id)
);

ALTER TABLE public.ai_prompt_favorites
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ai_prompt_favorites_user
  ON public.ai_prompt_favorites(user_id, created_at DESC);

ALTER TABLE public.ai_prompt_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai_prompt_favorites" ON public.ai_prompt_favorites;
DROP POLICY IF EXISTS "Users insert own ai_prompt_favorites" ON public.ai_prompt_favorites;
DROP POLICY IF EXISTS "Users delete own ai_prompt_favorites" ON public.ai_prompt_favorites;

CREATE POLICY "Users view own ai_prompt_favorites"
  ON public.ai_prompt_favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai_prompt_favorites"
  ON public.ai_prompt_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai_prompt_favorites"
  ON public.ai_prompt_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. ai_prompt_runs  (execution audit log + "re-run" history)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  library_prompt_id UUID REFERENCES public.ai_prompt_library(id) ON DELETE SET NULL,
  custom_prompt_id UUID REFERENCES public.ai_user_prompts(id) ON DELETE SET NULL,

  -- Open string on provider: v1 defaults to 'gemini', future providers added without migration.
  provider TEXT NOT NULL DEFAULT 'gemini',
  model TEXT,

  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'succeeded', 'failed', 'canceled'
  )),
  result_snippet TEXT,
  error_message TEXT,

  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT ai_prompt_runs_one_source CHECK (
    (library_prompt_id IS NOT NULL AND custom_prompt_id IS NULL) OR
    (library_prompt_id IS NULL AND custom_prompt_id IS NOT NULL) OR
    (library_prompt_id IS NULL AND custom_prompt_id IS NULL)
  ),
  CONSTRAINT ai_prompt_runs_variables_is_object CHECK (
    jsonb_typeof(variables) = 'object'
  )
);

ALTER TABLE public.ai_prompt_runs
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_user_started
  ON public.ai_prompt_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_library_prompt
  ON public.ai_prompt_runs(library_prompt_id) WHERE library_prompt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompt_runs_custom_prompt
  ON public.ai_prompt_runs(custom_prompt_id) WHERE custom_prompt_id IS NOT NULL;

ALTER TABLE public.ai_prompt_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_prompt_runs" ON public.ai_prompt_runs;
CREATE POLICY "Users manage own ai_prompt_runs"
  ON public.ai_prompt_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. Backfill from Career Coach tables (non-destructive, idempotent)
-- ============================================================
--
-- Maps existing 8-category Career Coach taxonomy into the AI Knowledge 12-bucket
-- taxonomy. The Career Coach tables stay in place; this backfill only copies
-- data into the new AI Knowledge tables so Phase 1 users keep their prompts,
-- favorites, and usage history in the redesigned surface.

-- 6a. Library prompts: system_prompt_templates -> ai_prompt_library
-- Slug is prefixed with `coach_` to avoid collision with awesome-prompts slugs.
INSERT INTO public.ai_prompt_library (
  slug,
  title_i18n,
  description_i18n,
  body,
  body_locale,
  top_category,
  sub_category_slug,
  tags,
  variables,
  icon,
  is_featured,
  sort_order,
  source_repo,
  source_url,
  source_path,
  license,
  attribution,
  created_at,
  updated_at
)
SELECT
  'coach_' || s.slug AS slug,
  s.title_i18n,
  s.description_i18n,
  COALESCE(s.prompt_i18n->>'en', '') AS body,
  'en' AS body_locale,
  CASE s.category
    WHEN 'resume'      THEN 'career_professional'
    WHEN 'interview'   THEN 'career_professional'
    WHEN 'application' THEN 'career_professional'
    WHEN 'branding'    THEN 'career_professional'
    WHEN 'discovery'   THEN 'life_personal_growth'
    WHEN 'transition'  THEN 'career_professional'
    WHEN 'growth'      THEN 'learning_education'
    ELSE 'career_professional'
  END AS top_category,
  NULL AS sub_category_slug,
  ARRAY['career', 'coach'] AS tags,
  '[]'::jsonb AS variables,
  s.icon,
  false AS is_featured,
  s.sort_order,
  'mylifeos/career-coach' AS source_repo,
  NULL AS source_url,
  NULL AS source_path,
  'Internal' AS license,
  'My Life OS Career Coach' AS attribution,
  s.created_at,
  s.created_at AS updated_at
FROM public.system_prompt_templates s
ON CONFLICT (slug) DO NOTHING;

-- 6b. User custom prompts: user_custom_prompts -> ai_user_prompts
-- Slug generation: stable-per-row (`custom_` + id prefix) to avoid duplicates
-- on re-run (unique constraint is per (user_id, slug)).
INSERT INTO public.ai_user_prompts (
  id,
  user_id,
  slug,
  title_i18n,
  description_i18n,
  body,
  body_locale,
  top_category,
  sub_category_slug,
  tags,
  variables,
  icon,
  is_favorite,
  usage_count,
  last_used_at,
  forked_from_prompt_slug,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.user_id,
  'custom_' || substr(c.id::text, 1, 8) AS slug,
  jsonb_build_object('en', c.title) AS title_i18n,
  jsonb_build_object('en', '') AS description_i18n,
  c.prompt_body AS body,
  'en' AS body_locale,
  'life_personal_growth' AS top_category,
  NULL AS sub_category_slug,
  c.tags,
  '[]'::jsonb AS variables,
  c.icon,
  c.is_favorite,
  c.usage_count,
  c.last_used_at,
  NULL AS forked_from_prompt_slug,
  c.created_at,
  c.updated_at
FROM public.user_custom_prompts c
ON CONFLICT (id) DO NOTHING;

-- 6c. Favorites: user_prompt_favorites -> ai_prompt_favorites
-- Only copies favorites whose underlying template successfully backfilled.
INSERT INTO public.ai_prompt_favorites (user_id, library_prompt_id, created_at)
SELECT
  f.user_id,
  al.id AS library_prompt_id,
  f.created_at
FROM public.user_prompt_favorites f
JOIN public.system_prompt_templates s ON s.id = f.template_id
JOIN public.ai_prompt_library al ON al.slug = 'coach_' || s.slug
ON CONFLICT (user_id, library_prompt_id) DO NOTHING;

-- 6d. Usage history: prompt_usage_history -> ai_prompt_runs
-- Mapped as `succeeded` runs with empty result snippets (legacy table didn't
-- store results). Gated on the runs table being empty so re-running the
-- migration (e.g. during `db reset`) does not create duplicate rows.
DO $$
DECLARE
  run_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO run_count FROM public.ai_prompt_runs;
  IF run_count = 0 THEN
    INSERT INTO public.ai_prompt_runs (
      user_id,
      library_prompt_id,
      custom_prompt_id,
      provider,
      model,
      variables,
      status,
      result_snippet,
      error_message,
      started_at,
      completed_at
    )
    SELECT
      h.user_id,
      al.id,
      up.id,
      h.ai_tool,
      NULL,
      '{}'::jsonb,
      'succeeded',
      NULL,
      NULL,
      h.used_at,
      h.used_at
    FROM public.prompt_usage_history h
    LEFT JOIN public.system_prompt_templates s ON s.id = h.template_id
    LEFT JOIN public.ai_prompt_library al ON al.slug = 'coach_' || s.slug
    LEFT JOIN public.ai_user_prompts up ON up.id = h.custom_prompt_id
    WHERE al.id IS NOT NULL OR up.id IS NOT NULL;
  END IF;
END $$;
