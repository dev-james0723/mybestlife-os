import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePlannerCalendarConflict } from "@/lib/google/calendar-sync";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { plannerTaskId?: string; planDate?: string; action?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { plannerTaskId, planDate, action } = body;
  if (!plannerTaskId || !planDate || !action) {
    return NextResponse.json({ error: "plannerTaskId, planDate, action required" }, { status: 400 });
  }
  if (!["local", "google", "unlink"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }
  await resolvePlannerCalendarConflict({
    supabase,
    userId: user.id,
    plannerTaskId,
    planDate,
    action: action as "local" | "google" | "unlink",
  });
  return NextResponse.json({ ok: true });
}
