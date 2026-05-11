-- Life OS Brain — cross-module relations table.
--
-- The Brain (`/brain` page) renders a global graph that connects every feature
-- in the app: Goals, Habits, Quotes, Projects, Tasks, Journal, etc. Most edges
-- are derived for free from existing FK columns (`tasks.project_id`,
-- `quotes.linked_goal_id`, `role_models.linked_goal_ids`, …) — but for cross-
-- module relations that *don't* have a natural FK (e.g. "this gratitude entry
-- is about that role model", or AI-suggested links between any two entities),
-- we need a generic store.
--
-- This table is the polymorphic equivalent of `knowledge_connections` but at
-- the Life OS level — `source_type` + `source_id` + `target_type` + `target_id`
-- can point to any entity in any of the 18 modules. Validity is enforced at
-- the application layer (we don't add hard FKs because the source/target may
-- live in any of dozens of tables).
--
-- Multi-user safety:
--   * `user_id` defaults to `auth.uid()` so inserts never need to pass it.
--   * RLS enforces `auth.uid() = user_id` for all CRUD operations.
--   * The table is published to `supabase_realtime` so the Brain UI can
--     subscribe to live changes without polling.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- brain_relations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  -- Source entity (e.g. a goal id with source_type = 'goal')
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,

  -- Target entity
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,

  -- Wire-format edge type from `ConstellationEdgeType`. Free-form text on the
  -- DB side so adding new edge types in the app does not require a migration;
  -- the application narrows it.
  relation_type TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'suggested', 'hidden', 'dismissed')),

  weight DOUBLE PRECISION,

  is_manual BOOLEAN NOT NULL DEFAULT false,
  is_ai_suggested BOOLEAN NOT NULL DEFAULT false,

  reason TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Same (source, target, type) triple from the same user is a duplicate;
  -- the app uses upsert semantics on this constraint.
  CONSTRAINT brain_relations_unique_triple
    UNIQUE (user_id, source_id, source_type, target_id, target_type, relation_type)
);

-- ============================================================
-- Indexes
-- ============================================================

-- Forward and reverse lookup so "what does X relate to?" stays cheap from
-- either direction without scanning the whole table.
CREATE INDEX IF NOT EXISTS brain_relations_user_source_idx
  ON public.brain_relations (user_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS brain_relations_user_target_idx
  ON public.brain_relations (user_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS brain_relations_user_relation_type_idx
  ON public.brain_relations (user_id, relation_type);

-- ============================================================
-- updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.brain_relations_set_updated_at()
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

DROP TRIGGER IF EXISTS brain_relations_set_updated_at ON public.brain_relations;
CREATE TRIGGER brain_relations_set_updated_at
  BEFORE UPDATE ON public.brain_relations
  FOR EACH ROW
  EXECUTE FUNCTION public.brain_relations_set_updated_at();

-- ============================================================
-- RLS — owner-only CRUD
-- ============================================================

ALTER TABLE public.brain_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_relations_select_own ON public.brain_relations;
CREATE POLICY brain_relations_select_own
  ON public.brain_relations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_relations_insert_own ON public.brain_relations;
CREATE POLICY brain_relations_insert_own
  ON public.brain_relations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_relations_update_own ON public.brain_relations;
CREATE POLICY brain_relations_update_own
  ON public.brain_relations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_relations_delete_own ON public.brain_relations;
CREATE POLICY brain_relations_delete_own
  ON public.brain_relations
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Realtime — publish for live Brain sync
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'brain_relations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_relations';
  END IF;
END $$;
