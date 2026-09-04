import { describe, expect, it } from "vitest";

import type { FreePlanTask } from "@/types/database";
import { applyDragMove } from "./free-plan-board";

function sameBucketTasks(): FreePlanTask[] {
  return ["A", "B", "C", "D", "E"].map((title, order) => ({
    id: title.toLowerCase(),
    title,
    priority: "should",
    order,
  }));
}

function shouldOrder(tasks: FreePlanTask[] | null): string[] {
  return (tasks ?? [])
    .filter((task) => task.priority === "should")
    .sort((a, b) => a.order - b.order)
    .map((task) => task.title);
}

describe("applyDragMove same-bucket insertion", () => {
  it("moves A directly below B", () => {
    expect(shouldOrder(applyDragMove(sameBucketTasks(), "a", "b"))).toEqual([
      "B",
      "A",
      "C",
      "D",
      "E",
    ]);
  });

  it("moves B to E's index when dragging downward", () => {
    expect(shouldOrder(applyDragMove(sameBucketTasks(), "b", "e"))).toEqual([
      "A",
      "C",
      "D",
      "E",
      "B",
    ]);
  });

  it("does not mutate the source task objects", () => {
    const input = sameBucketTasks();
    const snapshot = structuredClone(input);

    applyDragMove(input, "a", "e");

    expect(input).toEqual(snapshot);
  });
});
