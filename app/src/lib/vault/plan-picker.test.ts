import { describe, expect, it } from "vitest";
import {
  applyPlanSelection,
  applySubscribeChoice,
  inferBillingCycles,
  shouldShowPlanPicker,
} from "@/lib/vault/plan-picker";
import type { PricingPlan } from "@/types/vault-smart-autofill";

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    currency: "USD",
    billing_cycle: "one-time",
    cost_type: "Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: 20,
    currency: "USD",
    billing_cycle: "monthly",
    cost_type: "Subscription",
  },
];

describe("shouldShowPlanPicker", () => {
  it("returns false for empty plans", () => {
    expect(shouldShowPlanPicker([])).toBe(false);
  });

  it("returns true when paid tiers exist", () => {
    expect(shouldShowPlanPicker(plans)).toBe(true);
  });
});

describe("applySubscribeChoice", () => {
  it("sets free defaults for no subscription", () => {
    const patch = applySubscribeChoice("none", plans);
    expect(patch.cost_type).toBe("Free");
    expect(patch.cost_amount).toBe("0");
    expect(patch.selected_plan_id).toBe("free");
  });

  it("returns empty patch when subscribed (plan step follows)", () => {
    expect(applySubscribeChoice("subscribed", plans)).toEqual({});
  });
});

describe("applyPlanSelection", () => {
  it("maps monthly plan to form cost fields", () => {
    const pro = plans[1]!;
    const patch = applyPlanSelection(pro, "monthly");
    expect(patch.cost_amount).toBe("20");
    expect(patch.cost_period).toBe("month");
    expect(patch.selected_plan_id).toBe("pro");
    expect(patch.billing_cycle).toBe("monthly");
  });

  it("maps annual cycle to year period", () => {
    const pro = plans[1]!;
    const patch = applyPlanSelection(pro, "annually");
    expect(patch.cost_period).toBe("year");
  });
});

describe("inferBillingCycles", () => {
  it("uses plan billing_cycle when set", () => {
    expect(inferBillingCycles(plans[1]!)).toEqual(["monthly"]);
  });

  it("offers monthly and annual when unknown", () => {
    const unknown = { ...plans[1]!, billing_cycle: undefined };
    expect(inferBillingCycles(unknown)).toContain("monthly");
    expect(inferBillingCycles(unknown)).toContain("annually");
  });
});
