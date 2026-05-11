-- Quote Library — Wisdom Profile cache (Phase 4).

CREATE TABLE IF NOT EXISTS public.quote_wisdom_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  quote_count_at_compute INTEGER NOT NULL CHECK (quote_count_at_compute >= 0),
  category_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  monthly_insight TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  manual_refresh_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_wisdom_profiles_user
  ON public.quote_wisdom_profiles (user_id);

ALTER TABLE public.quote_wisdom_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quote_wisdom_profiles" ON public.quote_wisdom_profiles;
CREATE POLICY "Users manage own quote_wisdom_profiles"
  ON public.quote_wisdom_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_quote_wisdom_profiles_updated_at ON public.quote_wisdom_profiles;
CREATE TRIGGER trg_quote_wisdom_profiles_updated_at
  BEFORE UPDATE ON public.quote_wisdom_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();
