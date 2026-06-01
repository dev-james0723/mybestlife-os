"use client";

import { useMemo } from "react";
import {
  Plane,
  Sparkles,
  Trophy,
  Heart,
  ShoppingBag,
  Sunrise,
  FolderOpen,
  Wallet,
  DollarSign,
  MapPin,
  Languages,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem, BucketType } from "@/types/bucket-list";
import {
  bucketStatusBadgeClass,
  getBucketDifficultyLabel,
  getBucketStatusLabel,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import { useBucketDreamImage } from "@/hooks/use-bucket-dream-image";
import { DreamCoverBackground } from "./dream-cover-background";

type DreamCardProps = {
  item: BucketItem;
  onClick?: () => void;
};

const TYPE_ICONS: Record<BucketType, LucideIcon> = {
  travel: Plane,
  achievement: Trophy,
  growth: Sparkles,
  relationship: Heart,
  purchase: ShoppingBag,
  lifestyle: Sunrise,
};

export function DreamCard({ item, onClick }: DreamCardProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const image = useBucketDreamImage(item);

  const TypeIcon =
    item.category_tags.includes("language") || /japanese|日本/i.test(item.title)
      ? Languages
      : TYPE_ICONS[item.type];

  const costGlyph = item.cost_band ?? "";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex h-full min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 p-4 text-left transition-all duration-200 ease-out",
        "shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "hover:-translate-y-0.5 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
      aria-label={item.title}
    >
      <DreamCoverBackground
        image={image}
        type={item.type}
        variant="card"
        interactive
      />

      {image?.sourceType === "generated" ? (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          <Sparkles className="h-2.5 w-2.5" />
          {copy.visualsAiBadge}
        </span>
      ) : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-sm">
            <TypeIcon className="h-3.5 w-3.5 text-white/90" />
            <span>{getBucketTypeLabel(item.type, copy)}</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] shadow-sm backdrop-blur-sm",
              bucketStatusBadgeClass(item.status),
            )}
          >
            {getBucketStatusLabel(item.status, copy)}
          </span>
        </div>

        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {item.title}
        </h3>

        {item.why_this_matters ? (
          <p className="mt-2 line-clamp-3 text-[13px] italic text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            &ldquo;{item.why_this_matters}&rdquo;
          </p>
        ) : item.description ? (
          <p className="mt-2 line-clamp-3 text-[13px] text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
            {item.description}
          </p>
        ) : null}

        <div className="flex-1" />

        <div className="mt-4 flex items-center justify-between rounded-lg bg-black/30 px-2 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-[12px] text-white/70">
            {costGlyph ? (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-white/55" />
                <span className="font-medium text-white/90">{costGlyph}</span>
              </span>
            ) : item.estimated_cost ? (
              <span className="inline-flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-white/55" />
                <span className="tabular-nums">
                  ${item.estimated_cost.toLocaleString()}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <DifficultyGlyph type={item.type} />
              <span>{getBucketDifficultyLabel(item.difficulty, copy)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-white/55">
            {item.linked_project_id ? (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10"
                title={copy.detailLinkedProject}
              >
                <FolderOpen className="h-3 w-3" />
              </span>
            ) : null}
            {item.linked_savings_goal_id || item.linked_budget_id ? (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10"
                title={copy.detailBudgetLinked}
              >
                <Wallet className="h-3 w-3" />
              </span>
            ) : null}
            {item.type === "travel" && item.destination_lat != null ? (
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10"
                title={item.destination_name ?? "Mapped"}
              >
                <MapPin className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {item.is_featured ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/2 z-0 h-32 w-56 -translate-x-1/2 rounded-full bg-lime-300/20 blur-3xl"
        />
      ) : null}
    </article>
  );
}

function DifficultyGlyph({ type }: { type: BucketType }) {
  const label = type === "travel" ? "✈" : type === "growth" ? "▲" : "◆";
  return (
    <span className="text-[11px] text-white/55" aria-hidden>
      {label}
    </span>
  );
}
