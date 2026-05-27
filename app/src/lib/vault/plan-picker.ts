import type { BillingCycle, PricingPlan } from "@/types/vault-smart-autofill";
import type { VaultFormState } from "@/components/vault/VaultEntryForm";

export type SubscribeChoice = "none" | "subscribed" | "unsure" | "opensource";

export function shouldShowPlanPicker(plans: PricingPlan[]): boolean {
  if (plans.length === 0) return false;
  const hasPaid = plans.some((p) => (p.price ?? 0) > 0);
  return hasPaid || plans.length > 1;
}

export function applySubscribeChoice(
  choice: SubscribeChoice,
  plans: PricingPlan[],
): Partial<VaultFormState> & {
  selected_plan_id?: string;
  billing_cycle?: BillingCycle;
  cost_currency?: string;
} {
  if (choice === "none" || choice === "opensource") {
    const free = plans.find((p) => p.cost_type === "Free" || p.price === 0) ?? plans[0];
    return {
      cost_type: "Free",
      cost_amount: "0",
      cost_period: "one-time",
      cost_currency: free?.currency ?? "USD",
      selected_plan_id: free?.id ?? "free",
      billing_cycle: "one-time",
    };
  }
  if (choice === "unsure") {
    return {
      cost_type: "Freemium",
      cost_amount: "",
      cost_period: "unknown",
      billing_cycle: "unknown",
      cost_currency: "USD",
    };
  }
  return {};
}

export function applyPlanSelection(
  plan: PricingPlan,
  cycle: BillingCycle,
): Partial<VaultFormState> & {
  selected_plan_id: string;
  billing_cycle: BillingCycle;
  cost_currency: string;
} {
  const period =
    cycle === "monthly"
      ? "month"
      : cycle === "annually"
        ? "year"
        : cycle === "one-time"
          ? "one-time"
          : cycle === "usage-based"
            ? "usage-based"
            : "unknown";

  return {
    cost_type: plan.cost_type ?? (plan.price && plan.price > 0 ? "Subscription" : "Free"),
    cost_amount: plan.price != null ? String(plan.price) : "",
    cost_period: period,
    cost_currency: plan.currency ?? "USD",
    selected_plan_id: plan.id,
    billing_cycle: cycle,
  };
}

export function inferBillingCycles(plan: PricingPlan): BillingCycle[] {
  if (plan.billing_cycle && plan.billing_cycle !== "unknown") {
    return [plan.billing_cycle];
  }
  if (plan.cost_type === "Free" || plan.price === 0) {
    return ["one-time"];
  }
  return ["monthly", "annually", "usage-based", "unknown"];
}
