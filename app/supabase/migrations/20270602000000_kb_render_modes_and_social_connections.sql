-- Knowledge Base: render-mode-aware ingestion + per-user social OAuth connections.
--
-- Adds:
--   1. knowledge_items.render_mode  — which UI variant the card renders
--   2. knowledge_items.preview_status — the 17-value precise outcome (in addition
--      to the legacy 6-value extraction_status, which is preserved for
--      backwards compatibility and only widened, never replaced)
--   3. knowledge_items.checked_at + screenshot_url — health-check + snapshot
--   4. social_connections — encrypted OAuth tokens (AES-256-GCM, ciphertext +
--      iv + tag stored separately so we can rotate the key)
--   5. knowledge_assets — auto/user snapshots + AI thumbnails + OG images
--
-- Fully additive and idempotent: every column uses ADD COLUMN IF NOT EXISTS,
-- every CHECK is dropped-then-added in a guarded DO block, and every CREATE
-- TABLE is IF NOT EXISTS so the migration is safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. knowledge_items: render_mode, preview_status, checked_at, screenshot_url
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS render_mode TEXT,
  ADD COLUMN IF NOT EXISTS preview_status TEXT,
  ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Backfill render_mode from existing source_type + embed_html.
-- Conservative defaults: only providers known to render reliably get
-- 'true_live_embed'. IG / FB are demoted to 'metadata_preview' regardless of
-- whether embed_html exists, because their iframes silently failed in the
-- prior implementation. The cascade will upgrade them to 'auto_snapshot' on
-- the next detail-view open.
UPDATE public.knowledge_items
SET render_mode = CASE
  WHEN render_mode IS NOT NULL THEN render_mode

  WHEN source_type IN ('social_x_post', 'social_reddit_post', 'youtube_video', 'youtube_shorts')
       AND embed_html IS NOT NULL AND length(embed_html) > 0
    THEN 'true_live_embed'

  WHEN source_type = 'social_threads_post'
       AND embed_html IS NOT NULL AND length(embed_html) > 0
    THEN 'true_live_embed'

  WHEN source_type IN ('social_instagram_post', 'social_instagram_reel',
                       'social_facebook_post', 'social_facebook_video_post')
    THEN 'metadata_preview'

  WHEN source_type = 'github_repository'
    THEN 'authenticated_preview'

  -- article / code / file / note / etc. don't have a preview-mode concept —
  -- leave NULL so the UI keeps using its existing rendering path.
  ELSE NULL
END
WHERE render_mode IS NULL;

-- Backfill preview_status from legacy extraction_status, narrowing where we
-- can, falling back to a safe 'metadata_success' otherwise.
UPDATE public.knowledge_items
SET preview_status = CASE
  WHEN preview_status IS NOT NULL THEN preview_status

  WHEN extraction_status = 'success' AND render_mode = 'true_live_embed'        THEN 'embed_success'
  WHEN extraction_status = 'success' AND render_mode = 'authenticated_preview'  THEN 'authenticated_data_success'
  WHEN extraction_status = 'success' AND render_mode = 'auto_snapshot'          THEN 'auto_snapshot_success'
  WHEN extraction_status = 'success' AND render_mode = 'metadata_preview'       THEN 'metadata_success'
  WHEN extraction_status = 'success' AND render_mode = 'user_snapshot'          THEN 'user_snapshot_success'
  WHEN extraction_status = 'success'                                            THEN 'metadata_success'

  WHEN extraction_status = 'partial'         THEN 'metadata_unavailable'
  WHEN extraction_status = 'failed'          THEN 'extraction_failed'
  WHEN extraction_status = 'blocked'         THEN 'private_or_restricted'
  WHEN extraction_status = 'requires_auth'   THEN 'login_required'
  WHEN extraction_status = 'unsupported'     THEN 'unsupported_url'

  ELSE NULL
END
WHERE preview_status IS NULL;

