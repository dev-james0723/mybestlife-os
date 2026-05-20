import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getGoogleCalendarConnectionByWatchChannel } from "@/lib/google/calendar-connection-store";
import { runIncrementalGoogleCalendarSync } from "@/lib/google/calendar-sync";

export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceId = req.headers.get("x-goog-resource-id");
  if (!channelId) {
    return new NextResponse(null, { status: 200 });
  }
  try {
    const admin = createServiceRoleSupabaseClient();
    const row = await getGoogleCalendarConnectionByWatchChannel(admin, channelId);
    if (!row) {
      return new NextResponse(null, { status: 200 });
    }
    if (
      resourceId &&
      row.watch_resource_id &&
      row.watch_resource_id.length > 0 &&
      row.watch_resource_id !== resourceId
    ) {
      return new NextResponse(null, { status: 200 });
    }
    await runIncrementalGoogleCalendarSync({ supabase: admin, userId: row.user_id });
  } catch (e) {
    console.error("[google-calendar/webhook]", e);
  }
  return new NextResponse(null, { status: 200 });
}
