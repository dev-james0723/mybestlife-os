-- Habits / routines domain: client inserts omit user_id (repositories use RLS-scoped
-- Supabase client only). Without DEFAULT auth.uid(), NOT NULL user_id rejects the
-- row and RLS WITH CHECK never runs — create habit / routine / completion / step fails.

ALTER TABLE public.habits ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.habit_completions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.streak_freezes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tags ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.habit_tags ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.habit_links ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.routines ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.routine_steps ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.routine_completions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.reminders ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.ai_insights ALTER COLUMN user_id SET DEFAULT auth.uid();
