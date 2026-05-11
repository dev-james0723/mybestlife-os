-- Add Threads posts to the Knowledge source-aware ingestion constraint.
-- The source-aware columns already exist; this only widens the allowed
-- source_type values so social_threads_post inserts do not fail.

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
        'social_threads_post',
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
END $$;

COMMENT ON COLUMN public.knowledge_items.source_type IS 'Fine-grained source type identifier (article_url, youtube_shorts, social_x_post, social_threads_post, github_repository, code_python, ...).';
