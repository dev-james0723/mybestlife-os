import { describe, expect, it } from "vitest";

import { scheduleImageRequestKey } from "./schedule-image-request-key";

const base = {
  planDate: "2026-09-03",
  startTime: "09:00",
  endTime: "18:00",
  styleId: "watercolor",
  blockMinutes: 30,
  tasks: [
    { plannerTaskId: "a", taskName: "A", blocks: 1, order: 0 },
    { plannerTaskId: "b", taskName: "B", blocks: 2, order: 1 },
  ],
};

describe("scheduleImageRequestKey", () => {
  it("changes when task order changes", () => {
    expect(scheduleImageRequestKey(base)).not.toBe(
      scheduleImageRequestKey({ ...base, tasks: [...base.tasks].reverse() }),
    );
  });

  it("changes when the date, planning window, style, or duration changes", () => {
    const original = scheduleImageRequestKey(base);
    expect(scheduleImageRequestKey({ ...base, planDate: "2026-09-04" })).not.toBe(
      original,
    );
    expect(scheduleImageRequestKey({ ...base, startTime: "10:00" })).not.toBe(
      original,
    );
    expect(scheduleImageRequestKey({ ...base, styleId: "minimal" })).not.toBe(
      original,
    );
    expect(scheduleImageRequestKey({ ...base, blockMinutes: 25 })).not.toBe(
      original,
    );
  });
});
