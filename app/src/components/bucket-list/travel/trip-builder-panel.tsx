"use client";

import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGenerateTripPlan } from "@/hooks/use-bucket-ai";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem, BucketTravelStyle } from "@/types/bucket-list";

const LENGTHS = [3, 5, 7, 14] as const;
const STYLE_VARIANTS: { style: BucketTravelStyle; key: keyof BucketListUiCopy }[] = [
  { style: "solo", key: "tripStyleSolo" },
  { style: "couple", key: "tripStyleCouple" },
  { style: "friends", key: "tripStyleFriends" },
  { style: "workation", key: "tripStyleWorkation" },
];

/**
 * Generates trip-plan variants by length and style. Reuses the existing
 * trip-plan route (no duplicate itinerary logic) — each variant just overrides
 * trip length / style / priorities. The generated plan is rendered by the
 * console's Trip Plan section.
 */
export function TripBuilderPanel({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const generate = useGenerateTripPlan();
  const pending = generate.isPending;

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
        <Wand2 className="h-4 w-4 text-lime-500" />
        {copy.tripBuilderHeading}
      </h3>
      <p className="mb-3 text-[12px] text-muted-foreground">
        {copy.tripBuilderHint}
      </p>

      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {copy.tripBuilderLength}
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {LENGTHS.map((n) => (
          <Button
            key={n}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              generate.mutate({
                bucket: item,
                tripLength: n,
                priorities: `${n}-day itinerary`,
              })
            }
          >
            {copy.tripBuilderDays(n)}
          </Button>
        ))}
      </div>

      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {copy.tripBuilderStyle}
      </p>
      <div className="flex flex-wrap gap-2">
        {STYLE_VARIANTS.map((v) => (
          <Button
            key={v.style}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => generate.mutate({ bucket: item, travelStyle: v.style })}
          >
            {copy[v.key] as string}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            generate.mutate({
              bucket: item,
              priorities: "slow travel — fewer places, deeper local immersion",
            })
          }
        >
          {copy.tripStyleSlow}
        </Button>
      </div>

      {pending ? (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {copy.tripBuilderGenerating}
        </p>
      ) : null}
    </section>
  );
}
