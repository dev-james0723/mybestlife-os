-- Habits & Routines rebuild (Phase 1 foundation)
--
-- The prior shape (habits + habit_logs + routines.habit_ids[]) is too narrow for
-- the redesigned page: we need habit types, richer frequency, tags, links, skip
-- vs miss, streak freezes, per-step routines with timers, scheduled reminders,
-- and cached AI insights. Rather than evolve in place we rebuild the domain
-- cleanly and keep the originals as *_legacy tables until Phase 4 so nothing is
-- lost.
--
-- Conventions
--   * All new tables enforce RLS (owner-only CRUD).
--   * All FKs cascade from auth.users → user_id and from habits / routines → their
--     child rows so a single delete is a clean tear-down.
--   * Streaks are NOT stored; they are computed from habit_completions in the app.
--   * `habit_links` is polymorphic — target_kind + target_id — deliberately without
--     FKs because it can reference rows in tables that may not exist yet (timeline
--     events are derived, tasks/projects/goals/knowledge live on their own schemas).
--     Validity is enforced at the application layer.

-- ============================================================
-- 0. Rename existing tables to *_legacy (idempotent)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'habits'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'habits_legacy'
  ) THEN
    EXECUTE 'ALTER TABLE public.habits RENAME TO habits_legacy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'habit_logs'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'habit_logs_legacy'
  ) THEN
    EXECUTE 'ALTER TABLE public.habit_logs RENAME TO habit_logs_legacy';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'routines'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'routines_legacy'
  ) THEN
    EXECUTE 'ALTER TABLE public.routines RENAME TO routines_legacy';
  END IF;
END $$;


-- ============================================================
-- 1. habits
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Discriminated union on the client side; mirrored as a CHECK here.
  type TEXT NOT NULL DEFAULT 'checkbox'
    CHECK (type IN ('checkbox', 'counter', 'duration', 'negative')),

  -- Semantics depend on `type`:
  --   checkbox  → ignored
  --   counter   → target count per cycle (e.g. 8 glasses of water)
  --   duration  → target duration in seconds (e.g. 600 = 10 min)
  --   negative  → ignored (success condition is "no log today")
  target_value NUMERIC,

  -- { kind: 'daily' }
  -- { kind: 'weekly_count', count: 3 }
  -- { kind: 'weekdays', days: [1,3,5] }  -- 0=Sun..6=Sat
  -- { kind: 'every_n_days', n: 2 }
  frequency JSONB NOT NULL DEFAULT '{"kind":"daily"}'::jsonb
    CHECK ((frequency->>'kind') IN ('daily','weekly_count','weekdays','every_n_days')),

  -- Time-of-day grouping for the Today view.
  time_of_day TEXT NOT NULL DEFAULT 'anytime'
    CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),

  color TEXT,
  icon TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON public.habits(user_id, is_active, sort_order);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habits" ON public.habits;
