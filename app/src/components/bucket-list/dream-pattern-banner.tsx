"use client";

import { useMemo } from "react";
import { Activity, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  bucketTypeBadgeClass,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { BUCKET_TYPES, type BucketItem, type BucketType } from "@/types/bucket-list";
import {
  bucketEntrance,
  bucketProgressTransition,
} from "./bucket-motion";

type DreamPatternBannerProps = {
  items: BucketItem[] | undefined;
  copy: BucketListUiCopy;
};

const MOVING_STATUSES = new Set([
  "exploring",
  "planning",
  "active",
  "funded",
  "scheduled",
  "booked",
]);

export function DreamPatternBanner({ items, copy }: DreamPatternBannerProps) {
  const reduceMotion = useReducedMotion() ?? false;

  const pattern = useMemo(() => {
    if (!items?.length) return null;

    const counts = BUCKET_TYPES.map((type) => ({
      type,
      count: items.filter((item) => item.type === type).length,
    })).sort((a, b) => b.count - a.count);

    const strongest = counts[0];
    if (!strongest || strongest.count === 0) return null;

    return {
      strongest,
      counts,
      total: items.length,
      moving: items.filter((item) => MOVING_STATUSES.has(item.status)).length,
      completed: items.filter((item) => item.status === "completed").length,
    };
  }, [items]);

  if (!pattern) return null;

  const typeLabel = getBucketTypeLabel(pattern.strongest.type, copy);

  return (
    <motion.section
      {...bucketEntrance(reduceMotion, 0.08, 12)}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 p-4 pr-20 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:pr-4"
      aria-label={copy.patternBannerEyebrow}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(190,242,100,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(45,212,191,0.10),transparent_32%)]" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            <Activity className="h-3.5 w-3.5 text-lime-300" />
            {copy.patternBannerEyebrow}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
            {copy.patternBannerTitle(typeLabel)}
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] text-white/62">
            {copy.patternBannerDescription(
              pattern.strongest.count,
              pattern.total,
              pattern.moving,
              pattern.completed,
            )}
          </p>
        </div>

        <div className="grid min-w-[220px] gap-2">
          {pattern.counts.slice(0, 3).map((entry, index) => (
            <TypeSignal
              key={entry.type}
              entry={entry}
              total={pattern.total}
              copy={copy}
              index={index}
              reduceMotion={reduceMotion}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function TypeSignal({
  entry,
  total,
  copy,
  index,
  reduceMotion,
}: {
  entry: { type: BucketType; count: number };
  total: number;
  copy: BucketListUiCopy;
  index: number;
  reduceMotion: boolean;
}) {
  const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;

  return (
    <div className="grid grid-cols-[88px_1fr_34px] items-center gap-2">
      <span
        className={cn(
          "inline-flex h-6 items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.08em]",
          bucketTypeBadgeClass(entry.type),
        )}
      >
        {getBucketTypeLabel(entry.type, copy)}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-lime-300/80"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={bucketProgressTransition(reduceMotion, 0.1 + index * 0.05)}
        />
      </div>
      <span className="inline-flex items-center justify-end gap-1 text-[11px] font-semibold tabular-nums text-white/60">
        <Sparkles className="h-3 w-3 text-white/35" aria-hidden />
        {entry.count}
      </span>
    </div>
  );
}
