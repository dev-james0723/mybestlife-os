-- Role Model Intelligence Hub — persistent Neural Skills.
--
-- A "Neural Skill" is a Role Model distilled into a Mind Council–compatible
-- interpretive lens. Unlike the per-model AI *insights* (which are cached in
-- the existing `ai_insights` table and can always be regenerated), a Neural
-- Skill is durable user content: it powers "Talk To {name}" deep links and
-- appears in the Mind Council library, so it must survive across devices and
-- never live only in localStorage.
--
-- `mind_skill_id` is the id used inside Mind Council `allSkills`. It is
-- prefixed `custom-` so the existing chat route + SkillChatRoom treat it as a
-- custom lens (sending lensTitle + systemPromptHint to /api/mind-council/chat)
-- with no runtime changes.

CREATE TABLE IF NOT EXISTS public.role_model_neural_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  role_model_id UUID NOT NULL REFERENCES public.role_models(id) ON DELETE CASCADE,
  -- Mind Council skill id (e.g. "custom-rm-<uuid>"). Unique per user so a role
  -- model resolves to exactly one lens.
  mind_skill_id TEXT NOT NULL,
  -- Distilled lens: { lensTitle, lensSubtitle, systemPromptHint, thinkingStyle,
  -- decisionPrinciples[], communicationStyle, likelyQuestions[], bestFor[],
  -- avoidFor[], blindSpots[], starterPrompts[] }.
  skill_json JSONB NOT NULL,
  -- Abstract avatar gradient [from, to].
  avatar_gradient JSONB NOT NULL DEFAULT '["#334155", "#cbd5e1"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'processing', 'failed')),
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One Neural Skill per role model per user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_model_neural_skills_unique_model
  ON public.role_model_neural_skills (user_id, role_model_id);

CREATE INDEX IF NOT EXISTS idx_role_model_neural_skills_user
  ON public.role_model_neural_skills (user_id, updated_at DESC);

ALTER TABLE public.role_model_neural_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own role_model_neural_skills" ON public.role_model_neural_skills;
CREATE POLICY "Users manage own role_model_neural_skills"
  ON public.role_model_neural_skills FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS role_model_neural_skills_touch_updated_at ON public.role_model_neural_skills;
CREATE TRIGGER role_model_neural_skills_touch_updated_at
  BEFORE UPDATE ON public.role_model_neural_skills
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
