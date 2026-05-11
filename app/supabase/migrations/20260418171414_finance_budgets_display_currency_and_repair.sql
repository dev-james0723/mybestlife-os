-- Applied to linked Supabase project via MCP (same name/version as remote schema_migrations).
-- Profiles: display_currency. Finance: finance_budgets + RLS + user_id default.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'USD';

UPDATE public.profiles
SET display_currency = upper(trim(display_currency))
WHERE display_currency IS NOT NULL;

UPDATE public.profiles
SET display_currency = 'USD'
WHERE display_currency IS NULL OR display_currency !~ '^[A-Z]{3}$';

ALTER TABLE public.profiles
  ALTER COLUMN display_currency SET DEFAULT 'USD';

ALTER TABLE public.profiles
  ALTER COLUMN display_currency SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_display_currency_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_currency_format
  CHECK (display_currency ~ '^[A-Z]{3}$');

COMMENT ON COLUMN public.profiles.display_currency IS 'ISO 4217 code for Finance page display and FX conversion base.';

CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  category_id UUID NOT NULL REFERENCES public.finance_categories(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  limit_amount NUMERIC NOT NULL CHECK (limit_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT finance_budgets_period_order CHECK (period_start <= period_end),
  CONSTRAINT finance_budgets_user_category_period_unique UNIQUE (user_id, category_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS finance_budgets_user_period_idx
  ON public.finance_budgets (user_id, period_start, period_end);

ALTER TABLE public.finance_budgets
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own finance_budgets" ON public.finance_budgets;
DROP POLICY IF EXISTS "Users can insert own finance_budgets" ON public.finance_budgets;
DROP POLICY IF EXISTS "Users can update own finance_budgets" ON public.finance_budgets;
DROP POLICY IF EXISTS "Users can delete own finance_budgets" ON public.finance_budgets;

CREATE POLICY "Users can view own finance_budgets"
  ON public.finance_budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finance_budgets"
  ON public.finance_budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finance_budgets"
  ON public.finance_budgets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own finance_budgets"
  ON public.finance_budgets FOR DELETE
  USING (auth.uid() = user_id);
