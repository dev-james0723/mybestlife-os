import type { calendar_v3 } from "googleapis";

import { utcRangeToPlanMinutes } from "@/lib/daily-planner/plan-schedule-math";
import { GOOGLE_SYNC_SOURCE } from "@/lib/google/calendar-types";

export type GoogleCalendarBusyWindow = {
  id: string;
  title: string;
  /** Minutes from plan_date 00:00 in the user's configured timezone. */
  startMin: number;
  /** Minutes from plan_date 00:00 in the user's configured timezone. */
  endMin: number;
};

/**
 * Convert ordinary timed Google events into scheduler constraints.
 *
 * Transparent, cancelled, all-day, and My Best Life OS planner events are not
 * treated as commitments. All-day events are deliberately ignored because
 * birthdays and reminders commonly use that shape without consuming the day.
 */
export function googleEventsToBusyWindows(
  events: readonly calendar_v3.Schema$Event[],
  planDate: string,
  timeZone: string,
): GoogleCalendarBusyWindow[] {
  return events
    .flatMap((event, index) => {
      if (event.status === "cancelled" || event.transparency === "transparent") return [];
      if (event.extendedProperties?.private?.source === GOOGLE_SYNC_SOURCE) return [];

      const startIso = event.start?.dateTime;
      const endIso = event.end?.dateTime;
      if (!startIso || !endIso) return [];

      const start = new Date(startIso);
      const end = new Date(endIso);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return [];

      const { startMin, endMin } = utcRangeToPlanMinutes(planDate, start, end, timeZone);
      if (endMin <= startMin) return [];

      return [
        {
          id: event.id?.trim() || `google-event-${index}`,
          title: event.summary?.trim() || "Busy",
          startMin,
          endMin,
        },
      ];
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
}
