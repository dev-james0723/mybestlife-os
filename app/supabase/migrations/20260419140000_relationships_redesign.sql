-- Relationships: full redesign for the personal-CRM gallery view.
--
-- Why a redesign and not an additive migration?
--   The original `relationships` table modelled a simple {name, type,
--   description, contact_info jsonb, linked_project_ids uuid[]} shape that
--   served the legacy /relationships page. The new Relationship sub-tab
--   inside the Relationship main tab is a richer personal CRM with
--   per-person photo, category, strength, last-contact tracking, next
--   action + due date, commitments, tags, and favorites.
--
--   The two shapes diverge enough (16 new columns, two columns dropped,
--   one column reshaped from uuid[] to a single FK) that renaming the
--   legacy table and starting fresh is cleaner than a 16-column ALTER
--   followed by data fixups.
--
-- Data preservation:
--   The legacy table is renamed to `relationships_legacy`, NOT dropped.
--   No data is lost. RLS policies and indexes follow the rename. Any
--   future migration script can backfill from `relationships_legacy` if
--   desired; the app no longer references it.
--
-- App impact:
--   This migration changes the shape that `Relationship` (in
--   types/database.ts) describes. The corresponding repository, hook,
--   and view are updated in the same release. The legacy view is stubbed
--   to a "coming soon" placeholder until Phase 2 ships the new UI.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Rename legacy table out of the way (data preserved).
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.relationships RENAME TO relationships_legacy;

-- ---------------------------------------------------------------------------
-- 2. Create the new `relationships` table.
--
-- Conventions matched against the rest of the codebase:
--   - id: uuid PK, gen_random_uuid()
--   - user_id: uuid NOT NULL DEFAULT auth.uid(), FK to auth.users with
--     ON DELETE CASCADE (matches role_models, projects, etc.)
--   - timestamps: timestamptz, defaults to now(), updated_at maintained
--     by a per-domain trigger (matches set_health_updated_at pattern)
--   - enums in DB: stored as TEXT (slug form) for forward-compat. Display
--     labels are translated in the UI layer; CHECK constraints would
--     couple schema migrations to copy decisions, which we want to avoid.
-- ---------------------------------------------------------------------------
CREATE TABLE public.relationships (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID NOT NULL DEFAULT auth.uid()
                               REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity ---------------------------------------------------------------
  person_name                TEXT NOT NULL,
  photo_url                  TEXT,

  -- Classification (slugged enums; see types/relationship.ts) --------------
  category                   TEXT NOT NULL,
  relationship_strength      TEXT NOT NULL DEFAULT 'new',

  -- Contact ----------------------------------------------------------------
  email                      TEXT,
  phone                      TEXT,

  -- Interaction history ----------------------------------------------------
  last_contact_date          DATE,
  last_interaction_notes     TEXT,

  -- Forward-looking --------------------------------------------------------
  next_action                TEXT,
  next_action_date           DATE,

  -- Long-form context ------------------------------------------------------
  commitments_made           TEXT,
  preferences_and_details    TEXT,
  general_notes              TEXT,

  -- Cross-cutting search/filter -------------------------------------------
  tags                       TEXT[] NOT NULL DEFAULT '{}',

  -- Linkage ---------------------------------------------------------------
  linked_project_id          UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  -- Gallery state ---------------------------------------------------------
  is_favorite                BOOLEAN NOT NULL DEFAULT false,

  -- Audit -----------------------------------------------------------------
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Filter / sort indexes for the gallery view.
--
-- The gallery is sorted client-side, but the indexes still help by
-- bounding the per-user row scan and accelerating the favorites filter
-- (partial index — only true rows live in the index).
-- ---------------------------------------------------------------------------
CREATE INDEX relationships_user_created_idx
  ON public.relationships (user_id, created_at DESC);

CREATE INDEX relationships_user_favorite_idx
  ON public.relationships (user_id, is_favorite)
  WHERE is_favorite = true;

CREATE INDEX relationships_user_category_idx
  ON public.relationships (user_id, category);

CREATE INDEX relationships_user_last_contact_idx
  ON public.relationships (user_id, last_contact_date DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger — per-domain function to match the codebase
--    convention (set_health_updated_at, etc.).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_relationships_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_relationships_updated_at ON public.relationships;
CREATE TRIGGER trg_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_relationships_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security — self-only.
--
-- The original loop in schema.sql created policies named "Users can view
-- own relationships" etc. against the OLD table. After the rename those
-- policies still exist but are attached to `relationships_legacy`, where
-- they continue to be correct. We create fresh policies on the new table
-- with identical names + semantics.
-- ---------------------------------------------------------------------------
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own relationships" ON public.relationships;
DROP POLICY IF EXISTS "Users can insert own relationships" ON public.relationships;
DROP POLICY IF EXISTS "Users can update own relationships" ON public.relationships;
DROP POLICY IF EXISTS "Users can delete own relationships" ON public.relationships;

CREATE POLICY "Users can view own relationships"
ON public.relationships FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own relationships"
ON public.relationships FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationships"
ON public.relationships FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationships"
ON public.relationships FOR DELETE
USING (auth.uid() = user_id);

COMMIT;
