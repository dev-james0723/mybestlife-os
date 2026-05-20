import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const planDate = req.nextUrl.searchParams.get("planDate");
  if (!planDate || !/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return NextResponse.json({ error: "planDate query (YYYY-MM-DD) required" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("calendar_task_sync")
    .select("planner_task_id, sync_status, sync_error_message")
    .eq("user_id", user.id)
    .eq("plan_date", planDate);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const byTask: Record<string, { sync_status: string; sync_error_message: string | null }> = {};
  for (const row of data ?? []) {
    const pid = row.planner_task_id as string;
    byTask[pid] = {
      sync_status: row.sync_status as string,
      sync_error_message: (row.sync_error_message as string | null) ?? null,
    };
  }
  return NextResponse.json({ planDate, tasks: byTask });
}
