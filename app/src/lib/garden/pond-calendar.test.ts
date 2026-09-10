import { describe, expect, it } from "vitest";
import { pondHabitCalendar } from "./pond-calendar";
import { pondOutboxSchema, pondRequestSchema } from "./pond-persistence";

describe("Habits calendar in a durable pond request", () => {
  it("uses the source device calendar across the international date line", () => {
    const instant = Date.parse("2026-09-09T02:00:00Z");
    expect(pondHabitCalendar("Pacific/Honolulu", instant)).toEqual({ date: "2026-09-08", timezone: "Pacific/Honolulu" });
    expect(pondHabitCalendar("Pacific/Kiritimati", instant).date).toBe("2026-09-09");
  });
  it("keeps the calendar date across both skipped and repeated DST hours", () => {
    for (const instant of ["2026-03-08T06:59:00Z", "2026-03-08T07:01:00Z"]) expect(pondHabitCalendar("America/New_York", Date.parse(instant)).date).toBe("2026-03-08");
    for (const instant of ["2026-11-01T05:30:00Z", "2026-11-01T06:30:00Z"]) expect(pondHabitCalendar("America/New_York", Date.parse(instant)).date).toBe("2026-11-01");
  });
  it("preserves the captured calendar during outbox serialization rather than recalculating it on retry", () => {
    const id = "00000000-0000-4000-8000-000000000081";
    const command = { kind: "select", source_kind: "habit", source_id: id, title: "One walk", source_calendar: pondHabitCalendar("Pacific/Honolulu", Date.parse("2026-09-09T02:00:00Z")) };
    const pending = { id, account: id, version: 3, revision: 0, command };
    expect(pondOutboxSchema.parse(JSON.parse(JSON.stringify(pending))).command).toEqual(command);
    expect(pondRequestSchema.safeParse({ ...command, source_calendar: { date: "2026-02-30", timezone: "UTC" } }).success).toBe(false);
    expect(pondRequestSchema.safeParse({ ...command, source_calendar: { ...command.source_calendar, timestamp: 1 } }).success).toBe(false);
  });
  it("still reads earlier pending commands without a captured calendar", () => {
    expect(pondRequestSchema.safeParse({ kind: "select", source_kind: "habit", title: "Existing chosen walk", source_id: "00000000-0000-4000-8000-000000000081" }).success).toBe(true);
  });
});
