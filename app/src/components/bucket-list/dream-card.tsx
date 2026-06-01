"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
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
  bucketStatusCardClass,
  bucketStatusPipClass,
  bucketProgressClass,
  estimateBucketProgress,
  getBucketDifficultyLabel,
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

type DreamCardProps = {
  item: BucketItem;
  index?: number;
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

export function DreamCard({ item, index = 0, onClick }: DreamCardProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const image = useBucketDreamImage(item);
  const reduceMotion = useReducedMotion() ?? false;
  const progress = estimateBucketProgress(item);

  const TypeIcon =
    item.category_tags.includes("language") || /japanese|日本/i.test(item.title)
      ? Languages
      : TYPE_ICONS[item.type];

  const costGlyph = item.cost_band ?? "";

  return (
    <motion.article
      variants={bucketStaggerItem(reduceMotion, 18)}
      whileHover={bucketHoverLift(reduceMotion)}
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
        "hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70",
        bucketStatusCardClass(item.status),
      )}
      aria-label={item.title}
    >
      <DreamCoverBackground
        image={image}
        type={item.type}
        variant="card"
        interactive
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur-sm">
            <TypeIcon className="h-3.5 w-3.5 text-white/90" />
            <span>{getBucketTypeLabel(item.type, copy)}</span>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.16 + index * 0.02 }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] shadow-sm backdrop-blur-sm",
              bucketStatusBadgeClass(item.status),
            )}
          >
            <span
              className={cn("h-1.5 w-1.5 rounded-full", bucketStatusPipClass(item.status))}
              aria-hidden
            />
            {getBucketStatusLabel(item.status, copy)}
          </motion.span>
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

        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.14]"
          aria-hidden
        >
          <motion.div
            className={cn("h-full rounded-full", bucketProgressClass(item.status))}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={bucketProgressTransition(reduceMotion, 0.12 + index * 0.03)}
          />
        </div>

        <div className="mt-2 flex items-center justify-between rounded-lg bg-black/32 px-2 py-1.5 backdrop-blur-sm">
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
            <span className="mr-1 hidden translate-y-1 items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/75 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 md:inline-flex">
              Open
              <ArrowUpRight className="h-3 w-3" />
            </span>
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
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/2 z-0 h-32 w-56 -translate-x-1/2 rounded-full bg-lime-300/20 blur-3xl"
          animate={
            reduceMotion
              ? { opacity: 0.45 }
              : { opacity: [0.28, 0.55, 0.28], scale: [0.96, 1.04, 0.96] }
          }
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </motion.article>
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
