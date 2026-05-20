import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { renewGoogleCalendarWatch } from "@/lib/google/calendar-watch";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const out = await renewGoogleCalendarWatch({ supabase, userId: user.id });
  if (!out) {
    return NextResponse.json({ ok: false, message: "watch_not_configured" }, { status: 200 });
  }
  return NextResponse.json({ ok: true, ...out });
}
