"use client";

import { useMemo } from "react";
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

  const stats = useBucketStats(items);
  const highlights = useBucketHighlights(items);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {copy.masterProgress}
      </p>

      <div className="mt-3 grid grid-cols-5 gap-4">
        <StatCell value={stats.total} label={copy.statTotal} />
        <StatCell
          value={stats.completed}
          label={copy.statCompleted}
          tone="success"
        />
        <StatCell value={stats.active} label={copy.statActive} tone="active" />
        <StatCell value={stats.funded} label={copy.statFunded} tone="warm" />
        <StatCell
          value={stats.dreaming}
          label={copy.statDreaming}
          tone="muted"
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SpotlightTile
          kind="closest"
          copy={copy}
          item={highlights.closestToReality}
          onClick={onOpenItem}
        />
        <SpotlightTile
          kind="push"
          copy={copy}
          item={highlights.pushThisWeek}
          onClick={onOpenItem}
        />
      </div>
    </div>
  );
}

function StatCell({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "success" | "active" | "warm" | "muted";
}) {
  const toneClass = {
    default: "text-white",
    success: "text-lime-300",
    active: "text-sky-300",
    warm: "text-amber-300",
    muted: "text-white/70",
  }[tone];
  return (
    <div>
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
    </div>
  );
}

function SpotlightTile({
  kind,
  item,
  copy,
  onClick,
}: {
  kind: "closest" | "push";
  item: BucketItem | null;
  copy: ReturnType<typeof getBucketListUiCopy>;
  onClick: (bucketId: string) => void;
}) {
  if (!item) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-sm text-white/50">
        <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          {kind === "closest" ? "✈" : "⚡"}
          {kind === "closest" ? copy.closestToReality : copy.pushThisWeek}
        </div>
        <p>{copy.noHighlight}</p>
      </div>
    );
  }

  const progress = estimateBucketProgress(item);
  const monthsOut = bucketMonthsOut(item);

  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className="group/spotlight relative block w-full rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
    >
      <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
        <span>{kind === "closest" ? "✈" : "⚡"}</span>
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
    </button>
  );
}

export type { BucketStats };
