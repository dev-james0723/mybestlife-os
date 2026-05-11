-- Add new AI processing fields to knowledge_items
ALTER TABLE knowledge_items
  ADD COLUMN IF NOT EXISTS ai_tldr TEXT,
  ADD COLUMN IF NOT EXISTS ai_key_quotes TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_questions_answered TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_action_items TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS depth_indicator TEXT CHECK (depth_indicator IN ('intro', 'intermediate', 'technical', 'reference')),
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS processing_step TEXT;
