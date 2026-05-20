import { describe, expect, it } from "vitest";
import type { calendar_v3 } from "googleapis";
import {
  calculateTimeBlocksFromDateRange,
  googleCalendarEventToTaskPatch,
  normalizeCrossDayTaskTimes,
  plannerTaskMatchesGooglePatch,
  resolvePlannerDateFromDateTime,
  taskToGoogleCalendarEvent,
} from "@/lib/google/calendar-encoding";
import { PLANNER_GOOGLE_REMINDERS } from "@/lib/google/calendar-reminders";
import { detectBidirectionalConflict } from "@/lib/google/calendar-conflicts";

describe("calendar-encoding", () => {
  it("taskToGoogleCalendarEvent sets reminders and extended props", () => {
    const ev = taskToGoogleCalendarEvent(
      { plannerTaskId: "pt-1", taskName: "見朋友", blocks: 6 },
      { startMinFromPlanMidnight: 14 * 60, endMinFromPlanMidnight: 15 * 60 },
      {
        planDate: "2026-05-19",
        planStartTime: "09:00",
        planId: "plan-uuid",
        userId: "user-uuid",
        timeZone: "Asia/Taipei",
        blockMinutes: 10,
        notes: "Bring gift",
      },
    );
    expect(ev.summary).toBe("見朋友");
    expect(ev.reminders?.useDefault).toBe(false);
    expect(ev.reminders?.overrides).toEqual(PLANNER_GOOGLE_REMINDERS);
    expect(ev.extendedProperties?.private?.taskId).toBe("pt-1");
    expect(ev.extendedProperties?.private?.plannerDate).toBe("2026-05-19");
    expect(ev.description).toContain("Bring gift");
  });

  it("googleCalendarEventToTaskPatch maps duration to blocks and wall times", () => {
    const ev: calendar_v3.Schema$Event = {
      summary: "Disney",
      start: { dateTime: "2026-05-20T18:00:00", timeZone: "Asia/Taipei" },
      end: { dateTime: "2026-05-20T19:30:00", timeZone: "Asia/Taipei" },
    };
    const patch = googleCalendarEventToTaskPatch(ev, {
      planDate: "2026-05-20",
      timeZone: "Asia/Taipei",
      planStartMin: 10 * 60,
      blockMinutes: 10,
      previousEndMin: 18 * 60 - 10 * 60,
    });
    expect(patch.blocks).toBe(9);
    expect(patch.start_time).toBe("18:00");
    expect(patch.end_time).toBe("19:30");
    expect(patch.googleDurationRounded).toBe(false);
  });

  it("calculateTimeBlocksFromDateRange detects rounding", () => {
    const start = new Date("2026-01-01T10:00:00.000Z");
    const end = new Date("2026-01-01T10:44:00.000Z");
    const { blocks, rounded } = calculateTimeBlocksFromDateRange(start, end, 10);
    expect(blocks).toBe(4);
    expect(rounded).toBe(true);
  });

  it("normalizeCrossDayTaskTimes wraps end past midnight", () => {
    const r = normalizeCrossDayTaskTimes(23 * 60, 22 * 60);
    expect(r.endMin - r.startMin).toBeGreaterThan(0);
  });

  it("resolvePlannerDateFromDateTime uses IANA zone", () => {
    const d = resolvePlannerDateFromDateTime("2026-05-20T22:00:00.000Z", "America/Los_Angeles");
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("plannerTaskMatchesGooglePatch compares fields", () => {
    expect(
      plannerTaskMatchesGooglePatch(
        { plannerTaskId: "a", taskName: "Hi", blocks: 3, gapBlocks: 0 },
        { taskName: "Hi", blocks: 3, gapBlocks: 0 },
      ),
    ).toBe(true);
    expect(
      plannerTaskMatchesGooglePatch(
        { plannerTaskId: "a", taskName: "Hi", blocks: 3 },
        { taskName: "Bye" },
      ),
    ).toBe(false);
  });
});

describe("calendar-conflicts", () => {
  it("detectBidirectionalConflict requires etag change and both sides dirty", () => {
    const base = "2026-01-01T10:00:00.000Z";
    expect(
      detectBidirectionalConflict({
        planRowUpdatedAt: "2026-01-02T10:00:00.000Z",
        lastSyncedAt: base,
        googleEventUpdated: "2026-01-02T11:00:00.000Z",
        googleEtagChanged: true,
      }),
    ).toBe(true);
    expect(
      detectBidirectionalConflict({
        planRowUpdatedAt: "2026-01-01T09:00:00.000Z",
        lastSyncedAt: base,
        googleEventUpdated: "2026-01-02T11:00:00.000Z",
        googleEtagChanged: false,
      }),
    ).toBe(false);
  });
});
