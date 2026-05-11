-- Allow thumbnail_style = 'na' (no AI-generated thumbnail; title-based card).
-- Without this, inserts fail when the DB enforces allowed values for thumbnail_style.

-- 1) If thumbnail_style uses a Postgres ENUM, add label 'na'.
DO $$
DECLARE
  t_oid oid;
  nsp text;
  typ text;
  is_enum boolean;
BEGIN
  SELECT a.atttypid INTO t_oid
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'knowledge_items'
    AND a.attname = 'thumbnail_style'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF t_oid IS NULL THEN
    RETURN;
  END IF;

  SELECT typtype = 'e' INTO is_enum FROM pg_type WHERE oid = t_oid;
  IF NOT is_enum THEN
    RETURN;
  END IF;

  SELECT ns.nspname, ty.typname INTO nsp, typ
  FROM pg_type ty
  JOIN pg_namespace ns ON ns.oid = ty.typnamespace
  WHERE ty.oid = t_oid;

  BEGIN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE ''na''', nsp, typ);
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 2) Replace CHECK constraints that reference thumbnail_style with one that includes 'na'.
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
      AND pg_get_constraintdef(con.oid) ILIKE '%thumbnail_style%'
  LOOP
    EXECUTE format('ALTER TABLE public.knowledge_items DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE public.knowledge_items
  DROP CONSTRAINT IF EXISTS knowledge_items_thumbnail_style_check;

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_thumbnail_style_check
  CHECK (
    thumbnail_style IS NULL
    OR (thumbnail_style::text = ANY (ARRAY[
      'minimal',
      'gradient',
      'illustrated',
      'photographic',
      'abstract',
      'na'
    ]::text[]))
  );
