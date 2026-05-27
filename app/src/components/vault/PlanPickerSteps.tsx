"use client";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { BillingCycle, PricingPlan } from "@/types/vault-smart-autofill";
import type { SubscribeChoice } from "@/lib/vault/plan-picker";
import { inferBillingCycles } from "@/lib/vault/plan-picker";
import { cn } from "@/lib/utils";

type Props = {
  step: "subscribe" | "plan" | "cycle";
  plans: PricingPlan[];
  subscribeChoice: SubscribeChoice | null;
  selectedPlanId: string | null;
  selectedCycle: BillingCycle | null;
  onSubscribeChoice: (c: SubscribeChoice) => void;
  onSelectPlan: (planId: string) => void;
  onSelectCycle: (cycle: BillingCycle) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
};

function ChoiceButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition",
        active ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-muted",
      )}
      onClick={onClick}
    >
      <span className="block text-sm font-medium">{title}</span>
      {subtitle ? (
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      ) : null}
    </button>
  );
}

export function PlanPickerSteps({
  step,
  plans,
  subscribeChoice,
  selectedPlanId,
  selectedCycle,
  onSubscribeChoice,
  onSelectPlan,
  onSelectCycle,
  onBack,
  onContinue,
  onSkip,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language).planPicker;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const cycles = selectedPlan ? inferBillingCycles(selectedPlan) : [];

  const canContinue =
    step === "subscribe"
      ? subscribeChoice != null
      : step === "plan"
        ? selectedPlanId != null
        : selectedCycle != null;

  return (
    <>
      <div className="space-y-4 py-4">
        {step === "subscribe" ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium">{copy.subscribeTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.subscribeHint}</p>
            </div>
            <div className="grid gap-2">
              <ChoiceButton
                active={subscribeChoice === "none"}
                title={copy.noSubscription}
                subtitle={copy.noSubscriptionHint}
                onClick={() => onSubscribeChoice("none")}
              />
              <ChoiceButton
                active={subscribeChoice === "subscribed"}
                title={copy.hasSubscription}
                subtitle={copy.hasSubscriptionHint}
                onClick={() => onSubscribeChoice("subscribed")}
              />
              <ChoiceButton
                active={subscribeChoice === "unsure"}
                title={copy.unsure}
                subtitle={copy.unsureHint}
                onClick={() => onSubscribeChoice("unsure")}
              />
              <ChoiceButton
                active={subscribeChoice === "opensource"}
                title={copy.openSource}
                subtitle={copy.openSourceHint}
                onClick={() => onSubscribeChoice("opensource")}
              />
            </div>
          </>
        ) : null}

        {step === "plan" ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium">{copy.planTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.planHint}</p>
            </div>
            <div className="grid gap-2">
              {plans.map((plan) => (
                <ChoiceButton
                  key={plan.id}
                  active={selectedPlanId === plan.id}
                  title={plan.name}
                  subtitle={
                    plan.price != null
                      ? `${plan.currency ?? "USD"} ${plan.price}${plan.billing_cycle ? ` / ${plan.billing_cycle}` : ""}`
                      : plan.cost_type === "Free"
                        ? copy.freePlan
                        : undefined
                  }
                  onClick={() => onSelectPlan(plan.id)}
                />
              ))}
            </div>
          </>
        ) : null}

        {step === "cycle" ? (
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium">{copy.cycleTitle}</p>
              <p className="text-xs text-muted-foreground">{copy.cycleHint}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {cycles.map((cycle) => (
                <ChoiceButton
                  key={cycle}
                  active={selectedCycle === cycle}
                  title={copy.cycles[cycle] ?? cycle}
                  onClick={() => onSelectCycle(cycle)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <DialogFooter className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          ← {copy.back}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onSkip}>
            {copy.skip}
          </Button>
          <Button type="button" onClick={onContinue} disabled={!canContinue}>
            {copy.continue}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
