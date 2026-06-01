"use client";

import { useMemo } from "react";

import { Progress } from "@/components/ui/progress";
import { useDreamImages } from "@/hooks/use-bucket-list";
import { computeTravelReadiness } from "@/lib/bucket-list/readiness";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

/** Deterministic travel readiness — vision · logistics · booking. No AI. */
export function TravelReadinessPanel({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const { data: images } = useDreamImages(item.id);
  const readiness = useMemo(
    () => computeTravelReadiness(item, { imageCount: images?.length ?? 0 }),
    [item, images?.length],
  );

  const summary = useMemo(() => {
    const visionClear = readiness.visionScore >= 50;
    const bookingClear = readiness.bookingScore >= 50;
    if (visionClear && !bookingClear) return copy.travelReadyVisionNotBooking;
    if (!visionClear && bookingClear) return copy.travelReadyBookingNotVision;
    if (visionClear && bookingClear) return copy.travelReadyStrong;
    return copy.travelReadyEarly;
  }, [readiness, copy]);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{copy.travelReadinessHeading}</h3>
        <span className="text-lg font-semibold tabular-nums">{readiness.score}%</span>
      </div>
      <Progress value={readiness.score} className="h-2" />
      <p className="mt-2 text-[13px] text-muted-foreground">{summary}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
        <Sub label={copy.travelReadyVision} value={readiness.visionScore} />
        <Sub label={copy.travelReadyLogistics} value={readiness.logisticsScore} />
        <Sub label={copy.travelReadyBooking} value={readiness.bookingScore} />
      </div>
    </section>
  );
}

function Sub({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/30 py-1.5">
      <p className="font-semibold tabular-nums">{value}%</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
