-- Allow "website" and "other" resource categories (Create Project related links).

ALTER TABLE project_resources DROP CONSTRAINT IF EXISTS project_resources_category_check;

ALTER TABLE project_resources
  ADD CONSTRAINT project_resources_category_check
  CHECK (
    category IN (
      'article',
      'video',
      'podcast',
      'news',
      'image',
      'website',
      'other'
    )
  );
