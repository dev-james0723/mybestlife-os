-- Daily Planner — allow the Adaptive Plan lens alongside the existing modes.
--
-- Adaptive scheduling metadata lives on each entry in the existing `tasks` JSONB
-- array, so adding the mode only requires widening the row-level check constraint.

alter table public.daily_plans
  drop constraint if exists daily_plans_mode_check;

alter table public.daily_plans
  add constraint daily_plans_mode_check
  check (mode in ('time-block', 'free', 'adaptive')) not valid;

alter table public.daily_plans
  validate constraint daily_plans_mode_check;
