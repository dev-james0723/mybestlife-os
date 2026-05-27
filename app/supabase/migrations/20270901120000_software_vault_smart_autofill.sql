-- Smart autofill metadata: pricing plans, alternatives, field provenance, confidence.

ALTER TABLE public.software_vault
  ADD COLUMN IF NOT EXISTS pricing_plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS selected_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (
    billing_cycle IS NULL OR billing_cycle IN (
      'monthly', 'annually', 'one-time', 'usage-based', 'unknown'
    )
  ),
  ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS alternative_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS field_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS field_confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pricing_last_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_software_vault_pricing_plans
  ON public.software_vault USING gin (pricing_plans);

CREATE INDEX IF NOT EXISTS idx_software_vault_field_confidence
  ON public.software_vault USING gin (field_confidence);
