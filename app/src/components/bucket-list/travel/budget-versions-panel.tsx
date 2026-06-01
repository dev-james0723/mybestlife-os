"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGenerateTripPlan } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketItem,
  BucketTravelBudgetLevel,
} from "@/types/bucket-list";

const TIERS: {
  level: BucketTravelBudgetLevel;
  labelKey: keyof BucketListUiCopy;
  descKey: keyof BucketListUiCopy;
  priorities: string;
}[] = [
  {
    level: "budget",
    labelKey: "budgetTierBudget",
    descKey: "budgetTierBudgetDesc",
    priorities: "budget version: hostels/guesthouses, self-guided, public transport, free experiences",
  },
  {
    level: "mid",
    labelKey: "budgetTierMid",
    descKey: "budgetTierMidDesc",
    priorities: "mid-range version: comfortable hotels, a small-group tour, a mix of paid and free experiences",
  },
  {
    level: "premium",
    labelKey: "budgetTierPremium",
    descKey: "budgetTierPremiumDesc",
    priorities: "premium version: boutique stays, a private guide for key days, standout experiences",
  },
  {
    level: "luxury",
    labelKey: "budgetTierLuxury",
    descKey: "budgetTierLuxuryDesc",
    priorities: "luxury version: high-end curated multi-day experience, private transport, fine dining",
  },
];

/**
 * Four qualitative budget tiers. Each "Draft this version" regenerates the
 * trip plan via the existing route with the chosen budget level — these are
 * qualitative styles of trip, never price quotes.
 */
export function BudgetVersionsPanel({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const generate = useGenerateTripPlan();

  return (
    <section className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{copy.budgetVersionsHeading}</h3>
      <p className="mb-3 text-[12px] text-muted-foreground">
        {copy.budgetVersionsHint}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {TIERS.map((tier) => (
          <div key={tier.level} className="rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-semibold">{copy[tier.labelKey] as string}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {copy[tier.descKey] as string}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={generate.isPending}
              onClick={() =>
                generate.mutate({
                  bucket: item,
                  budgetLevel: tier.level,
                  priorities: tier.priorities,
                })
              }
            >
              {generate.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              {copy.budgetVersionsDraft}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
