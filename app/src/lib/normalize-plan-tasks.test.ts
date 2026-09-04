import { describe, expect, it } from "vitest";

import {
  coerceDailyPlanTasks,
  coercePlanningMode,
} from "@/lib/normalize-plan-tasks";

describe("coercePlanningMode", () => {
  it.each(["time-block", "free", "adaptive"] as const)(
    "accepts the supported %s mode",
    (mode) => {
      expect(coercePlanningMode(mode)).toBe(mode);
    },
  );

  it.each([undefined, null, "auto", "", 1])(
    "defaults unknown input (%s) to time-block",
    (input) => {
      expect(coercePlanningMode(input)).toBe("time-block");
    },
  );
});

describe("coerceDailyPlanTasks adaptive scheduling metadata", () => {
  it.each(["manual", "adaptive"] as const)(
    "preserves recognized %s scheduling metadata",
    (scheduleSource) => {
      const [task] = coerceDailyPlanTasks([
        {
          plannerTaskId: "planner-1",
          taskName: "Deep work",
          blocks: 4,
          scheduleSource,
          locked: true,
          earliestStartTime: "08:30",
          latestEndTime: "12:00",
        },
      ]);

      expect(task).toMatchObject({
        plannerTaskId: "planner-1",
        taskName: "Deep work",
        blocks: 4,
        scheduleSource,
        locked: true,
        earliestStartTime: "08:30",
        latestEndTime: "12:00",
      });
    },
  );

  it("drops malformed scheduling metadata from JSON-backed rows", () => {
    const [task] = coerceDailyPlanTasks([
      {
        plannerTaskId: "planner-2",
        taskName: "Legacy task",
        scheduleSource: "robot",
        locked: "true",
        earliestStartTime: 900,
        latestEndTime: false,
      },
    ]);

    expect(task).not.toHaveProperty("scheduleSource");
    expect(task).not.toHaveProperty("locked");
    expect(task).not.toHaveProperty("earliestStartTime");
    expect(task).not.toHaveProperty("latestEndTime");
  });
});
