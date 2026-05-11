-- Starlight Log / grateful_things: client inserts omit user_id (repository uses
-- RLS-scoped Supabase client only). Without DEFAULT auth.uid(), NOT NULL user_id
-- rejects the row before RLS runs — save entry fails.

ALTER TABLE public.grateful_things ALTER COLUMN user_id SET DEFAULT auth.uid();
