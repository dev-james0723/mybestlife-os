import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  retryFailedCalendarSync,
  runIncrementalGoogleCalendarSync,
} from "@/lib/google/calendar-sync";
import { renewGoogleCalendarWatch } from "@/lib/google/calendar-watch";

function pollingFallbackEnabled(): boolean {
  const v = process.env.GOOGLE_CALENDAR_POLLING_FALLBACK_ENABLED?.trim().toLowerCase();
  return v !== "false" && v !== "0";
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleSupabaseClient();
  const { data: connections, error } = await admin
    .from("google_calendar_connections")
    .select("user_id, watch_expiration, sync_enabled")
    .eq("sync_enabled", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const renewBeforeMs = 2 * 3600 * 1000;
  let renewed = 0;
  let retriedUsers = 0;
  let incrementalRuns = 0;

  for (const c of connections ?? []) {
    const userId = c.user_id as string;
    const exp = c.watch_expiration ? Date.parse(String(c.watch_expiration)) : 0;
    if (!Number.isFinite(exp) || exp < now + renewBeforeMs) {
      try {
        const r = await renewGoogleCalendarWatch({ supabase: admin, userId });
        if (r) renewed++;
      } catch (e) {
        console.warn("[google-calendar/cron] renew watch failed", userId, e);
      }
    }
    try {
      await retryFailedCalendarSync({ supabase: admin, userId });
      retriedUsers++;
    } catch (e) {
      console.warn("[google-calendar/cron] retry failed", userId, e);
    }
    if (pollingFallbackEnabled()) {
      try {
        await runIncrementalGoogleCalendarSync({ supabase: admin, userId });
        incrementalRuns++;
      } catch (e) {
        console.warn("[google-calendar/cron] incremental failed", userId, e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    users: (connections ?? []).length,
    renewed,
    retriedUsers,
    incrementalRuns,
  });
}
