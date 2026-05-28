-- Ideas AI enrichment: cross-module semantic links, explainable related
-- resources, and public geometric card icons generated from non-sensitive
-- abstract prompts.

ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS linked_goal_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_idea_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS related_resource_refs jsonb NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_ideas_linked_goal_ids
  ON public.ideas USING gin (linked_goal_ids);

CREATE INDEX IF NOT EXISTS idx_ideas_linked_idea_ids
  ON public.ideas USING gin (linked_idea_ids);

CREATE INDEX IF NOT EXISTS idx_ideas_related_resource_refs
  ON public.ideas USING gin (related_resource_refs);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'idea-card-icons',
  'idea-card-icons',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Idea card icons are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own idea card icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own idea card icons" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own idea card icons" ON storage.objects;

CREATE POLICY "Idea card icons are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'idea-card-icons');

CREATE POLICY "Users can insert own idea card icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'idea-card-icons'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own idea card icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'idea-card-icons'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'idea-card-icons'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own idea card icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'idea-card-icons'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
