import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGoogleCalendarConnection } from "@/lib/google/calendar-connection-store";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await getGoogleCalendarConnection(supabase, user.id);
  if (!conn) {
    return NextResponse.json({
      connected: false,
      syncEnabled: false,
      email: null,
      watchExpiration: null,
      lastIncrementalSyncAt: null,
      lastFullSyncAt: null,
      pendingCount: 0,
      errorCount: 0,
      conflictCount: 0,
      remoteDeletedCount: 0,
    });
  }
  const { data: syncAgg } = await supabase
    .from("calendar_task_sync")
    .select("sync_status")
    .eq("user_id", user.id);
  const rows = syncAgg ?? [];
  const pendingCount = rows.filter((r) =>
    ["pending", "local_pending", "remote_pending"].includes(r.sync_status as string),
  ).length;
  const errorCount = rows.filter((r) => (r.sync_status as string) === "error").length;
  const conflictCount = rows.filter((r) => (r.sync_status as string) === "conflict").length;
  const remoteDeletedCount = rows.filter((r) => (r.sync_status as string) === "remote_deleted").length;

  return NextResponse.json({
    connected: true,
    syncEnabled: conn.row.sync_enabled,
    email: conn.row.google_account_email,
    watchExpiration: conn.row.watch_expiration,
    lastIncrementalSyncAt: conn.row.last_incremental_sync_at,
    lastFullSyncAt: conn.row.last_full_sync_at,
    pendingCount,
    errorCount,
    conflictCount,
    remoteDeletedCount,
  });
}
