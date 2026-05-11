-- Quote Library AI usage ledger + daily pick cache (Phase 3).

CREATE TABLE IF NOT EXISTS public.quote_ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  kind TEXT NOT NULL CHECK (kind IN (
    'source_intelligence',
    'smart_tagging',
    'daily_quote',
    'wisdom',
    'inspire'
  )),
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quote_ai_usage_unique UNIQUE (user_id, kind, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_quote_ai_usage_user_kind_date
  ON public.quote_ai_usage (user_id, kind, usage_date DESC);

ALTER TABLE public.quote_ai_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quote_ai_usage" ON public.quote_ai_usage;
CREATE POLICY "Users manage own quote_ai_usage"
  ON public.quote_ai_usage FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_quote_ai_usage_updated_at ON public.quote_ai_usage;
CREATE TRIGGER trg_quote_ai_usage_updated_at
  BEFORE UPDATE ON public.quote_ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();


-- Cached daily picks so QoTD is deterministic per user per day.
CREATE TABLE IF NOT EXISTS public.quote_daily_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  reason_text TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quote_daily_picks_unique UNIQUE (user_id, pick_date)
);

CREATE INDEX IF NOT EXISTS idx_quote_daily_picks_user_date
  ON public.quote_daily_picks (user_id, pick_date DESC);

ALTER TABLE public.quote_daily_picks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own quote_daily_picks" ON public.quote_daily_picks;
CREATE POLICY "Users manage own quote_daily_picks"
  ON public.quote_daily_picks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
