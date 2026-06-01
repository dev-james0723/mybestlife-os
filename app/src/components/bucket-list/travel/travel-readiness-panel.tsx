"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { useDreamImages } from "@/hooks/use-bucket-list";
import { computeTravelReadiness } from "@/lib/bucket-list/readiness";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import { bucketProgressTransition } from "../bucket-motion";

/** Deterministic travel readiness — vision · logistics · booking. No AI. */
export function TravelReadinessPanel({
  item,
  copy,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
}) {
  const reduceMotion = useReducedMotion() ?? false;
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
        <motion.span
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={bucketProgressTransition(reduceMotion, 0.04)}
          className="text-lg font-semibold tabular-nums"
        >
          {readiness.score}%
        </motion.span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-lime-300"
          initial={{ width: 0 }}
          animate={{ width: `${readiness.score}%` }}
          transition={bucketProgressTransition(reduceMotion, 0.08)}
        />
      </div>
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
