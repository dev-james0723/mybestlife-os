import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateGoogleCalendarSyncMeta } from "@/lib/google/calendar-connection-store";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { syncEnabled?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.syncEnabled !== "boolean") {
    return NextResponse.json({ error: "syncEnabled boolean required" }, { status: 400 });
  }
  const { data: row } = await supabase
    .from("google_calendar_connections")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 });
  }
  await updateGoogleCalendarSyncMeta(supabase, user.id, { sync_enabled: body.syncEnabled });
  return NextResponse.json({ ok: true, syncEnabled: body.syncEnabled });
}
