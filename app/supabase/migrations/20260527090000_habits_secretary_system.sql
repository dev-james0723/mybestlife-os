-- Habits AI Secretary system: visuals, persistent timers, reflections, and broader links.
-- Additive and owner-scoped; existing habits/routines CRUD remains unchanged.

-- ============================================================
-- 1. Broaden habit_links target kinds for cross-page intelligence
-- ============================================================

ALTER TABLE public.habit_links
  DROP CONSTRAINT IF EXISTS habit_links_target_kind_check;

ALTER TABLE public.habit_links
  ADD CONSTRAINT habit_links_target_kind_check
  CHECK (
    target_kind IN (
      'goal',
      'knowledge',
      'project',
      'task',
      'timeline',
      'calendar_event',
      'career_profile',
      'ai_knowledge',
      'planner_block',
      'health_metric',
      'journal_pattern'
    )
  );

-- ============================================================
-- 2. Habit / routine visuals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('habit', 'routine')),
  visual_prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  model_used TEXT,
  source_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'habit' AND habit_id IS NOT NULL AND routine_id IS NULL)
    OR
    (kind = 'routine' AND routine_id IS NOT NULL AND habit_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_visuals_user_habit
  ON public.habit_visuals(user_id, habit_id)
  WHERE habit_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_habit_visuals_user_routine
  ON public.habit_visuals(user_id, routine_id)
  WHERE routine_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habit_visuals_source_hash
  ON public.habit_visuals(user_id, kind, source_hash)
  WHERE source_hash IS NOT NULL;

ALTER TABLE public.habit_visuals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit_visuals" ON public.habit_visuals;
CREATE POLICY "Users manage own habit_visuals"
  ON public.habit_visuals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS habit_visuals_touch_updated_at ON public.habit_visuals;
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER habit_visuals_touch_updated_at
  BEFORE UPDATE ON public.habit_visuals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Public bucket for generated habit/routine card visuals.
-- Paths live at {auth.uid()}/{kind}/{entity-id-or-slug}-{hash}.ext.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'habit-visuals',
  'habit-visuals',
  true,
  5242880,
  ARRAY['image/png', 'image/webp', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Habit visuals are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own habit visuals" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own habit visuals" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own habit visuals" ON storage.objects;

CREATE POLICY "Habit visuals are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'habit-visuals');

CREATE POLICY "Users can insert own habit visuals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'habit-visuals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own habit visuals"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'habit-visuals'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'habit-visuals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own habit visuals"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'habit-visuals'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 3. Persistent timer sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.timer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  routine_step_id UUID REFERENCES public.routine_steps(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_duration_seconds INTEGER NOT NULL CHECK (target_duration_seconds > 0),
  paused_at TIMESTAMPTZ,
  total_paused_seconds INTEGER NOT NULL DEFAULT 0 CHECK (total_paused_seconds >= 0),
  status TEXT NOT NULL CHECK (status IN ('running','paused','completed','cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (habit_id IS NOT NULL OR routine_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_status_started
  ON public.timer_sessions(user_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_timer_sessions_habit
  ON public.timer_sessions(habit_id, started_at DESC)
  WHERE habit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timer_sessions_routine
  ON public.timer_sessions(routine_id, started_at DESC)
  WHERE routine_id IS NOT NULL;

ALTER TABLE public.timer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own timer_sessions" ON public.timer_sessions;
CREATE POLICY "Users manage own timer_sessions"
  ON public.timer_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS timer_sessions_touch_updated_at ON public.timer_sessions;
CREATE TRIGGER timer_sessions_touch_updated_at
  BEFORE UPDATE ON public.timer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- 4. Lightweight reflections
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,
  timer_session_id UUID REFERENCES public.timer_sessions(id) ON DELETE SET NULL,
  reflection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood TEXT CHECK (mood IS NULL OR mood IN ('easy','fine','too_hard','bad_timing','modify_next_time')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (habit_id IS NOT NULL OR routine_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_habit_reflections_user_date
  ON public.habit_reflections(user_id, reflection_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_reflections_habit
  ON public.habit_reflections(habit_id, reflection_date DESC)
  WHERE habit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_habit_reflections_routine
  ON public.habit_reflections(routine_id, reflection_date DESC)
  WHERE routine_id IS NOT NULL;

ALTER TABLE public.habit_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit_reflections" ON public.habit_reflections;
CREATE POLICY "Users manage own habit_reflections"
  ON public.habit_reflections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
