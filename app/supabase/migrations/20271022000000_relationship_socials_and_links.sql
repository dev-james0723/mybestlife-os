-- Relationship editor: social profiles and links to Life OS entities.
--
-- The redesigned relationship table originally kept only one project FK.
-- Keep that legacy column as a compatibility mirror while adding array-backed
-- links for the richer editor. UUID-array membership follows the established
-- role_models/ideas convention in this codebase.

BEGIN;

ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_project_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_goal_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_note_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_idea_ids UUID[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'relationships_social_links_array_check'
      AND conrelid = 'public.relationships'::regclass
  ) THEN
    ALTER TABLE public.relationships
      ADD CONSTRAINT relationships_social_links_array_check
      CHECK (jsonb_typeof(social_links) = 'array');
  END IF;
END
$$;

-- Provenance makes "Add to Role Model" retry-safe without coupling the two
-- records' lifecycles. Deleting a relationship keeps the Role Model profile.
ALTER TABLE public.role_models
  ADD COLUMN IF NOT EXISTS source_relationship_id UUID
    REFERENCES public.relationships(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS role_models_source_relationship_unique_idx
  ON public.role_models (source_relationship_id);

-- Preserve every existing singular project link in the new multi-link field.
UPDATE public.relationships
SET linked_project_ids = ARRAY[linked_project_id] || linked_project_ids
WHERE linked_project_id IS NOT NULL
  AND NOT (linked_project_id = ANY(linked_project_ids));

CREATE INDEX IF NOT EXISTS relationships_linked_project_ids_idx
  ON public.relationships USING gin (linked_project_ids);

CREATE INDEX IF NOT EXISTS relationships_linked_goal_ids_idx
  ON public.relationships USING gin (linked_goal_ids);

CREATE INDEX IF NOT EXISTS relationships_linked_note_ids_idx
  ON public.relationships USING gin (linked_note_ids);

CREATE INDEX IF NOT EXISTS relationships_linked_idea_ids_idx
  ON public.relationships USING gin (linked_idea_ids);

COMMENT ON COLUMN public.relationships.social_links IS
  'JSON array of {platform, url} public profile links.';
COMMENT ON COLUMN public.relationships.linked_project_ids IS
  'Projects explicitly linked from the relationship editor.';
COMMENT ON COLUMN public.relationships.linked_goal_ids IS
  'Goals explicitly linked from the relationship editor.';
COMMENT ON COLUMN public.relationships.linked_note_ids IS
  'Notes explicitly linked from the relationship editor.';
COMMENT ON COLUMN public.relationships.linked_idea_ids IS
  'Ideas explicitly linked from the relationship editor.';
COMMENT ON COLUMN public.role_models.source_relationship_id IS
  'Relationship that seeded this Role Model profile; used for idempotent conversion.';

COMMIT;
