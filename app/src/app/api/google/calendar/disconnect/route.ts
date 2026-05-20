import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteGoogleCalendarConnection } from "@/lib/google/calendar-connection-store";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await supabase.from("calendar_task_sync").delete().eq("user_id", user.id);
  await deleteGoogleCalendarConnection(supabase, user.id);
  return NextResponse.json({ ok: true });
}