CREATE POLICY "Users manage own habits"
  ON public.habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 2. habit_completions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,

  completion_date DATE NOT NULL,

  -- `done` counts toward the streak. `skipped` is explicit skip (does not break
  -- the streak but does not count as done either). Missing rows = missed.
  status TEXT NOT NULL DEFAULT 'done'
    CHECK (status IN ('done', 'skipped')),

  -- counter: number logged (e.g. 6 glasses). duration: seconds logged.
  value NUMERIC,
  note TEXT,

  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (habit_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_completions_habit_date
  ON public.habit_completions(habit_id, completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_completions_user_date
  ON public.habit_completions(user_id, completion_date DESC);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit_completions" ON public.habit_completions;
CREATE POLICY "Users manage own habit_completions"
  ON public.habit_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 3. streak_freezes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,

  freeze_date DATE NOT NULL,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (habit_id, freeze_date)
);

CREATE INDEX IF NOT EXISTS idx_freezes_habit_date
  ON public.streak_freezes(habit_id, freeze_date DESC);

ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own streak_freezes" ON public.streak_freezes;
CREATE POLICY "Users manage own streak_freezes"
  ON public.streak_freezes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 4. tags + habit_tags
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tags" ON public.tags;
CREATE POLICY "Users manage own tags"
  ON public.tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.habit_tags (
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.tags(id)   ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  PRIMARY KEY (habit_id, tag_id)
);

ALTER TABLE public.habit_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit_tags" ON public.habit_tags;
CREATE POLICY "Users manage own habit_tags"
  ON public.habit_tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 5. habit_links (polymorphic; no FK on target_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.habit_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,

  target_kind TEXT NOT NULL
    CHECK (target_kind IN ('goal', 'knowledge', 'project', 'task', 'timeline')),
  target_id UUID NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (habit_id, target_kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_habit_links_target
  ON public.habit_links(target_kind, target_id);

CREATE INDEX IF NOT EXISTS idx_habit_links_habit
  ON public.habit_links(habit_id);

ALTER TABLE public.habit_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habit_links" ON public.habit_links;
CREATE POLICY "Users manage own habit_links"
  ON public.habit_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 6. routines
-- ============================================================

CREATE TABLE IF NOT EXISTS public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  time_of_day TEXT NOT NULL DEFAULT 'anytime'
    CHECK (time_of_day IN ('morning','afternoon','evening','anytime')),

  color TEXT,
  icon TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_user_active
  ON public.routines(user_id, is_active, sort_order);

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own routines" ON public.routines;
CREATE POLICY "Users manage own routines"
  ON public.routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 7. routine_steps (standalone — no FK to habits)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.routine_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,

  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_steps_routine_position
  ON public.routine_steps(routine_id, position);

ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own routine_steps" ON public.routine_steps;
CREATE POLICY "Users manage own routine_steps"
  ON public.routine_steps FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 8. routine_completions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,

  completion_date DATE NOT NULL,
  completed_step_ids UUID[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (routine_id, completion_date)
);

CREATE INDEX IF NOT EXISTS idx_routine_completions_user_date
  ON public.routine_completions(user_id, completion_date DESC);

ALTER TABLE public.routine_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own routine_completions" ON public.routine_completions;
CREATE POLICY "Users manage own routine_completions"
  ON public.routine_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 9. reminders
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE CASCADE,

  -- 'HH:MM' local wall clock; timezone interpreted from profile at fire time.
  time_of_day TEXT NOT NULL,
  -- Days the reminder fires (0=Sun..6=Sat). Empty = every day.
  days_of_week SMALLINT[] NOT NULL DEFAULT '{}',

  -- 'in_app' → shown as a banner on the Today view when the app is open.
  -- 'push'   → delivered via PWA web push.
  -- 'both'   → delivered both ways.
  channel TEXT NOT NULL DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'push', 'both')),

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (habit_id IS NOT NULL OR routine_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_active
  ON public.reminders(user_id, is_active);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reminders" ON public.reminders;
CREATE POLICY "Users manage own reminders"
  ON public.reminders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 10. ai_insights (cache for all habits AI features)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- One of: 'habit_builder' | 'routine_composer' | 'goal_to_habits'
  --        | 'weekly_review' | 'struggle_detection' | 'review_habit'
  --        | 'correlation_insight' | 'quarterly_narrative'
  kind TEXT NOT NULL,

  -- Optional pointer to a specific habit / routine / goal the insight is about.
  target_kind TEXT,
  target_id UUID,

  -- Hash of the input data used to generate this insight. Same hash + same
  -- language = cache hit. Regenerate only on hash mismatch.
  input_hash TEXT NOT NULL,

  -- Structured outputs land in content_json (Flash → habit builder etc.).
  -- Streaming prose outputs land in content_text (Pro → weekly review etc.).
  content_json JSONB,
  content_text TEXT,

  language TEXT NOT NULL,
  model_used TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, kind, input_hash, language)
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_target
  ON public.ai_insights(user_id, kind, target_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_recent
  ON public.ai_insights(user_id, kind, created_at DESC);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_insights" ON public.ai_insights;
CREATE POLICY "Users manage own ai_insights"
  ON public.ai_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 11. Backfill from *_legacy
-- ============================================================

-- Copy habits_legacy → habits. Old frequency values ('daily'|'weekly'|'custom')
-- map as follows: daily → {kind:daily}; weekly → {kind:weekly_count, count: target_count};
-- custom → {kind:daily} (safe default — the user can edit). target_count becomes
-- target_value for type = 'counter', otherwise null.
INSERT INTO public.habits (
  id, user_id, name, description, type, target_value, frequency, time_of_day,
  color, icon, sort_order, is_active, created_at, updated_at
)
SELECT
  l.id,
  l.user_id,
  l.name,
  l.description,
  CASE WHEN COALESCE(l.target_count, 1) > 1 THEN 'counter' ELSE 'checkbox' END,
  CASE WHEN COALESCE(l.target_count, 1) > 1 THEN l.target_count::numeric ELSE NULL END,
  CASE l.frequency
    WHEN 'daily'  THEN '{"kind":"daily"}'::jsonb
    WHEN 'weekly' THEN jsonb_build_object('kind', 'weekly_count', 'count', GREATEST(COALESCE(l.target_count, 1), 1))
    ELSE '{"kind":"daily"}'::jsonb
  END,
  'anytime',
  NULL,
  NULL,
  0,
  COALESCE(l.is_active, true),
  COALESCE(l.created_at, now()),
  COALESCE(l.updated_at, now())
FROM public.habits_legacy l
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'habits_legacy'
)
ON CONFLICT (id) DO NOTHING;

-- Copy habit_logs_legacy → habit_completions. Only rows that map to a habit
-- that now exists (RLS-friendly). Only `completed = true` rows become 'done';
-- rows with completed=false are treated as missed and skipped (we don't have a
-- skip-vs-miss signal in the legacy data).
INSERT INTO public.habit_completions (
  id, user_id, habit_id, completion_date, status, value, note, completed_at
)
SELECT
  l.id,
  l.user_id,
  l.habit_id,
  l.log_date,
  'done',
  CASE WHEN COALESCE(l.count, 0) > 0 THEN l.count::numeric ELSE NULL END,
  l.notes,
  COALESCE(l.created_at, now())
FROM public.habit_logs_legacy l
WHERE COALESCE(l.completed, false) = true
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'habit_logs_legacy'
  )
  AND EXISTS (
    SELECT 1 FROM public.habits h WHERE h.id = l.habit_id
  )
