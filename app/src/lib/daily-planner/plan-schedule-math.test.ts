import { describe, expect, it } from "vitest";
import { computeSequentialSchedule } from "./plan-schedule-math";

describe("computeSequentialSchedule exact planner rows", () => {
  it("uses exact chronology when a remote calendar move changes wall-clock order", () => {
    const schedule = computeSequentialSchedule(
      "2026-09-03",
      "09:00",
      [
        {
          plannerTaskId: "a",
          taskName: "A",
          order: 1,
          start_time: "09:00",
          end_time: "09:30",
        },
        {
          plannerTaskId: "b",
          taskName: "B",
          order: 0,
          start_time: "10:00",
          end_time: "10:30",
        },
      ],
      30,
    );

    expect(schedule.map(({ task }) => task.taskName)).toEqual(["A", "B"]);
  });

  it("keeps post-midnight exact rows after a late-night plan start", () => {
    const schedule = computeSequentialSchedule(
      "2026-09-03",
      "23:30",
      [
        {
          plannerTaskId: "b",
          taskName: "B",
          order: 1,
          start_time: "00:30",
          end_time: "01:30",
        },
        {
          plannerTaskId: "a",
          taskName: "A",
          order: 0,
          start_time: "23:30",
          end_time: "00:00",
        },
      ],
      30,
    );

    expect(schedule.map(({ task }) => task.taskName)).toEqual(["A", "B"]);
    expect(
      schedule.map(({ startMinFromPlanMidnight, endMinFromPlanMidnight }) => [
        startMinFromPlanMidnight,
        endMinFromPlanMidnight,
      ]),
    ).toEqual([
      [23 * 60 + 30, 24 * 60],
      [24 * 60 + 30, 25 * 60 + 30],
    ]);
  });
});
