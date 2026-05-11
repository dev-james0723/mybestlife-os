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

  // Special icon tweaks (e.g. Japanese — language glyph).
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
        "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200 ease-out",
        "shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl",
        "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
      )}
      aria-label={item.title}
    >
      {/* Top row — type icon + label + status pill */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
          <TypeIcon className="h-3.5 w-3.5 text-white/70" />
          <span>{getBucketTypeLabel(item.type, copy)}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
            bucketStatusBadgeClass(item.status),
          )}
        >
          {getBucketStatusLabel(item.status, copy)}
        </span>
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug tracking-tight text-white">
        {item.title}
      </h3>

      {/* Why it matters / description */}
      {item.why_this_matters ? (
        <p className="mt-2 line-clamp-3 text-[13px] italic text-white/65">
          &ldquo;{item.why_this_matters}&rdquo;
        </p>
      ) : item.description ? (
        <p className="mt-2 line-clamp-3 text-[13px] text-white/60">
          {item.description}
        </p>
      ) : null}

      <div className="flex-1" />

      {/* Footer — cost, difficulty, integration indicators */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[12px] text-white/55">
          {costGlyph ? (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-white/45" />
              <span className="font-medium text-white/75">{costGlyph}</span>
            </span>
          ) : item.estimated_cost ? (
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-white/45" />
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

        <div className="flex items-center gap-1 text-white/45">
          {item.linked_project_id ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.04]"
              title={copy.detailLinkedProject}
            >
              <FolderOpen className="h-3 w-3" />
            </span>
          ) : null}
          {item.linked_savings_goal_id || item.linked_budget_id ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.04]"
              title={copy.detailBudgetLinked}
            >
              <Wallet className="h-3 w-3" />
            </span>
          ) : null}
          {item.type === "travel" && item.destination_lat != null ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.04]"
              title={item.destination_name ?? "Mapped"}
            >
              <MapPin className="h-3 w-3" />
            </span>
          ) : null}
        </div>
      </div>

      {/* Featured glow */}
      {item.is_featured ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-lime-300/25 blur-3xl"
        />
      ) : null}
    </article>
  );
}

function DifficultyGlyph({ type }: { type: BucketType }) {
  // Tiny decorative badge so each card has at least two pieces of metadata
  // in the footer without being noisy.
  const label = type === "travel" ? "✈" : type === "growth" ? "▲" : "◆";
  return (
    <span className="text-[11px] text-white/45" aria-hidden>
      {label}
    </span>
  );
}
