"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import {
  bucketStatusBadgeClass,
  bucketStatusCardClass,
  bucketStatusPipClass,
  bucketProgressClass,
  bucketTypeBadgeClass,
  estimateBucketProgress,
  getBucketStatusLabel,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import { useBucketDreamImage } from "@/hooks/use-bucket-dream-image";
import { DreamCoverBackground } from "./dream-cover-background";
import {
  bucketHoverLift,
  bucketProgressTransition,
  bucketStaggerItem,
} from "./bucket-motion";

export function DreamListRow({
  item,
  index = 0,
  onClick,
}: {
  item: BucketItem;
  index?: number;
  onClick: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const image = useBucketDreamImage(item);
  const progress = estimateBucketProgress(item);
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <motion.button
      variants={bucketStaggerItem(reduceMotion, 10)}
      whileHover={bucketHoverLift(reduceMotion)}
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2.5 text-left transition-colors",
        "hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
        bucketStatusCardClass(item.status),
      )}
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10">
        <DreamCoverBackground
          image={image}
          type={item.type}
          variant="thumb"
          interactive
        />
      </div>

      <div className="relative z-10 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm",
              bucketStatusBadgeClass(item.status),
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", bucketStatusPipClass(item.status))}
              aria-hidden
            />
            {getBucketStatusLabel(item.status, copy)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] backdrop-blur-sm",
              bucketTypeBadgeClass(item.type),
            )}
          >
            {getBucketTypeLabel(item.type, copy)}
          </span>
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-white drop-shadow-sm">
          {item.title}
        </h3>
        {item.why_this_matters ? (
          <p className="mt-0.5 truncate text-[11px] italic text-white/65">
            &ldquo;{item.why_this_matters}&rdquo;
          </p>
        ) : null}
      </div>

      <div className="relative z-10 hidden w-28 shrink-0 md:block">
        <div className="h-1.5 rounded-full bg-white/15">
          <motion.div
            className={cn("h-1.5 rounded-full", bucketProgressClass(item.status))}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={bucketProgressTransition(reduceMotion, 0.08 + index * 0.02)}
            aria-hidden
          />
        </div>
        <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
          {progress}%
        </p>
      </div>
    </motion.button>
  );
}
