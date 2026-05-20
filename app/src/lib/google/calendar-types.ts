/** Google Calendar API private extended property keys (string values). */
export const GOOGLE_SYNC_SOURCE = "my_best_life_os";

export type CalendarSyncStatus =
  | "not_connected"
  | "pending"
  | "synced"
  | "local_pending"
  | "remote_pending"
  | "remote_deleted"
  | "conflict"
  | "error"
  | "paused";

export type CalendarLastSyncOrigin = "local" | "google" | "system";

export type GoogleCalendarConnectionRow = {
  id: string;
  user_id: string;
  google_account_email: string | null;
  access_token_ct: string | null;
  access_token_iv: string | null;
  access_token_tag: string | null;
  refresh_token_ct: string;
  refresh_token_iv: string;
  refresh_token_tag: string;
  token_expiry: string | null;
  scopes: string[];
  calendar_id: string;
  sync_enabled: boolean;
  sync_token: string | null;
  watch_channel_id: string | null;
  watch_resource_id: string | null;
  watch_expiration: string | null;
  last_full_sync_at: string | null;
  last_incremental_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarTaskSyncRow = {
  id: string;
  user_id: string;
  daily_plan_id: string | null;
  planner_task_id: string;
  plan_date: string;
  google_calendar_id: string;
  google_event_id: string | null;
  google_event_etag: string | null;
  google_event_ical_uid: string | null;
  google_event_updated_at: string | null;
  local_last_modified_at: string | null;
  last_synced_at: string | null;
  last_sync_origin: CalendarLastSyncOrigin | null;
  sync_status: CalendarSyncStatus;
  sync_error_message: string | null;
  conflict_payload: unknown | null;
  google_duration_rounded: boolean;
  created_at: string;
  updated_at: string;
};
