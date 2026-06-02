"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plane, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem, BucketStats } from "@/types/bucket-list";
import { useBucketStats, useBucketHighlights } from "@/hooks/use-bucket-list";
import {
  bucketMonthsOut,
  bucketStatusBadgeClass,
  bucketTypeBadgeClass,
  estimateBucketProgress,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import {
  bucketEntrance,
  bucketHoverLift,
  bucketStaggerContainer,
  bucketStaggerItem,
} from "./bucket-motion";
import { bucketGlassPanel, bucketSheen } from "./bucket-glass";

type StatsStripProps = {
  items: BucketItem[] | undefined;
  onOpenItem: (bucketId: string) => void;
};

/**
 * Header stats + "closest to reality" + "push this week" spotlights.
 * Matches the screenshot's MASTER PROGRESS block.
 */
export function BucketStatsStrip({ items, onOpenItem }: StatsStripProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  const stats = useBucketStats(items);
  const highlights = useBucketHighlights(items);

  return (
    <motion.section
      {...bucketEntrance(reduceMotion, 0.06, 12)}
      className={`${bucketGlassPanel} ${bucketSheen} p-5`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {copy.masterProgress}
      </p>

      <motion.div
        variants={bucketStaggerContainer(reduceMotion)}
        initial="hidden"
        animate="show"
        className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4"
      >
        <StatCell value={stats.total} label={copy.statTotal} reduceMotion={reduceMotion} />
        <StatCell
          value={stats.completed}
          label={copy.statCompleted}
          tone="success"
          reduceMotion={reduceMotion}
        />
        <StatCell
          value={stats.active}
          label={copy.statActive}
          tone="active"
          reduceMotion={reduceMotion}
        />
        <StatCell
          value={stats.funded}
          label={copy.statFunded}
          tone="warm"
          reduceMotion={reduceMotion}
        />
        <StatCell
          value={stats.dreaming}
          label={copy.statDreaming}
          tone="muted"
          reduceMotion={reduceMotion}
        />
      </motion.div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SpotlightTile
          kind="closest"
          copy={copy}
          item={highlights.closestToReality}
          onClick={onOpenItem}
          reduceMotion={reduceMotion}
        />
        <SpotlightTile
          kind="push"
          copy={copy}
          item={highlights.pushThisWeek}
          onClick={onOpenItem}
          reduceMotion={reduceMotion}
        />
      </div>
    </motion.section>
  );
}

function StatCell({
  value,
  label,
  tone = "default",
  reduceMotion,
}: {
  value: number;
  label: string;
  tone?: "default" | "success" | "active" | "warm" | "muted";
  reduceMotion: boolean;
}) {
  const toneClass = {
    default: "text-white",
    success: "text-lime-300",
    active: "text-sky-300",
    warm: "text-amber-300",
    muted: "text-white/70",
  }[tone];
  return (
    <motion.div variants={bucketStaggerItem(reduceMotion, 8)}>
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl",
          toneClass,
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {label}
      </div>
    </motion.div>
  );
}

function SpotlightTile({
  kind,
  item,
  copy,
  onClick,
  reduceMotion,
}: {
  kind: "closest" | "push";
  item: BucketItem | null;
  copy: ReturnType<typeof getBucketListUiCopy>;
  onClick: (bucketId: string) => void;
  reduceMotion: boolean;
}) {
  if (!item) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-white/50">
        <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          {kind === "closest" ? (
            <Plane className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Zap className="h-3.5 w-3.5" aria-hidden />
          )}
          {kind === "closest" ? copy.closestToReality : copy.pushThisWeek}
        </div>
        <p>{copy.noHighlight}</p>
      </div>
    );
  }

  const progress = estimateBucketProgress(item);
  const monthsOut = bucketMonthsOut(item);

  return (
    <motion.button
      type="button"
      onClick={() => onClick(item.id)}
      whileHover={bucketHoverLift(reduceMotion)}
      className="group/spotlight relative block w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
    >
      <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {kind === "closest" ? (
          <Plane className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Zap className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>
          {kind === "closest" ? copy.closestToReality : copy.pushThisWeek}
        </span>
      </div>
      <h3 className="text-sm font-semibold leading-snug text-white line-clamp-2">
        {item.title}
      </h3>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/60">
        {kind === "closest" ? (
          <>
            <span className="font-medium text-white/85">
              {copy.percentFundedShort(progress)}
            </span>
            {monthsOut != null ? (
              <>
                <span aria-hidden>•</span>
                <span>{copy.monthsOut(monthsOut)}</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                bucketStatusBadgeClass(item.status),
              )}
            >
              {item.status}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                bucketTypeBadgeClass(item.type),
              )}
            >
              {getBucketTypeLabel(item.type, copy)}
            </span>
          </>
        )}
      </div>
      {kind === "push" && item.why_this_matters ? (
        <p className="mt-1 text-[11px] text-white/55 line-clamp-1">
          {copy.blockedOn(
            item.status === "planning"
              ? "next concrete step"
              : "funding & timing",
          )}
        </p>
      ) : null}
    </motion.button>
  );
}

export type { BucketStats };
