-- Focus & Reality Layer for Daily Planner.
--
-- Adds user-owned focus preferences, focus sessions, in-app stimulation events,
-- deterministic plan-quality reports, and planned-vs-actual daily reviews.
-- No device/app/browser-tab surveillance is introduced here; rows are created
-- only from user-initiated planner/focus interactions inside My Best Life OS.

CREATE TABLE IF NOT EXISTS public.focus_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  low_stimulation_mode_enabled boolean NOT NULL DEFAULT true,
  distraction_gate_enabled boolean NOT NULL DEFAULT true,
  urge_surfing_delay_seconds integer NOT NULL DEFAULT 10
    CHECK (urge_surfing_delay_seconds BETWEEN 0 AND 60),
  default_focus_minutes integer NOT NULL DEFAULT 50
    CHECK (default_focus_minutes BETWEEN 5 AND 240),
  break_reminder_minutes integer NOT NULL DEFAULT 50
    CHECK (break_reminder_minutes BETWEEN 5 AND 240),
  high_stimulation_routes text[] NOT NULL DEFAULT ARRAY[
    '/youtube-radar',
    '/ai-assistant',
    '/business-analyst',
    '/ideas',
    '/idea-capture',
    '/vault',
    '/software-vault'
  ]::text[],
  ai_access_requires_intention boolean NOT NULL DEFAULT true,
  show_actual_timeline_overlay boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT focus_preferences_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS focus_preferences_user_id_idx
  ON public.focus_preferences (user_id);

CREATE TABLE IF NOT EXISTS public.planner_focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_plan_id uuid REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  planner_task_id text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  plan_date date NOT NULL,
  task_title text NOT NULL,
  session_type text NOT NULL DEFAULT 'deep_work'
    CHECK (session_type IN (
      'deep_work',
      'admin',
      'learning',
      'creative',
      'meeting',
      'recovery',
      'personal'
    )),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'running', 'paused', 'completed', 'abandoned')),
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  win_condition text,
  allowed_tools text[] NOT NULL DEFAULT '{}'::text[],
  blocked_routes text[] NOT NULL DEFAULT '{}'::text[],
  blocked_domains text[] NOT NULL DEFAULT '{}'::text[],
  interruption_count integer NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
  stimulation_leak_count integer NOT NULL DEFAULT 0 CHECK (stimulation_leak_count >= 0),
  energy_before integer CHECK (energy_before BETWEEN 1 AND 5),
  energy_after integer CHECK (energy_after BETWEEN 1 AND 5),
  focus_rating integer CHECK (focus_rating BETWEEN 1 AND 5),
  completion_state text CHECK (
    completion_state IS NULL OR completion_state IN ('completed', 'partial', 'not_completed')
  ),
  completion_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_focus_sessions_user_plan_date_idx
  ON public.planner_focus_sessions (user_id, plan_date);

