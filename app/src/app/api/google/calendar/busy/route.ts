import { NextResponse } from "next/server";
import type { calendar_v3 } from "googleapis";

import { googleEventsToBusyWindows } from "@/lib/google/calendar-busy-windows";
import { getGoogleCalendarClientForUser } from "@/lib/google/calendar-client";
import {
  planDateCleanupEndUtc,
  zonedWallClockToUtc,
} from "@/lib/google-calendar/zoned-time";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PLAN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().toLowerCase() === "auto") {
    return "UTC";
  }

  const candidate = value.trim();
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "UTC";
  }
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planDate = new URL(request.url).searchParams.get("planDate")?.trim() ?? "";
  if (!PLAN_DATE_PATTERN.test(planDate)) {
    return NextResponse.json({ error: "A valid planDate is required." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const timeZone = normalizeTimeZone(profile?.timezone);

  try {
    const client = await getGoogleCalendarClientForUser(supabase, user.id);
    if (!client) {
      return NextResponse.json(
        { connected: false, timeZone, busy: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const events: calendar_v3.Schema$Event[] = [];
    const timeMin = zonedWallClockToUtc(planDate, 0, 0, timeZone).toISOString();
    const timeMax = planDateCleanupEndUtc(planDate, timeZone);
    let pageToken: string | undefined;

    do {
      const response = await client.calendar.events.list({
        calendarId: client.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        showDeleted: false,
        orderBy: "startTime",
        maxResults: 250,
        pageToken,
      });
      events.push(...(response.data.items ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return NextResponse.json(
      {
        connected: true,
        timeZone,
        busy: googleEventsToBusyWindows(events, planDate, timeZone),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "[AutoPlan] Unable to load Google Calendar busy windows",
      error instanceof Error ? error.message : "unknown_error",
    );
    return NextResponse.json(
      { error: "Unable to load Google Calendar availability." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
