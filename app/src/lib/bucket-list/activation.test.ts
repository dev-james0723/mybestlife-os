import { describe, expect, it } from "vitest";
import type { BucketItem } from "@/types/bucket-list";
import {
  buildActivationChecklist,
  nextActivationStatus,
} from "@/lib/bucket-list/activation";

const labels = {
  firstAction: "First action",
  research: "Research",
  budget: "Budget",
  schedule: "Schedule",
  people: "People",
  supplies: "Supplies",
  booking: "Booking",
  reflection: "Reflection",
};

const emptyCtx = {
  hasFirstAction: false,
  hasResearch: false,
  hasBudget: false,
  hasSchedule: false,
  hasPeople: false,
  hasSupplies: false,
};

function item(overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    type: "travel",
    status: "dreaming",
    target_date: null,
    target_month: null,
    linked_savings_goal_id: null,
    linked_budget_id: null,
    linked_task_ids: [],
    // only fields the helpers touch are relevant; cast keeps the test focused.
    ...overrides,
  } as BucketItem;
}

describe("nextActivationStatus", () => {
  it("advances one step at a time", () => {
    expect(nextActivationStatus("dreaming")).toBe("exploring");
    expect(nextActivationStatus("exploring")).toBe("planning");
    expect(nextActivationStatus("planning")).toBe("active");
  });

  it("does not advance past active or touch terminal states", () => {
    expect(nextActivationStatus("active")).toBeNull();
    expect(nextActivationStatus("completed")).toBeNull();
    expect(nextActivationStatus("archived")).toBeNull();
    expect(nextActivationStatus("paused")).toBeNull();
  });
});

describe("buildActivationChecklist", () => {
  it("includes a travel booking step for travel dreams", () => {
    const list = buildActivationChecklist(item({ type: "travel" }), labels, emptyCtx);
    expect(list.some((i) => i.key === "booking")).toBe(true);
    expect(list.some((i) => i.key === "reflection")).toBe(true);
  });

  it("omits booking for non-travel dreams", () => {
    const list = buildActivationChecklist(
      item({ type: "achievement" }),
      labels,
      emptyCtx,
    );
    expect(list.some((i) => i.key === "booking")).toBe(false);
  });

  it("marks budget done when a savings goal is linked", () => {
    const list = buildActivationChecklist(
      item({ linked_savings_goal_id: "s1" }),
      labels,
      emptyCtx,
    );
    expect(list.find((i) => i.key === "budget")?.done).toBe(true);
  });

  it("marks schedule done when a target month exists", () => {
    const list = buildActivationChecklist(
      item({ target_month: "2027-05" }),
      labels,
      emptyCtx,
    );
    expect(list.find((i) => i.key === "schedule")?.done).toBe(true);
  });
});
