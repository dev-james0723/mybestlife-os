-- Bucket List · Phase 7 — Realized dreams & memory.
--
-- Additive columns on the existing reflections table so a completed dream can
-- become a richer memory:
--   - changed_me : the user's own answer to "what changed in me?"
--   - ai_memory  : structured AI interpretation of the user's reflection
--                  (what happened / why it mattered / what changed / learned /
--                   life chapter / what it unlocked). Interpretation of the
--                   user's own words — never invented events.
--
-- RLS already governs bucket_reflections (auth.uid() = user_id); no policy
-- changes needed.

ALTER TABLE public.bucket_reflections
  ADD COLUMN IF NOT EXISTS changed_me text,
  ADD COLUMN IF NOT EXISTS ai_memory jsonb;
