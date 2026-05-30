-- Notes inserts (e.g. Signals → Brain) must satisfy RLS: auth.uid() = user_id.
-- Match other domain tables: default user_id to the signed-in user when omitted.
ALTER TABLE public.notes
  ALTER COLUMN user_id SET DEFAULT auth.uid();
