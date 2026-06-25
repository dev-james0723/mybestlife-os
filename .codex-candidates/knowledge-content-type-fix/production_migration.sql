-- Candidate production Supabase fix for Knowledge Base URL saves.
--
-- Root cause:
--   public.knowledge_items.content_type currently rejects modern app values
--   such as 'social', so Instagram Reel inserts fail with:
--   new row for relation "knowledge_items" violates check constraint
--   "knowledge_items_content_type_check".
--
-- This matches the existing repo migration:
--   app/supabase/migrations/20260607153816_knowledge_items_content_type_current_values.sql

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname::text
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'knowledge_items'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%content_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.knowledge_items DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_content_type_check
  CHECK (
    content_type IS NULL
    OR content_type = ANY (ARRAY[
      'article',
      'link',
      'video',
      'social',
      'podcast',
      'document',
      'paper',
      'book',
      'code',
      'repository',
      'dataset',
      'presentation',
      'photo',
      'quote',
      'note',
      'file'
    ]::text[])
  );
