-- Tasks Command Center — additive task model upgrade.
--
-- This migration is intentionally additive: every change is `IF NOT EXISTS`
-- with a safe default, so existing tasks (and the columns the app already
-- relies on: project_id, status, priority, due_date, completed_at, tags, …)
-- are never touched. It adds:
--   * classification + provenance columns on `tasks`
--   * scheduling / calendar-link columns on `tasks`
--   * a `sort_order` column for manual/board ordering
--   * the first indexes on `tasks` (none existed before)
--   * a lightweight `task_subtasks` checklist table (kept separate from
--     `tasks` so the main list / board / filters stay clean)
--
-- Task <-> goal / knowledge / idea links continue to use `brain_relations`;
-- task <-> habit uses `habit_links`; planner uses `daily_plans.tasks[].taskId`.
-- No parallel relation table is introduced here.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- tasks — additive columns
-- ============================================================

-- Free-text category, app-normalized to a canonical set (academic, business,
-- music, …). Nullable; the app derives a category when this is null.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT;

-- AI provenance: was this task created/expanded by an AI flow?
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;

-- Free-form bag for AI suggestions (subtasks proposed, reasoning, model used…).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Manual / board ordering. Nullable; sorts last when unset.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Day the user intends to *work on* the task (distinct from due_date deadline).
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Calendar linkage for "create event from task" / scheduled state.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS calendar_provider TEXT;

-- Guard the provider enum without breaking existing NULL rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_calendar_provider_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_calendar_provider_check
      CHECK (calendar_provider IS NULL OR calendar_provider IN ('local', 'google'));
  END IF;
END $$;

-- ============================================================
-- tasks — indexes (none existed previously)
-- ============================================================

CREATE INDEX IF NOT EXISTS tasks_user_status_idx
  ON public.tasks (user_id, status);

CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx
  ON public.tasks (user_id, due_date);

CREATE INDEX IF NOT EXISTS tasks_project_idx
  ON public.tasks (project_id);

CREATE INDEX IF NOT EXISTS tasks_user_category_idx
  ON public.tasks (user_id, category);

-- ============================================================
-- task_subtasks — lightweight checklist rows
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_subtasks_task_idx
  ON public.task_subtasks (task_id);

CREATE INDEX IF NOT EXISTS task_subtasks_user_idx
  ON public.task_subtasks (user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.task_subtasks_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_subtasks_set_updated_at ON public.task_subtasks;
CREATE TRIGGER task_subtasks_set_updated_at
  BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.task_subtasks_set_updated_at();

-- RLS — owner-only CRUD
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_subtasks_select_own ON public.task_subtasks;
CREATE POLICY task_subtasks_select_own
  ON public.task_subtasks
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS task_subtasks_insert_own ON public.task_subtasks;
CREATE POLICY task_subtasks_insert_own
  ON public.task_subtasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS task_subtasks_update_own ON public.task_subtasks;
CREATE POLICY task_subtasks_update_own
  ON public.task_subtasks
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS task_subtasks_delete_own ON public.task_subtasks;
CREATE POLICY task_subtasks_delete_own
  ON public.task_subtasks
  FOR DELETE
  USING (auth.uid() = user_id);
