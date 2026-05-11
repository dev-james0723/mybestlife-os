-- Daily Planner — Free Planning Mode columns.
--
-- The planner now supports two planning styles, persisted side-by-side on a single
-- daily_plans row so that switching modes never loses data:
--   * "time-block" (default): existing behaviour — `tasks` JSONB stores ordered blocks.
--   * "free": new flexible mode — `free_tasks` JSONB stores priority-bucketed task list.
--
-- `mode` records the user's last-selected lens for the day. `free_tasks` is independent
-- from `tasks` so neither mode can clobber the other; the UI just renders whichever
-- bucket matches the active mode.

ALTER TABLE public.daily_plans
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'time-block',
  ADD COLUMN IF NOT EXISTS free_tasks JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.daily_plans
  DROP CONSTRAINT IF EXISTS daily_plans_mode_check;

ALTER TABLE public.daily_plans
  ADD CONSTRAINT daily_plans_mode_check CHECK (mode IN ('time-block', 'free'));
