-- Repair grateful_things inserts from the client.
-- The client intentionally omits user_id, so Supabase must fill it from auth.uid().

ALTER TABLE public.grateful_things
  ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.grateful_things
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE public.grateful_things
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

ALTER TABLE public.grateful_things
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.grateful_things
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.grateful_things ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own grateful_things" ON public.grateful_things;
DROP POLICY IF EXISTS "Users can insert own grateful_things" ON public.grateful_things;
DROP POLICY IF EXISTS "Users can update own grateful_things" ON public.grateful_things;
DROP POLICY IF EXISTS "Users can delete own grateful_things" ON public.grateful_things;

CREATE POLICY "Users can view own grateful_things"
ON public.grateful_things
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own grateful_things"
ON public.grateful_things
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grateful_things"
ON public.grateful_things
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own grateful_things"
ON public.grateful_things
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
