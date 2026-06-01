import { describe, expect, it } from "vitest";
import type {
  BucketItem,
  BucketItemIntegration,
  BucketReflection,
} from "@/types/bucket-list";
import { buildDreamTimeline } from "@/lib/bucket-list/memory-timeline";

function item(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id: "d1",
    created_at: "2027-01-01T00:00:00.000Z",
    completed_at: null,
    ai_destination_brief: null,
    ai_trip_plan: null,
    ...overrides,
  } as BucketItem;
}

function integration(
  kind: BucketItemIntegration["kind"],
  created_at: string,
): BucketItemIntegration {
  return { kind, created_at } as BucketItemIntegration;
}

describe("buildDreamTimeline", () => {
  it("only emits a created event for a brand-new dream", () => {
    const events = buildDreamTimeline(item());
    expect(events.map((e) => e.key)).toEqual(["created"]);
  });

  it("never invents events without stored data", () => {
    const events = buildDreamTimeline(item());
    expect(events.some((e) => e.key === "completed")).toBe(false);
    expect(events.some((e) => e.key === "trip_planned")).toBe(false);
    expect(events.some((e) => e.key === "activated")).toBe(false);
  });

  it("derives events from real timestamps and sorts ascending", () => {
    const events = buildDreamTimeline(
      item({ completed_at: "2027-06-01T00:00:00.000Z" }),
      {
        integrations: [
          integration("project", "2027-02-01T00:00:00.000Z"),
          integration("task", "2027-03-01T00:00:00.000Z"),
        ],
        images: [{ created_at: "2027-01-15T00:00:00.000Z" }],
      },
    );
    const keys = events.map((e) => e.key);
    expect(keys[0]).toBe("created");
    expect(keys).toContain("visualized");
    expect(keys).toContain("activated");
    expect(keys).toContain("project_linked");
    expect(keys).toContain("tasks_added");
    expect(keys).toContain("completed");
    // ascending by date
    const dates = events.map((e) => e.dateISO);
    expect([...dates].sort()).toEqual(dates);
  });

  it("marks became_memory from a reflection carrying an AI summary", () => {
    const reflections = [
      {
        reflected_on: "2027-06-05T00:00:00.000Z",
        ai_summary: "A quiet triumph.",
        ai_memory: null,
      } as BucketReflection,
    ];
    const events = buildDreamTimeline(item(), { reflections });
    expect(events.some((e) => e.key === "reflected")).toBe(true);
    expect(events.some((e) => e.key === "became_memory")).toBe(true);
  });
});
