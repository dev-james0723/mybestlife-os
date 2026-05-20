import type { SupabaseClient } from "@supabase/supabase-js";

/** Distinct planner dates that still need a successful push to Google Calendar. */
export async function listPlanDatesWithPendingCalendarSync(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("calendar_task_sync")
    .select("plan_date")
    .eq("user_id", userId)
    .in("sync_status", ["local_pending", "error", "pending"]);
  return [...new Set((data ?? []).map((r) => r.plan_date as string).filter(Boolean))];
}
