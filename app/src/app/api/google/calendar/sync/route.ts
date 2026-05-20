import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runIncrementalGoogleCalendarSync } from "@/lib/google/calendar-sync";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { processed } = await runIncrementalGoogleCalendarSync({ supabase, userId: user.id });
  return NextResponse.json({ ok: true, processed });
}
