-- AI Knowledge — prompt folders (user-owned collections that group prompts).
--
-- A folder can hold BOTH curated library prompts and the user's own custom
-- prompts. Membership is polymorphic (mirrors `ai_prompt_runs`): each item row
-- references exactly one of `library_prompt_id` / `custom_prompt_id`. Library
-- prompts are referenced (not copied), so a folder never mutates the library.
--
-- Tables:
--   * ai_prompt_folders        (folder metadata: name, AI summary, emoji icon, accent color)
--   * ai_prompt_folder_items   (membership; one row per prompt-in-folder)
--
-- Conventions: additive-only; RLS scopes every row to its owner.

-- ============================================================
-- 1. ai_prompt_folders
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  -- One-sentence "what this folder collects" blurb (AI-generated or user-edited).
  summary TEXT,
  -- Single emoji representing the folder's contents.
  icon TEXT,
  -- Optional accent color (hex or token) for the folder card visual.
  color TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_prompt_folders_name_not_blank CHECK (length(btrim(name)) > 0)
);

ALTER TABLE public.ai_prompt_folders
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_ai_prompt_folders_user
  ON public.ai_prompt_folders(user_id, sort_order, updated_at DESC);

ALTER TABLE public.ai_prompt_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_prompt_folders" ON public.ai_prompt_folders;
CREATE POLICY "Users manage own ai_prompt_folders"
  ON public.ai_prompt_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. ai_prompt_folder_items  (polymorphic membership)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES public.ai_prompt_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  library_prompt_id UUID REFERENCES public.ai_prompt_library(id) ON DELETE CASCADE,
  custom_prompt_id UUID REFERENCES public.ai_user_prompts(id) ON DELETE CASCADE,

  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ai_prompt_folder_items_one_source CHECK (
    (library_prompt_id IS NOT NULL AND custom_prompt_id IS NULL) OR
    (library_prompt_id IS NULL AND custom_prompt_id IS NOT NULL)
  )
);

ALTER TABLE public.ai_prompt_folder_items
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- De-dupe membership per source (NULLs are distinct, so each partial unique
-- index only constrains rows of its own source).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_prompt_folder_items_library
  ON public.ai_prompt_folder_items(folder_id, library_prompt_id)
  WHERE library_prompt_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_prompt_folder_items_custom
  ON public.ai_prompt_folder_items(folder_id, custom_prompt_id)
  WHERE custom_prompt_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_prompt_folder_items_folder
  ON public.ai_prompt_folder_items(folder_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_folder_items_user
  ON public.ai_prompt_folder_items(user_id);

ALTER TABLE public.ai_prompt_folder_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own ai_prompt_folder_items" ON public.ai_prompt_folder_items;
CREATE POLICY "Users manage own ai_prompt_folder_items"
  ON public.ai_prompt_folder_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
