import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncDailyPlanDateBidirectionally } from "@/lib/google/calendar-sync";

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
    planDate = undefined;
  }

  if (!planDate || !/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return NextResponse.json(
      { error: "planDate required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const result = await syncDailyPlanDateBidirectionally({
    supabase,
    userId: user.id,
    planDate,
    direction: "both",
  });

  return NextResponse.json({
    ok: true,
    syncedAt: result.syncedAt,
    localPushed: result.localPushed,
    remoteFetched: result.remoteFetched,
    remoteMatched: result.remoteMatched,
    remoteApplied: result.remoteApplied,
    remoteIgnored: result.remoteIgnored,
    conflicts: result.conflicts,
    errors: result.errors,
    /** @deprecated use remoteApplied */
    processed: result.remoteApplied,
  });
}
