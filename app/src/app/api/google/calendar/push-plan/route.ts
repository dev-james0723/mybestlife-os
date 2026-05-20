import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  pushPlannerPlanForDate,
  retryFailedCalendarSync,
  syncDailyPlanDateBidirectionally,
} from "@/lib/google/calendar-sync";

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let planDate: string | undefined;
  try {
    const body = (await req.json()) as { planDate?: string };
    planDate = body.planDate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!planDate || !/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return NextResponse.json({ error: "planDate required (YYYY-MM-DD)" }, { status: 400 });
  }
  const result = await pushPlannerPlanForDate({ supabase, userId: user.id, planDate });
  let remoteUpdatesProcessed = 0;
  if (result.syncedAt) {
    try {
      await retryFailedCalendarSync({ supabase, userId: user.id });
      const pull = await syncDailyPlanDateBidirectionally({
        supabase,
        userId: user.id,
        planDate,
        direction: "pull",
      });
      remoteUpdatesProcessed = pull.remoteApplied;
    } catch (e) {
      console.warn("[push-plan] pull after push failed:", e);
    }
  }
  return NextResponse.json({ ...result, remoteUpdatesProcessed });
}