CREATE INDEX IF NOT EXISTS planner_focus_sessions_user_task_idx
  ON public.planner_focus_sessions (user_id, planner_task_id)
  WHERE planner_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS planner_focus_sessions_user_status_idx
  ON public.planner_focus_sessions (user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS planner_focus_sessions_one_active_per_user_idx
  ON public.planner_focus_sessions (user_id)
  WHERE status IN ('running', 'paused');

CREATE TABLE IF NOT EXISTS public.planner_stimulation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_session_id uuid REFERENCES public.planner_focus_sessions(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN (
      'route_gate',
      'urge_surfing',
      'manual_interrupt',
      'focus_exit_attempt',
      'ai_access',
      'high_stimulation_route'
    )),
  route text,
  domain text,
  decision text
    CHECK (decision IS NULL OR decision IN (
      'returned_to_focus',
      'continued_intentionally',
      'captured_and_returned',
      'abandoned_session'
    )),
  reason text,
  delay_seconds integer NOT NULL DEFAULT 0 CHECK (delay_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planner_stimulation_events_user_plan_date_idx
  ON public.planner_stimulation_events (user_id, plan_date);

CREATE INDEX IF NOT EXISTS planner_stimulation_events_session_idx
  ON public.planner_stimulation_events (focus_session_id);

CREATE TABLE IF NOT EXISTS public.daily_plan_quality_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_plan_id uuid REFERENCES public.daily_plans(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  summary text NOT NULL,
  top_issue text,
  focus_target_minutes integer NOT NULL DEFAULT 0 CHECK (focus_target_minutes >= 0),
  break_status text NOT NULL DEFAULT 'unknown'
    CHECK (break_status IN ('good', 'thin', 'missing', 'unknown')),
  stimulation_risk text NOT NULL DEFAULT 'medium'
    CHECK (stimulation_risk IN ('low', 'medium', 'high')),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_plan_quality_reports_user_plan_date_unique UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS daily_plan_quality_reports_user_plan_date_idx
  ON public.daily_plan_quality_reports (user_id, plan_date);

CREATE TABLE IF NOT EXISTS public.daily_plan_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_plan_id uuid REFERENCES public.daily_plans(id) ON DELETE SET NULL,
  plan_date date NOT NULL,
  planned_minutes integer NOT NULL DEFAULT 0 CHECK (planned_minutes >= 0),
  actual_focus_minutes integer NOT NULL DEFAULT 0 CHECK (actual_focus_minutes >= 0),
  deep_work_minutes integer NOT NULL DEFAULT 0 CHECK (deep_work_minutes >= 0),
  meeting_minutes integer NOT NULL DEFAULT 0 CHECK (meeting_minutes >= 0),
  recovery_minutes integer NOT NULL DEFAULT 0 CHECK (recovery_minutes >= 0),
  interruption_count integer NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
  stimulation_leak_count integer NOT NULL DEFAULT 0 CHECK (stimulation_leak_count >= 0),
  plan_completion_ratio numeric(5,2) NOT NULL DEFAULT 0 CHECK (plan_completion_ratio >= 0),
  plan_accuracy_ratio numeric(5,2) NOT NULL DEFAULT 0 CHECK (plan_accuracy_ratio >= 0),
  focus_integrity_score integer NOT NULL DEFAULT 0 CHECK (focus_integrity_score BETWEEN 0 AND 100),
  stimulation_load_score integer NOT NULL DEFAULT 0 CHECK (stimulation_load_score BETWEEN 0 AND 100),
  recovery_ratio numeric(5,2) NOT NULL DEFAULT 0 CHECK (recovery_ratio >= 0),
  best_focus_window jsonb,
  top_failure_pattern text,
  tomorrow_suggestion text,
  ai_summary text,
  saved_to_journal_entry_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_plan_reviews_user_plan_date_unique UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS daily_plan_reviews_user_plan_date_idx
  ON public.daily_plan_reviews (user_id, plan_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_focus_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_stimulation_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_quality_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_reviews TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.focus_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_focus_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_stimulation_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_quality_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_reviews TO service_role;

ALTER TABLE public.focus_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_stimulation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_quality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tg_focus_reality_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS focus_preferences_touch_updated_at ON public.focus_preferences;
CREATE TRIGGER focus_preferences_touch_updated_at
  BEFORE UPDATE ON public.focus_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_focus_reality_set_updated_at();

DROP TRIGGER IF EXISTS planner_focus_sessions_touch_updated_at ON public.planner_focus_sessions;
CREATE TRIGGER planner_focus_sessions_touch_updated_at
  BEFORE UPDATE ON public.planner_focus_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tg_focus_reality_set_updated_at();

DROP TRIGGER IF EXISTS daily_plan_quality_reports_touch_updated_at ON public.daily_plan_quality_reports;
CREATE TRIGGER daily_plan_quality_reports_touch_updated_at
  BEFORE UPDATE ON public.daily_plan_quality_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_focus_reality_set_updated_at();

DROP TRIGGER IF EXISTS daily_plan_reviews_touch_updated_at ON public.daily_plan_reviews;
CREATE TRIGGER daily_plan_reviews_touch_updated_at
  BEFORE UPDATE ON public.daily_plan_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_focus_reality_set_updated_at();

DROP POLICY IF EXISTS focus_preferences_select_own ON public.focus_preferences;
CREATE POLICY focus_preferences_select_own
  ON public.focus_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS focus_preferences_insert_own ON public.focus_preferences;
CREATE POLICY focus_preferences_insert_own
  ON public.focus_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS focus_preferences_update_own ON public.focus_preferences;
CREATE POLICY focus_preferences_update_own
  ON public.focus_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS focus_preferences_delete_own ON public.focus_preferences;
CREATE POLICY focus_preferences_delete_own
  ON public.focus_preferences FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_focus_sessions_select_own ON public.planner_focus_sessions;
CREATE POLICY planner_focus_sessions_select_own
  ON public.planner_focus_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_focus_sessions_insert_own ON public.planner_focus_sessions;
CREATE POLICY planner_focus_sessions_insert_own
  ON public.planner_focus_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_focus_sessions_update_own ON public.planner_focus_sessions;
CREATE POLICY planner_focus_sessions_update_own
  ON public.planner_focus_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_focus_sessions_delete_own ON public.planner_focus_sessions;
CREATE POLICY planner_focus_sessions_delete_own
  ON public.planner_focus_sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_stimulation_events_select_own ON public.planner_stimulation_events;
CREATE POLICY planner_stimulation_events_select_own
  ON public.planner_stimulation_events FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_stimulation_events_insert_own ON public.planner_stimulation_events;
CREATE POLICY planner_stimulation_events_insert_own
  ON public.planner_stimulation_events FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_stimulation_events_update_own ON public.planner_stimulation_events;
CREATE POLICY planner_stimulation_events_update_own
  ON public.planner_stimulation_events FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS planner_stimulation_events_delete_own ON public.planner_stimulation_events;
CREATE POLICY planner_stimulation_events_delete_own
  ON public.planner_stimulation_events FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_quality_reports_select_own ON public.daily_plan_quality_reports;
CREATE POLICY daily_plan_quality_reports_select_own
  ON public.daily_plan_quality_reports FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_quality_reports_insert_own ON public.daily_plan_quality_reports;
CREATE POLICY daily_plan_quality_reports_insert_own
  ON public.daily_plan_quality_reports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_quality_reports_update_own ON public.daily_plan_quality_reports;
CREATE POLICY daily_plan_quality_reports_update_own
  ON public.daily_plan_quality_reports FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_quality_reports_delete_own ON public.daily_plan_quality_reports;
CREATE POLICY daily_plan_quality_reports_delete_own
  ON public.daily_plan_quality_reports FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_reviews_select_own ON public.daily_plan_reviews;
CREATE POLICY daily_plan_reviews_select_own
  ON public.daily_plan_reviews FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_reviews_insert_own ON public.daily_plan_reviews;
CREATE POLICY daily_plan_reviews_insert_own
  ON public.daily_plan_reviews FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_reviews_update_own ON public.daily_plan_reviews;
CREATE POLICY daily_plan_reviews_update_own
  ON public.daily_plan_reviews FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS daily_plan_reviews_delete_own ON public.daily_plan_reviews;
CREATE POLICY daily_plan_reviews_delete_own
  ON public.daily_plan_reviews FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
