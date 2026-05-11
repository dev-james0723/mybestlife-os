-- Career Vault Phase 5: Advanced Views & Intelligence Layer
--
-- Tables added:
--   * career_events           (timeline entries, auto- + user-generated)
--   * career_network_nodes    (people, organizations, projects, opportunity mirrors)
--   * career_network_edges    (typed relationships between nodes)
--   * daily_insights          (cached LLM suggestions per user per day)
--   * career_decisions        (decision journal with structured options + review)
--
-- Extends existing career_profile with richer columns used by the dashboard
-- completeness score and the AI Coach prompt compiler. All ALTER TABLE calls
-- are idempotent (IF NOT EXISTS) so this migration is safe to re-run.
--
-- All new tables enforce RLS (owner-only CRUD).

-- ============================================================
-- 1. career_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'job_started', 'job_ended', 'promotion',
    'education_started', 'education_completed',
    'certification_earned', 'project_shipped',
    'award_received', 'speaking_event',
    'publication', 'milestone', 'custom'
  )),

  title TEXT NOT NULL,
  description TEXT,

  start_date DATE NOT NULL,
  end_date DATE,
  is_ongoing BOOLEAN NOT NULL DEFAULT false,

  organization TEXT,
  location TEXT,

  -- Link to Vault files (diploma, recommendation letter, shipped artifact…)
  related_file_ids UUID[] NOT NULL DEFAULT '{}',

  color TEXT,
  icon TEXT,

  -- Flag auto-generated events so we can surface a dismiss affordance.
  auto_generated BOOLEAN NOT NULL DEFAULT false,
  source_kind TEXT, -- 'file_upload' | 'opportunity_stage' | 'bundle_export' | null
  source_id UUID,   -- fk-less cross-table pointer; validated at app layer

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_user_date
  ON public.career_events(user_id, start_date DESC);

ALTER TABLE public.career_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_events" ON public.career_events;
CREATE POLICY "Users manage own career_events"
  ON public.career_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 2. career_network_nodes / career_network_edges
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_network_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  node_type TEXT NOT NULL CHECK (node_type IN (
    'person', 'organization', 'project', 'opportunity'
  )),

  name TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,

  email TEXT,
  linkedin_url TEXT,
  role_title TEXT,

  industry TEXT,
  website TEXT,

  project_url TEXT,
  project_status TEXT,

  opportunity_id UUID REFERENCES public.career_opportunities(id) ON DELETE SET NULL,

  image_url TEXT,

  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  last_interaction_date DATE,

  color TEXT,
  size INTEGER NOT NULL DEFAULT 1 CHECK (size BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_network_nodes_user
  ON public.career_network_nodes(user_id, node_type);

CREATE INDEX IF NOT EXISTS idx_network_nodes_opportunity
  ON public.career_network_nodes(opportunity_id)
  WHERE opportunity_id IS NOT NULL;

ALTER TABLE public.career_network_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own network nodes" ON public.career_network_nodes;
CREATE POLICY "Users manage own network nodes"
  ON public.career_network_nodes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.career_network_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_node_id UUID NOT NULL REFERENCES public.career_network_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.career_network_nodes(id) ON DELETE CASCADE,

  relationship_type TEXT NOT NULL,
  strength SMALLINT CHECK (strength IS NULL OR (strength BETWEEN 1 AND 5)),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source_node_id, target_node_id, relationship_type),
  CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_network_edges_source
  ON public.career_network_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_network_edges_target
  ON public.career_network_edges(target_node_id);

ALTER TABLE public.career_network_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own network edges" ON public.career_network_edges;
CREATE POLICY "Users manage own network edges"
  ON public.career_network_edges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 3. daily_insights
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Local-date the insights are for. One row per user per day.
  date DATE NOT NULL,
  -- Raw JSON payload from the LLM; shape defined in the Edge function.
  suggestions JSONB NOT NULL,
  -- Per-suggestion dismissals; { "<suggestion-id>": { status, at } }.
  interactions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_insights_user_date
  ON public.daily_insights(user_id, date DESC);

ALTER TABLE public.daily_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily_insights" ON public.daily_insights;
CREATE POLICY "Users manage own daily_insights"
  ON public.daily_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 4. career_decisions (decision journal)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  decision_type TEXT CHECK (decision_type IN (
    'job_offer', 'career_pivot', 'education', 'relocation',
    'side_project', 'mentor_choice', 'investment', 'custom'
  )),

  framework TEXT CHECK (framework IN (
    'pros_cons', '10_10_10', 'regret_minimization',
    'expected_value', 'custom'
  )),

  context TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  assumptions TEXT,
  decision TEXT,
  expected_outcome TEXT,

  actual_outcome TEXT,
  lessons_learned TEXT,
  decision_quality_score SMALLINT CHECK (
    decision_quality_score IS NULL OR
    (decision_quality_score BETWEEN 1 AND 10)
  ),
  review_date DATE,

  decided_at DATE NOT NULL,
  review_reminder_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_user_date
  ON public.career_decisions(user_id, decided_at DESC);

ALTER TABLE public.career_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own career_decisions" ON public.career_decisions;
CREATE POLICY "Users manage own career_decisions"
  ON public.career_decisions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 5. Extend career_profile for Command Center completeness + linked assets
-- ============================================================

ALTER TABLE public.career_profile
  ADD COLUMN IF NOT EXISTS current_company TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS career_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS twelve_month_goals TEXT,
  ADD COLUMN IF NOT EXISTS dream_scenario TEXT,
  ADD COLUMN IF NOT EXISTS blockers TEXT,
  ADD COLUMN IF NOT EXISTS target_industries TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS target_locations TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS salary_expectation_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_expectation_max INTEGER,
  ADD COLUMN IF NOT EXISTS salary_currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS primary_headshot_id UUID
    REFERENCES public.career_vault_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_bio_id UUID
    REFERENCES public.career_vault_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS master_resume_id UUID
    REFERENCES public.career_vault_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transition_goal TEXT,
  ADD COLUMN IF NOT EXISTS transition_progress SMALLINT CHECK (
    transition_progress IS NULL OR
    (transition_progress BETWEEN 0 AND 100)
  );

-- No new RLS needed — career_profile already enforces owner-only policy.