ON CONFLICT (habit_id, completion_date) DO NOTHING;

-- Copy routines_legacy → routines (metadata only — habit_ids[] is dropped).
INSERT INTO public.routines (
  id, user_id, name, description, time_of_day, sort_order, is_active, created_at, updated_at
)
SELECT
  l.id,
  l.user_id,
  l.name,
  l.description,
  'anytime',
  0,
  COALESCE(l.is_active, true),
  COALESCE(l.created_at, now()),
  COALESCE(l.updated_at, now())
FROM public.routines_legacy l
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'routines_legacy'
)
ON CONFLICT (id) DO NOTHING;

-- For every legacy routine row, turn its habit_ids[] into ordered routine_steps
-- whose titles are the referenced habit's name — keeps the UX continuous. The
-- FK is NOT preserved because Phase 1's routines are standalone; completing a
-- step no longer updates a habit.
INSERT INTO public.routine_steps (
  id, user_id, routine_id, position, title, description, duration_seconds
)
SELECT
  gen_random_uuid(),
  l.user_id,
  l.id,
  pos.ordinality::integer - 1,
  COALESCE(h.name, 'Step ' || pos.ordinality::text),
  NULL,
  NULL
FROM public.routines_legacy l
CROSS JOIN LATERAL unnest(l.habit_ids) WITH ORDINALITY AS pos(habit_id, ordinality)
LEFT JOIN public.habits h ON h.id = pos.habit_id
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'routines_legacy'
)
AND EXISTS (
  SELECT 1 FROM public.routines r WHERE r.id = l.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.routine_steps s WHERE s.routine_id = l.id
);
