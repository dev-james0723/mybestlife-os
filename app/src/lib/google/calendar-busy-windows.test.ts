import { describe, expect, it } from "vitest";
import type { calendar_v3 } from "googleapis";

import { googleEventsToBusyWindows } from "@/lib/google/calendar-busy-windows";
import { GOOGLE_SYNC_SOURCE } from "@/lib/google/calendar-types";

describe("googleEventsToBusyWindows", () => {
  it("returns real timed commitments and ignores transparent, all-day, cancelled, and planner-owned events", () => {
    const events: calendar_v3.Schema$Event[] = [
      {
        id: "meeting",
        summary: "Project review",
        start: { dateTime: "2026-09-03T14:00:00.000Z" },
        end: { dateTime: "2026-09-03T15:30:00.000Z" },
      },
      {
        id: "free",
        transparency: "transparent",
        start: { dateTime: "2026-09-03T16:00:00.000Z" },
        end: { dateTime: "2026-09-03T17:00:00.000Z" },
      },
      {
        id: "all-day",
        start: { date: "2026-09-03" },
        end: { date: "2026-09-04" },
      },
      {
        id: "cancelled",
        status: "cancelled",
        start: { dateTime: "2026-09-03T18:00:00.000Z" },
        end: { dateTime: "2026-09-03T19:00:00.000Z" },
      },
      {
        id: "planner-owned",
        start: { dateTime: "2026-09-03T20:00:00.000Z" },
        end: { dateTime: "2026-09-03T21:00:00.000Z" },
        extendedProperties: { private: { source: GOOGLE_SYNC_SOURCE } },
      },
    ];

    expect(googleEventsToBusyWindows(events, "2026-09-03", "UTC")).toEqual([
      {
        id: "meeting",
        title: "Project review",
        startMin: 14 * 60,
        endMin: 15 * 60 + 30,
      },
    ]);
  });

  it("keeps a next-day commitment on the same cross-midnight planner timeline", () => {
    const events: calendar_v3.Schema$Event[] = [
      {
        id: "late",
        summary: "Late call",
        start: { dateTime: "2026-09-04T01:00:00.000Z" },
        end: { dateTime: "2026-09-04T02:00:00.000Z" },
      },
    ];

    expect(googleEventsToBusyWindows(events, "2026-09-03", "UTC")[0]).toMatchObject({
      startMin: 25 * 60,
      endMin: 26 * 60,
    });
  });
});
