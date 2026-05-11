-- Career Vault Phase 4: shareable links, export bundles, opportunity pipeline.
-- All tables are additive and do not touch Phase 1-3 data. RLS is enabled for
-- every new table. The public share view is resolved exclusively through the
-- `resolve-share` edge function (service role); no permissive anon policy is
-- granted on the vault tables themselves.

-- ============================================================
-- 1. career_vault_bundles
-- Ordered collection of vault files packaged for export / sharing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_vault_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  bundle_type TEXT CHECK (bundle_type IN (
    'grad_school', 'tech_job', 'speaking', 'funding', 'custom'
  )),

  -- Ordered list of career_vault_files.id. Integrity is enforced in app code
  -- (we do not want a foreign-key array constraint that would break on file
  -- deletion — callers drop stale ids on export).
  file_order UUID[] NOT NULL DEFAULT '{}'::uuid[],

  include_cover_page BOOLEAN NOT NULL DEFAULT true,
  cover_title TEXT,
  cover_subtitle TEXT,
  cover_recipient TEXT,

  last_exported_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_vault_bundles
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_vault_bundles_user
  ON public.career_vault_bundles(user_id, updated_at DESC);

ALTER TABLE public.career_vault_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own bundles" ON public.career_vault_bundles;
CREATE POLICY "Users manage own bundles"
  ON public.career_vault_bundles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. career_vault_shares
-- Public links to a single file or a bundle. Password hashing is done in
-- app code (Web Crypto SHA-256 with a per-share salt); both the salt and
-- the hash live on the row.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_vault_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  share_token TEXT UNIQUE NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('single_file', 'bundle')),

  file_id UUID REFERENCES public.career_vault_files(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES public.career_vault_bundles(id) ON DELETE CASCADE,

  -- Optional password protection. We store salt + hash, never plaintext.
  password_salt TEXT,
  password_hash TEXT,

  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,

  recipient_label TEXT,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  watermark_enabled BOOLEAN NOT NULL DEFAULT false,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (share_type = 'single_file' AND file_id IS NOT NULL AND bundle_id IS NULL) OR
    (share_type = 'bundle'      AND bundle_id IS NOT NULL AND file_id IS NULL)
  ),
  CHECK (
    (password_salt IS NULL AND password_hash IS NULL) OR
    (password_salt IS NOT NULL AND password_hash IS NOT NULL)
  )
);

ALTER TABLE public.career_vault_shares
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_vault_shares_token
  ON public.career_vault_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_vault_shares_user
  ON public.career_vault_shares(user_id, created_at DESC);

ALTER TABLE public.career_vault_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own shares" ON public.career_vault_shares;
CREATE POLICY "Users manage own shares"
  ON public.career_vault_shares FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. share_access_logs
-- One row per public access attempt. IP is SHA-256-hashed before insert.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.share_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES public.career_vault_shares(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,
  user_agent TEXT,
  action TEXT NOT NULL CHECK (action IN ('viewed', 'downloaded', 'password_failed'))
);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_share
  ON public.share_access_logs(share_id, accessed_at DESC);

ALTER TABLE public.share_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own share logs" ON public.share_access_logs;
CREATE POLICY "Users view own share logs"
  ON public.share_access_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.career_vault_shares s
    WHERE s.id = share_access_logs.share_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users delete own share logs" ON public.share_access_logs;
CREATE POLICY "Users delete own share logs"
  ON public.share_access_logs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.career_vault_shares s
    WHERE s.id = share_access_logs.share_id AND s.user_id = auth.uid()
  ));

-- NOTE: anonymous inserts are NOT allowed. The `resolve-share` edge function
-- runs with the service role and writes access-log rows on behalf of the
-- viewer after token validation.

-- ============================================================
-- 4. career_opportunities
-- Pipeline rows the user is tracking. Linked files live in
-- attached_file_ids (UUID[] of career_vault_files.id).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.career_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  location TEXT,

  stage TEXT NOT NULL CHECK (stage IN (
    'researching', 'applied', 'phone_screen', 'interviewing',
    'offer', 'accepted', 'rejected', 'withdrawn'
  )) DEFAULT 'researching',

  job_description TEXT,
  job_url TEXT,
  salary_range TEXT,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,

  attached_file_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],

  excitement_score INTEGER CHECK (excitement_score BETWEEN 1 AND 10),
  match_score      INTEGER CHECK (match_score      BETWEEN 1 AND 10),

  applied_date DATE,
  next_action_date DATE,

  -- Stage timeline: keyed by stage id. Written app-side when stage changes.
  stage_history JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.career_opportunities
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_opportunities_user
  ON public.career_opportunities(user_id, stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_opportunities_attached
  ON public.career_opportunities USING GIN (attached_file_ids);

ALTER TABLE public.career_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own opportunities" ON public.career_opportunities;
CREATE POLICY "Users manage own opportunities"
  ON public.career_opportunities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. opportunity_interactions
-- Timeline of notes, emails, calls, interviews per opportunity.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.opportunity_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.career_opportunities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'note', 'email_sent', 'email_received', 'phone_call',
    'interview', 'offer_received', 'feedback'
  )),
  content TEXT NOT NULL,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunity_interactions
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_opp_interactions_opp
  ON public.opportunity_interactions(opportunity_id, happened_at DESC);

ALTER TABLE public.opportunity_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own interactions" ON public.opportunity_interactions;
CREATE POLICY "Users manage own interactions"
  ON public.opportunity_interactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
