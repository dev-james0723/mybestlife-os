import { describe, expect, it } from "vitest";
import type { DailyPlanTask } from "@/types/database";
import {
  moveAndResequenceTimeBlockTasks,
  resequenceTimeBlockTasks,
} from "./reorder-time-block-tasks";

function tasks(): DailyPlanTask[] {
  return ["A", "B", "C", "D", "E"].map((taskName, order) => ({
    plannerTaskId: taskName.toLowerCase(),
    taskName,
    blocks: taskName === "B" ? 2 : 1,
    gapBlocks: taskName === "C" ? 1 : 0,
    order,
    // Reordering must replace stale exact slots.
    start_time: `${String(9 + order).padStart(2, "0")}:00`,
    end_time: `${String(10 + order).padStart(2, "0")}:00`,
  }));
}

describe("moveAndResequenceTimeBlockTasks", () => {
  it("moves A below B using insertion semantics and rebuilds exact slots", () => {
    const result = moveAndResequenceTimeBlockTasks(tasks(), 0, 1, {
      planStartTime: "09:00",
      blockMinutes: 30,
    });

    expect(result.map((task) => task.taskName)).toEqual(["B", "A", "C", "D", "E"]);
    expect(result.map((task) => task.order)).toEqual([0, 1, 2, 3, 4]);
    expect(result.map(({ start_time, end_time }) => [start_time, end_time])).toEqual([
      ["09:00", "10:00"],
      ["10:00", "10:30"],
      ["11:00", "11:30"],
      ["11:30", "12:00"],
      ["12:00", "12:30"],
    ]);
  });

  it("moves B onto E as an insertion at E's index, without swapping the two rows", () => {
    const result = moveAndResequenceTimeBlockTasks(tasks(), 1, 4, {
      planStartTime: "09:00",
      blockMinutes: 30,
    });

    expect(result.map((task) => task.taskName)).toEqual(["A", "C", "D", "E", "B"]);
    expect(result.map((task) => task.order)).toEqual([0, 1, 2, 3, 4]);
    expect(result.map(({ start_time, end_time }) => [start_time, end_time])).toEqual([
      ["09:00", "09:30"],
      ["10:00", "10:30"],
      ["10:30", "11:00"],
      ["11:00", "11:30"],
      ["11:30", "12:30"],
    ]);
  });
});

describe("resequenceTimeBlockTasks", () => {
  it("keeps a derived-only plan free of exact slots", () => {
    const result = moveAndResequenceTimeBlockTasks(
      [
        { plannerTaskId: "a", taskName: "A", blocks: 1, order: 0 },
        { plannerTaskId: "b", taskName: "B", blocks: 2, order: 1 },
      ],
      0,
      1,
      { planStartTime: "09:00", blockMinutes: 30 },
    );

    expect(result.map((task) => task.taskName)).toEqual(["B", "A"]);
    expect(result.map((task) => task.order)).toEqual([0, 1]);
    expect(result.every((task) => task.start_time == null && task.end_time == null)).toBe(
      true,
    );
  });

  it("wraps exact wall-clock fields across midnight while preserving block and gap data", () => {
    const input: DailyPlanTask[] = [
      {
        plannerTaskId: "a",
        taskName: "A",
        blocks: 1,
        gapBlocks: 0,
        order: 9,
        start_time: "22:00",
        end_time: "22:30",
      },
      {
        plannerTaskId: "b",
        taskName: "B",
        blocks: 2,
        gapBlocks: 1,
        order: 4,
        start_time: "22:30",
        end_time: "23:30",
      },
    ];

    const result = resequenceTimeBlockTasks(input, {
      planStartTime: "23:30",
      blockMinutes: 30,
    });

    expect(result).toEqual([
      {
        plannerTaskId: "a",
        taskName: "A",
        blocks: 1,
        gapBlocks: 0,
        order: 0,
        start_time: "23:30",
        end_time: "00:00",
      },
      {
        plannerTaskId: "b",
        taskName: "B",
        blocks: 2,
        gapBlocks: 1,
        order: 1,
        start_time: "00:30",
        end_time: "01:30",
      },
    ]);
    expect(result[0]).not.toBe(input[0]);
    expect(input[0]).toMatchObject({ order: 9, start_time: "22:00", end_time: "22:30" });
  });

  it("turns a mixed imported plan into one coherent exact sequence", () => {
    const result = resequenceTimeBlockTasks(
      [
        {
          plannerTaskId: "a",
          taskName: "A",
          blocks: 1,
          order: 7,
          start_time: "14:00",
          end_time: "14:30",
        },
        { plannerTaskId: "b", taskName: "B", blocks: 2, order: 2 },
      ],
      { planStartTime: "09:00", blockMinutes: 30 },
    );

    expect(result.map((task) => task.order)).toEqual([0, 1]);
    expect(result.map(({ start_time, end_time }) => [start_time, end_time])).toEqual([
      ["09:00", "09:30"],
      ["09:30", "10:30"],
    ]);
  });
});
