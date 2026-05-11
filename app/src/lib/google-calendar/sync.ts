import { GOOGLE_CALENDAR_EVENTS_ENDPOINT, MYLIFEOS_SYNC_PROP_KEY } from "./constants";
import type { GoogleCalendarEventBody } from "./plan-to-events";
import { planDateCleanupEndUtc, zonedWallClockToUtc } from "./zoned-time";

type GCalEvent = { id?: string };

async function gcalJson<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Google Calendar API error (${res.status})`);
  }
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

async function listSyncedEventsForPlanDate(
  accessToken: string,
  planDate: string,
  timeZone: string,
): Promise<GCalEvent[]> {
  const timeMin = zonedWallClockToUtc(planDate, 0, 0, timeZone).toISOString();
  // Use a 48h window so cross-midnight events tagged with this planDate are still discoverable.
  const timeMax = planDateCleanupEndUtc(planDate, timeZone);
  const propFilter = `${MYLIFEOS_SYNC_PROP_KEY}=${planDate}`;
  const collected: GCalEvent[] = [];
  let pageToken: string | undefined;

  do {
    const qs = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      privateExtendedProperty: propFilter,
      maxResults: "250",
    });
    if (pageToken) qs.set("pageToken", pageToken);

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?${qs.toString()}`;
    const data = await gcalJson<{
      items?: GCalEvent[];
      nextPageToken?: string;
    }>(accessToken, url);
    collected.push(...(data.items ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return collected;
}

async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`;
  await gcalJson(accessToken, url, { method: "DELETE" });
}

async function insertEvent(
  accessToken: string,
  body: GoogleCalendarEventBody,
): Promise<void> {
  await gcalJson(accessToken, GOOGLE_CALENDAR_EVENTS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type SyncDailyPlanToGoogleResult = {
  createdCount: number;
  removedPreviousCount: number;
};

/**
 * Replaces previously synced planner events for `planDate`, then inserts fresh events.
 */
export async function syncDailyPlanToGoogleCalendar(
  accessToken: string,
  planDate: string,
  timeZone: string,
  events: GoogleCalendarEventBody[],
): Promise<SyncDailyPlanToGoogleResult> {
  const existing = await listSyncedEventsForPlanDate(accessToken, planDate, timeZone);
  for (const ev of existing) {
    if (ev.id) await deleteEvent(accessToken, ev.id);
  }
  for (const ev of events) {
    await insertEvent(accessToken, ev);
  }
  return {
    createdCount: events.length,
    removedPreviousCount: existing.length,
  };
}