-- Backfill checked_at to date_modified so health-check has a baseline.
UPDATE public.knowledge_items
SET checked_at = COALESCE(checked_at, date_modified, date_added)
WHERE checked_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CHECK constraints for the new enums
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_render_mode_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_render_mode_check
    CHECK (
      render_mode IS NULL
      OR render_mode = ANY (ARRAY[
        'true_live_embed',
        'authenticated_preview',
        'auto_snapshot',
        'metadata_preview',
        'user_snapshot',
        'unavailable'
      ]::text[])
    );

  ALTER TABLE public.knowledge_items
    DROP CONSTRAINT IF EXISTS knowledge_items_preview_status_check;
  ALTER TABLE public.knowledge_items
    ADD CONSTRAINT knowledge_items_preview_status_check
    CHECK (
      preview_status IS NULL
      OR preview_status = ANY (ARRAY[
        -- success-side
        'embed_success',
        'authenticated_data_success',
        'auto_snapshot_success',
        'metadata_success',
        'user_snapshot_success',
        -- error / restricted-side
        'login_required',
        'private_or_restricted',
        'age_restricted',
        'geo_restricted',
        'deleted_or_unavailable',
        'unsupported_url',
        'api_permission_missing',
        'app_review_required',
        'rate_limited',
        'metadata_unavailable',
        'screenshot_failed',
        'extraction_failed'
      ]::text[])
    );
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes for sidebar filters and health-check sweeps
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS knowledge_items_render_mode_idx
  ON public.knowledge_items (user_id, render_mode);

