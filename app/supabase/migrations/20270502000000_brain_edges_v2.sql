-- Connected Brain Engine — `brain_edges` v2.
--
-- The earlier `brain_relations` table (20270501000000) stored simple
-- cross-module links. The Connected Brain Engine adds:
--
--   * `strength` and `confidence` as first-class numeric columns so
--     density filters and visual weighting can read them directly.
--   * `source_method` to track which generator produced the edge
--     (explicit / tag / life_area / entity / time / embedding / llm /
--     user_*). Critical for "show only suggested" / "show only explicit"
--     density modes.
--   * `evidence` JSONB for structured per-edge audit data — used by the
--     orphan resolver to dedupe rejected suggestions ("don't show me this
--     suggestion again") via a content hash.
--   * `evidence_hash` for stable dedup so the same evidence does not
--     cause the rejected suggestion to reappear.
--   * `last_scored_at` so the engine can prefer recent scores.
--
-- We keep the older `brain_relations` table read-compatible — the bridge
-- in `lib/brain/adapters/brain-relations-bridge.ts` reads both. New writes
-- (suggestions, user-confirmed edges) always go to `brain_edges`.
--
-- Multi-user safety: same as `brain_relations` — `user_id DEFAULT
-- auth.uid()`, RLS owner-only, and the table is added to the
-- `supabase_realtime` publication for live Brain updates.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- brain_edges
-- ============================================================

CREATE TABLE IF NOT EXISTS public.brain_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),

  -- Source / target — Brain-namespaced ids ("goal::abc-uuid"). Validity is
  -- enforced at the application layer because a node may live in any
  -- of dozens of source tables.
  source_node_id TEXT NOT NULL,
  source_node_type TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  target_node_type TEXT NOT NULL,

  -- Wire-format edge type (BrainEdgeType in the app). Free-form so
  -- adding a new edge type doesn't require a migration.
  relationship_type TEXT NOT NULL,

  -- Engine-friendly fields.
  strength DOUBLE PRECISION NOT NULL DEFAULT 0.0
    CHECK (strength >= 0 AND strength <= 1),
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0
    CHECK (confidence >= 0 AND confidence <= 1),
  reason TEXT NOT NULL DEFAULT '',
  source_method TEXT NOT NULL DEFAULT 'explicit',

  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'suggested', 'hidden', 'rejected')),

  -- Structured per-edge audit. Used to compute evidence_hash so rejected
  -- suggestions don't reappear unless the underlying evidence changes.
  evidence JSONB,
  evidence_hash TEXT,

  -- Provenance flags (compat with the older table).
  is_manual BOOLEAN NOT NULL DEFAULT false,
  is_ai_suggested BOOLEAN NOT NULL DEFAULT false,
  auto_generated BOOLEAN NOT NULL DEFAULT false,

  metadata JSONB,

  -- Lifecycle timestamps.
  last_scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- The same (source, target, relationship_type, source_method) triple
  -- from the same user is a duplicate — the app uses upsert semantics
  -- on this constraint.
  CONSTRAINT brain_edges_unique_triple
    UNIQUE (user_id, source_node_id, target_node_id, relationship_type, source_method)
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS brain_edges_user_source_idx
  ON public.brain_edges (user_id, source_node_type, source_node_id);
CREATE INDEX IF NOT EXISTS brain_edges_user_target_idx
  ON public.brain_edges (user_id, target_node_type, target_node_id);
CREATE INDEX IF NOT EXISTS brain_edges_user_status_idx
  ON public.brain_edges (user_id, status);
CREATE INDEX IF NOT EXISTS brain_edges_user_relation_idx
  ON public.brain_edges (user_id, relationship_type);
CREATE INDEX IF NOT EXISTS brain_edges_user_method_idx
  ON public.brain_edges (user_id, source_method);
-- Strength descending — for "give me my N strongest edges".
CREATE INDEX IF NOT EXISTS brain_edges_user_strength_idx
  ON public.brain_edges (user_id, strength DESC);
-- Evidence hash — for "has this same suggestion been rejected before?".
CREATE INDEX IF NOT EXISTS brain_edges_user_evidence_hash_idx
  ON public.brain_edges (user_id, source_node_id, target_node_id, evidence_hash)
  WHERE evidence_hash IS NOT NULL;

-- ============================================================
-- Trigger: keep updated_at fresh
-- ============================================================

CREATE OR REPLACE FUNCTION public.brain_edges_set_updated_at()
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

DROP TRIGGER IF EXISTS brain_edges_set_updated_at ON public.brain_edges;
CREATE TRIGGER brain_edges_set_updated_at
  BEFORE UPDATE ON public.brain_edges
  FOR EACH ROW
  EXECUTE FUNCTION public.brain_edges_set_updated_at();

-- ============================================================
-- RLS — owner-only CRUD
-- ============================================================

ALTER TABLE public.brain_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brain_edges_select_own ON public.brain_edges;
CREATE POLICY brain_edges_select_own
  ON public.brain_edges
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_edges_insert_own ON public.brain_edges;
CREATE POLICY brain_edges_insert_own
  ON public.brain_edges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_edges_update_own ON public.brain_edges;
CREATE POLICY brain_edges_update_own
  ON public.brain_edges
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS brain_edges_delete_own ON public.brain_edges;
CREATE POLICY brain_edges_delete_own
  ON public.brain_edges
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Realtime — publish for live Brain sync
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'brain_edges'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.brain_edges';
  END IF;
END $$;
