import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { getGoogleCalendarClientForUser } from "@/lib/google/calendar-client";
import { updateGoogleCalendarWatch } from "@/lib/google/calendar-connection-store";

function watchTtlMs(): number {
  const hours = Number(process.env.GOOGLE_CALENDAR_WATCH_TTL_HOURS ?? "24");
  const h = Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24;
  return h * 3600 * 1000;
}

export async function renewGoogleCalendarWatch(args: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ channelId: string; expiration: string } | null> {
  const webhookUrl = process.env.GOOGLE_CALENDAR_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn("[google-calendar-watch] GOOGLE_CALENDAR_WEBHOOK_URL not set; skip watch");
    return null;
  }
  const client = await getGoogleCalendarClientForUser(args.supabase, args.userId);
  if (!client) return null;
  const { calendar, calendarId } = client;
  const channelId = randomBytes(16).toString("hex");
  const exp = Date.now() + watchTtlMs();
  const res = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      expiration: String(exp),
    },
  });
  const resourceId = res.data.resourceId ?? "";
  const expirationIso =
    typeof res.data.expiration === "string"
      ? new Date(Number(res.data.expiration)).toISOString()
      : new Date(exp).toISOString();
  await updateGoogleCalendarWatch(args.supabase, args.userId, {
    watch_channel_id: channelId,
    watch_resource_id: resourceId,
    watch_expiration: expirationIso,
  });
  return { channelId, expiration: expirationIso };
}
