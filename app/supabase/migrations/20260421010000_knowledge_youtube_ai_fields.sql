-- YouTube-specific knowledge: structured overview, captions transcript, chat starters
ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS ai_content_overview TEXT,
  ADD COLUMN IF NOT EXISTS youtube_transcript TEXT,
  ADD COLUMN IF NOT EXISTS ai_video_chat_starters TEXT[] DEFAULT '{}';
