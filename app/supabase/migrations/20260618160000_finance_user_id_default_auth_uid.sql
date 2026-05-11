-- Finance inserts from the app omit user_id; RLS requires auth.uid() = user_id.
-- Set DB default so inserts succeed; app also sends user_id explicitly for clarity.

ALTER TABLE public.finance_accounts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.finance_categories ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.finance_transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.finance_savings_goals ALTER COLUMN user_id SET DEFAULT auth.uid();
