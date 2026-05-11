"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import {
  bucketStatusBadgeClass,
  bucketTypeBadgeClass,
  estimateBucketProgress,
  getBucketStatusLabel,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";

export function DreamListRow({
  item,
  onClick,
}: {
  item: BucketItem;
  onClick: () => void;
}) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const progress = estimateBucketProgress(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition-colors",
        "hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
              bucketStatusBadgeClass(item.status),
            )}
          >
            {getBucketStatusLabel(item.status, copy)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
              bucketTypeBadgeClass(item.type),
            )}
          >
            {getBucketTypeLabel(item.type, copy)}
          </span>
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold text-white">
          {item.title}
        </h3>
        {item.why_this_matters ? (
          <p className="mt-0.5 truncate text-[11px] italic text-white/55">
            “{item.why_this_matters}”
          </p>
        ) : null}
      </div>

      <div className="hidden w-28 shrink-0 md:block">
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-lime-400/70"
            style={{ width: `${progress}%` }}
            aria-hidden
          />
        </div>
        <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
          {progress}%
        </p>
      </div>
    </button>
  );
}
