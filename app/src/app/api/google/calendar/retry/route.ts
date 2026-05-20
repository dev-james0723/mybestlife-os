import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { retryFailedCalendarSync } from "@/lib/google/calendar-sync";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await retryFailedCalendarSync({ supabase, userId: user.id });
  return NextResponse.json({ ok: true });
}
