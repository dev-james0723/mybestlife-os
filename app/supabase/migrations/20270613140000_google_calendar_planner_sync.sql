-- Google Calendar ↔ Daily Planner (Time Block) sync — connection + per-task sync state.
-- Tokens use the same AES-256-GCM layout as social_connections (TOKEN_ENCRYPTION_KEY).

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  google_account_email text,
  access_token_ct text,
  access_token_iv text,
  access_token_tag text,
  refresh_token_ct text NOT NULL,
  refresh_token_iv text NOT NULL,
  refresh_token_tag text NOT NULL,
  token_expiry timestamptz,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  calendar_id text NOT NULL DEFAULT 'primary',
  sync_enabled boolean NOT NULL DEFAULT true,
  sync_token text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expiration timestamptz,
  last_full_sync_at timestamptz,
  last_incremental_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_connections_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS google_calendar_connections_watch_channel_idx
  ON public.google_calendar_connections (watch_channel_id)
  WHERE watch_channel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_google_calendar_connections_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS google_calendar_connections_set_updated_at
  ON public.google_calendar_connections;
CREATE TRIGGER google_calendar_connections_set_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_google_calendar_connections_set_updated_at();

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS google_calendar_connections_select_own ON public.google_calendar_connections;
DROP POLICY IF EXISTS google_calendar_connections_modify_own ON public.google_calendar_connections;

CREATE POLICY google_calendar_connections_select_own
  ON public.google_calendar_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY google_calendar_connections_modify_own
  ON public.google_calendar_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.calendar_task_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  daily_plan_id uuid REFERENCES public.daily_plans (id) ON DELETE CASCADE,
  planner_task_id text NOT NULL,
  plan_date date NOT NULL,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  google_event_id text,
  google_event_etag text,
  google_event_ical_uid text,
  google_event_updated_at timestamptz,
  local_last_modified_at timestamptz,
  last_synced_at timestamptz,
  last_sync_origin text CHECK (
    last_sync_origin IS NULL OR last_sync_origin IN ('local', 'google', 'system')
  ),
  sync_status text NOT NULL DEFAULT 'pending' CHECK (
    sync_status IN (
      'not_connected',
      'pending',
      'synced',
      'local_pending',
      'remote_pending',
      'remote_deleted',
      'conflict',
      'error',
      'paused'
    )
  ),
  sync_error_message text,
  conflict_payload jsonb,
  google_duration_rounded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_task_sync_user_planner_task_unique UNIQUE (user_id, planner_task_id)
);

CREATE INDEX IF NOT EXISTS calendar_task_sync_user_plan_date_idx
  ON public.calendar_task_sync (user_id, plan_date);

CREATE INDEX IF NOT EXISTS calendar_task_sync_google_event_idx
  ON public.calendar_task_sync (user_id, google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_calendar_task_sync_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_task_sync_set_updated_at ON public.calendar_task_sync;
CREATE TRIGGER calendar_task_sync_set_updated_at
  BEFORE UPDATE ON public.calendar_task_sync
  FOR EACH ROW EXECUTE FUNCTION public.tg_calendar_task_sync_set_updated_at();

ALTER TABLE public.calendar_task_sync ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_task_sync_select_own ON public.calendar_task_sync;
DROP POLICY IF EXISTS calendar_task_sync_modify_own ON public.calendar_task_sync;

CREATE POLICY calendar_task_sync_select_own
  ON public.calendar_task_sync FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY calendar_task_sync_modify_own
  ON public.calendar_task_sync FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.google_calendar_connections IS
  'Google OAuth tokens (encrypted) + Calendar API sync metadata; one row per user.';

COMMENT ON TABLE public.calendar_task_sync IS
  'Maps Daily Planner time-block rows (planner_task_id on daily_plans.tasks JSON) to Google Calendar events.';
