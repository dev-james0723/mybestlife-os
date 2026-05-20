import type { SupabaseClient } from "@supabase/supabase-js";
import type { calendar_v3 } from "googleapis";
import type { CalendarSyncStatus, CalendarLastSyncOrigin } from "@/lib/google/calendar-types";

const TABLE = "calendar_task_sync";

export async function getTaskSyncRow(
  supabase: SupabaseClient,
  userId: string,
  plannerTaskId: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("planner_task_id", plannerTaskId)
    .maybeSingle();
  if (error) throw new Error(`getTaskSyncRow: ${error.message}`);
  return data;
}

export async function listTaskSyncForPlanDate(
  supabase: SupabaseClient,
  userId: string,
  planDate: string,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate);
  if (error) throw new Error(`listTaskSyncForPlanDate: ${error.message}`);
  return data ?? [];
}

export async function listTaskSyncPending(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
) {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .in("sync_status", ["local_pending", "pending", "error"])
    .limit(limit);
  if (error) throw new Error(`listTaskSyncPending: ${error.message}`);
  return data ?? [];
}

export async function upsertTaskSyncFields(
  supabase: SupabaseClient,
  row: {
    user_id: string;
    daily_plan_id: string | null;
    planner_task_id: string;
    plan_date: string;
    google_calendar_id?: string;
    google_event_id?: string | null;
    google_event_etag?: string | null;
    google_event_ical_uid?: string | null;
    google_event_updated_at?: string | null;
    local_last_modified_at?: string | null;
    last_synced_at?: string | null;
    last_sync_origin?: CalendarLastSyncOrigin | null;
    sync_status: CalendarSyncStatus;
    sync_error_message?: string | null;
    conflict_payload?: unknown | null;
    google_duration_rounded?: boolean;
  },
) {
  const { error } = await supabase.from(TABLE).upsert(
    {
      ...row,
      google_calendar_id: row.google_calendar_id ?? "primary",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,planner_task_id" },
  );
  if (error) throw new Error(`upsertTaskSyncFields: ${error.message}`);
}

export async function deleteTaskSyncRow(
  supabase: SupabaseClient,
  userId: string,
  plannerTaskId: string,
) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("planner_task_id", plannerTaskId);
  if (error) throw new Error(`deleteTaskSyncRow: ${error.message}`);
}

export function eventMeta(ev: calendar_v3.Schema$Event): {
  etag: string | null;
  iCalUID: string | null;
  updated: string | null;
} {
  return {
    etag: ev.etag ?? null,
    iCalUID: ev.iCalUID ?? null,
    updated: ev.updated ?? null,
  };
}