CREATE INDEX IF NOT EXISTS knowledge_items_checked_at_idx
  ON public.knowledge_items (user_id, checked_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. social_connections — encrypted OAuth token storage
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tokens are encrypted with AES-256-GCM keyed by TOKEN_ENCRYPTION_KEY (server
-- env, 32-byte base64). Ciphertext, IV, and auth tag are stored as separate
-- base64 columns so the encryption key can be rotated by re-encrypting in
-- place per row. Even if a client somehow read the row via RLS, the token is
-- unrecoverable without the key — but the API layer should never expose
-- token columns anyway: prefer routing token reads through the server using
-- the service role.
--
-- provider values:
--   'meta'   — covers Instagram + Facebook + Threads (single Meta OAuth)
--   'x'      — Twitter / X
--   'reddit' — Reddit
--   'github' — GitHub
-- (One Meta connection grants access to all three Meta surfaces, matching
-- how Meta's Login flow actually works in production.)

CREATE TABLE IF NOT EXISTS public.social_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL,
  provider_account_id  TEXT,
  account_name         TEXT,
  account_handle       TEXT,
  -- AES-256-GCM access token components (all base64).
  access_token_ct      TEXT NOT NULL,
  access_token_iv      TEXT NOT NULL,
  access_token_tag     TEXT NOT NULL,
  -- Refresh token is provider-optional (X / GitHub don't issue them).
  refresh_token_ct     TEXT,
  refresh_token_iv     TEXT,
  refresh_token_tag    TEXT,
  scopes               TEXT[] NOT NULL DEFAULT '{}',
  expires_at           TIMESTAMPTZ,
  status               TEXT NOT NULL DEFAULT 'active',
  last_checked_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

DO $$
BEGIN
  ALTER TABLE public.social_connections
    DROP CONSTRAINT IF EXISTS social_connections_provider_check;
  ALTER TABLE public.social_connections
    ADD CONSTRAINT social_connections_provider_check
    CHECK (provider = ANY (ARRAY['meta','x','reddit','github']::text[]));

  ALTER TABLE public.social_connections
    DROP CONSTRAINT IF EXISTS social_connections_status_check;
  ALTER TABLE public.social_connections
    ADD CONSTRAINT social_connections_status_check
    CHECK (status = ANY (ARRAY['active','expired','disconnected','error']::text[]));
END $$;

CREATE INDEX IF NOT EXISTS social_connections_user_provider_idx
  ON public.social_connections (user_id, provider);
CREATE INDEX IF NOT EXISTS social_connections_status_idx
  ON public.social_connections (user_id, status);

-- updated_at auto-bump
CREATE OR REPLACE FUNCTION public.tg_social_connections_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS social_connections_set_updated_at ON public.social_connections;
CREATE TRIGGER social_connections_set_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_social_connections_set_updated_at();

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS social_connections_select_own ON public.social_connections;
  DROP POLICY IF EXISTS social_connections_modify_own ON public.social_connections;

  CREATE POLICY social_connections_select_own
    ON public.social_connections FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY social_connections_modify_own
    ON public.social_connections FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. knowledge_assets — auto / user snapshots + AI / OG thumbnails
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Files live in the existing `knowledge-files` Supabase Storage bucket under
-- conventional prefixes:
--   snapshots/{user_id}/{uuid}.png       — auto + user snapshots
--   thumbnails/{user_id}/{uuid}.{ext}    — AI-generated thumbnails
--   og/{user_id}/{uuid}.{ext}            — cached OG images
--
-- A single knowledge_item can have multiple assets (e.g. an auto snapshot AND
-- an AI thumbnail AND an OG image cached for offline). UI picks the best one
-- to display based on render_mode + asset_type.

CREATE TABLE IF NOT EXISTS public.knowledge_assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_item_id  UUID NOT NULL REFERENCES public.knowledge_items(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type         TEXT NOT NULL,
  storage_path       TEXT NOT NULL,
  public_url         TEXT,
  source             TEXT,
  mime_type          TEXT,
  byte_size          INTEGER,
  width              INTEGER,
  height             INTEGER,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  ALTER TABLE public.knowledge_assets
    DROP CONSTRAINT IF EXISTS knowledge_assets_asset_type_check;
  ALTER TABLE public.knowledge_assets
    ADD CONSTRAINT knowledge_assets_asset_type_check
    CHECK (
      asset_type = ANY (ARRAY[
        'auto_snapshot',
        'user_snapshot',
        'og_image',
        'ai_thumbnail',
        'media_thumbnail'
      ]::text[])
    );

  ALTER TABLE public.knowledge_assets
    DROP CONSTRAINT IF EXISTS knowledge_assets_source_check;
  ALTER TABLE public.knowledge_assets
    ADD CONSTRAINT knowledge_assets_source_check
    CHECK (
      source IS NULL
      OR source = ANY (ARRAY[
        'playwright',
        'screenshot_service',
        'user_upload',
        'og_meta',
        'ai_gen',
        'provider_api'
      ]::text[])
    );
END $$;

CREATE INDEX IF NOT EXISTS knowledge_assets_item_type_idx
  ON public.knowledge_assets (knowledge_item_id, asset_type);
CREATE INDEX IF NOT EXISTS knowledge_assets_user_idx
  ON public.knowledge_assets (user_id);

ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS knowledge_assets_select_own ON public.knowledge_assets;
  DROP POLICY IF EXISTS knowledge_assets_modify_own ON public.knowledge_assets;

  CREATE POLICY knowledge_assets_select_own
    ON public.knowledge_assets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

  CREATE POLICY knowledge_assets_modify_own
    ON public.knowledge_assets FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Documentation
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.knowledge_items.render_mode IS
  'Which preview UI variant to render: true_live_embed, authenticated_preview, auto_snapshot, metadata_preview, user_snapshot, unavailable. NULL for legacy non-preview items (article, code, file, note).';

COMMENT ON COLUMN public.knowledge_items.preview_status IS
  'Precise 17-value preview outcome (embed_success, login_required, app_review_required, rate_limited, ...). Coexists with extraction_status for backwards compat.';

COMMENT ON COLUMN public.knowledge_items.checked_at IS
  'Last time the cascade verified this preview is still valid. Health-check on detail-view open re-evaluates if older than ~24h.';

COMMENT ON COLUMN public.knowledge_items.screenshot_url IS
  'Public URL of the canonical snapshot image (auto_snapshot or user_snapshot). Mirrored from knowledge_assets for fast card rendering without a join.';

COMMENT ON TABLE public.social_connections IS
  'Per-user OAuth connections. Tokens encrypted AES-256-GCM via TOKEN_ENCRYPTION_KEY env. Never expose token columns to clients — route reads through the service role API layer.';

COMMENT ON TABLE public.knowledge_assets IS
  'Snapshots, AI thumbnails, OG image caches for knowledge_items. Storage paths are within the knowledge-files Supabase bucket.';
