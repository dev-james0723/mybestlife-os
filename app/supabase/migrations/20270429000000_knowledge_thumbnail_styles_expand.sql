-- Expand allowed knowledge_items.thumbnail_style values for six new AI styles.

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
      'glassmorphism',
      'three_d_render',
      'editorial',
      'isometric',
      'brutalist',
      'retro_y2k',
      'na'
    ]::text[]))
  );
