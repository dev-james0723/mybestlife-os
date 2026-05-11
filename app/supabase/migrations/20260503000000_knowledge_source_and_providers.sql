-- Knowledge source-aware ingestion: fine-grained source type, provider adapter
-- metadata, extraction/transcript status, and display mode flags.
--
-- Also catches the live DB up on a prior YouTube-fields migration that was
-- missed (ai_content_overview, youtube_transcript, ai_video_chat_starters)
-- so re-running is safe and the DB converges to the full code expectations.
--
-- Fully additive and idempotent: every column is added via ADD COLUMN IF NOT
-- EXISTS and CHECK constraints are (re)created in a guarded DO block so that
-- re-running the migration is safe.

ALTER TABLE public.knowledge_items
  -- Catch-up columns from 20260421010000_knowledge_youtube_ai_fields
  ADD COLUMN IF NOT EXISTS ai_content_overview TEXT,
  ADD COLUMN IF NOT EXISTS youtube_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_video_chat_starters TEXT[] DEFAULT '{}',
  -- New source-aware ingestion columns
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS source_metadata JSONB,
  ADD COLUMN IF NOT EXISTS embed_html TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT,
  ADD COLUMN IF NOT EXISTS transcript_status TEXT,
  ADD COLUMN IF NOT EXISTS ask_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS display_mode_default TEXT,
  ADD COLUMN IF NOT EXISTS title_source TEXT,
  ADD COLUMN IF NOT EXISTS generated_title TEXT;

-- Backfill safe defaults so existing rows remain usable.
UPDATE public.knowledge_items
SET extraction_status = COALESCE(extraction_status, 'success')
WHERE extraction_status IS NULL;

UPDATE public.knowledge_items
SET transcript_status = COALESCE(transcript_status, 'not_applicable')
WHERE transcript_status IS NULL;

UPDATE public.knowledge_items
SET ask_enabled = COALESCE(ask_enabled, TRUE)
WHERE ask_enabled IS NULL;

UPDATE public.knowledge_items
SET title_source = COALESCE(title_source, 'extracted')
WHERE title_source IS NULL;

-- Category defaults derived from the legacy content_type so the sidebar
-- filters and card headers pick up a value immediately.
UPDATE public.knowledge_items
SET category = CASE content_type
                 WHEN 'article' THEN 'article'
                 WHEN 'video' THEN 'video'
                 WHEN 'podcast' THEN 'audio'
                 WHEN 'photo' THEN 'image'
                 WHEN 'file' THEN 'file'
                 WHEN 'note' THEN 'note'
                 ELSE 'note'
               END
WHERE category IS NULL;

-- CHECK constraints (recreate in guarded block so re-running is safe).
DO $$
BEGIN
  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_source_type_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_source_type_check
    CHECK (
      source_type IS NULL
      OR source_type = ANY (ARRAY[
        'article_url',
        'youtube_video',
        'youtube_shorts',
        'social_x_post',
        'social_facebook_post',
        'social_facebook_video_post',
        'social_instagram_post',
        'social_instagram_reel',
        'social_reddit_post',
        'github_repository',
        'html_input',
        'markdown_input',
        'code_python',
        'code_javascript',
        'code_typescript',
        'code_java',
        'code_php',
        'code_css',
        'code_sql',
        'code_bash',
        'code_json',
        'plain_text',
        'file_upload',
        'voice_memo',
        'url_other'
      ]::text[])
    );

  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_extraction_status_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_extraction_status_check
    CHECK (
      extraction_status IS NULL
      OR extraction_status = ANY (ARRAY[
        'success','partial','failed','blocked','requires_auth','unsupported'
      ]::text[])
    );

  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_transcript_status_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_transcript_status_check
    CHECK (
      transcript_status IS NULL
      OR transcript_status = ANY (ARRAY[
        'not_applicable','not_requested','generated','unavailable','failed'
      ]::text[])
    );

  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_display_mode_default_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_display_mode_default_check
    CHECK (
      display_mode_default IS NULL
      OR display_mode_default = ANY (ARRAY['preview','source']::text[])
    );

  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_title_source_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_title_source_check
    CHECK (
      title_source IS NULL
      OR title_source = ANY (ARRAY['extracted','generated','fallback']::text[])
    );
END $$;

-- Indexes useful for sidebar filters and provider queries.
CREATE INDEX IF NOT EXISTS knowledge_items_source_type_idx
  ON public.knowledge_items (user_id, source_type);
CREATE INDEX IF NOT EXISTS knowledge_items_category_idx
  ON public.knowledge_items (user_id, category);
CREATE INDEX IF NOT EXISTS knowledge_items_provider_idx
  ON public.knowledge_items (user_id, provider);

COMMENT ON COLUMN public.knowledge_items.source_type IS 'Fine-grained source type identifier (article_url, youtube_shorts, social_x_post, github_repository, code_python, ...).';
COMMENT ON COLUMN public.knowledge_items.provider IS 'Source provider (youtube, x, facebook, instagram, reddit, github, web, local).';
COMMENT ON COLUMN public.knowledge_items.label IS 'Human-facing label for the card (e.g. "X Post", "Instagram Reel").';
COMMENT ON COLUMN public.knowledge_items.category IS 'Broader grouping (article, video, audio, image, social_media, repository, code, note, file).';
COMMENT ON COLUMN public.knowledge_items.source_metadata IS 'Provider-specific metadata (author, channel, subreddit, publish date, repo stars, etc.).';
COMMENT ON COLUMN public.knowledge_items.embed_html IS 'Sanitized provider embed HTML for in-app rendering (social posts, etc.).';
COMMENT ON COLUMN public.knowledge_items.extraction_status IS 'Provider extraction outcome (success, partial, failed, blocked, requires_auth, unsupported).';
COMMENT ON COLUMN public.knowledge_items.transcript_status IS 'YouTube transcript pipeline state (not_applicable, not_requested, generated, unavailable, failed).';
COMMENT ON COLUMN public.knowledge_items.ask_enabled IS 'Whether Ask-the-Document / Ask-the-Video UI is available for this item.';
COMMENT ON COLUMN public.knowledge_items.display_mode_default IS 'Default display mode for code/markup cards (preview or source).';
COMMENT ON COLUMN public.knowledge_items.title_source IS 'How the stored title was obtained (extracted from source, generated by AI, or fallback).';
COMMENT ON COLUMN public.knowledge_items.generated_title IS 'AI-suggested title preserved separately from the user-editable `title`.';
