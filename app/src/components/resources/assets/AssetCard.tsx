"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Star, Package, ArrowUpRight } from "lucide-react";
import { AssetCategoryPill } from "./AssetCategoryPill";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import type { Asset, AssetCategoryKey } from "@/types/assets";

export type AssetCardBadge = {
  key: string;
  label: string;
  tone: "warn" | "info" | "good";
};

export type AssetCardProps = {
  asset: Asset;
  /** Already-localized category label (resolved upstream). */
  categoryLabel: string | null;
  /** Already-formatted display value (currency). */
  valueText: string;
  /** Primary image URL (uploaded or generated), if any. */
  imageUrl?: string | null;
  /** Whether the primary image is generated. Kept for internal provenance only. */
  imageIsGenerated?: boolean;
  /** Document health 0-100 (lite, field-derived for the grid). */
  documentHealth?: number;
  /** Risk / status badges. */
  badges?: AssetCardBadge[];
  /** Short AI / heuristic insight preview line. */
  insightPreview?: string | null;
  /** Localized "current value" caption. */
  valueLabel: string;
  /** Localized "document health" caption. */
  docHealthLabel: string;
  /** Localized "Open Intelligence" CTA. */
  openLabel: string;
  onClick?: () => void;
  onToggleFavorite?: () => void;
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

const TONE_CLASS: Record<AssetCardBadge["tone"], string> = {
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

function healthTone(score: number): string {
  if (score >= 80) return "var(--accent-pink)";
  if (score >= 55) return "oklch(0.7 0.15 145)";
  if (score >= 30) return "oklch(0.75 0.15 85)";
  return "oklch(0.65 0.2 25)";
}

export function AssetCard({
  asset,
  categoryLabel,
  valueText,
  imageUrl,
  documentHealth,
  badges = [],
  insightPreview,
  valueLabel,
  docHealthLabel,
  openLabel,
  onClick,
  onToggleFavorite,
}: AssetCardProps) {
  const prefersReduced = useHydrationSafeReducedMotion();

  return (
    <motion.div
      variants={prefersReduced ? undefined : cardVariants}
      whileHover={prefersReduced ? undefined : { y: -3 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className="relative"
    >
      <Card
        onClick={onClick}
        className={cn(
          "group/asset relative flex h-full flex-col gap-3 overflow-hidden p-0 transition-[box-shadow,border-color] duration-200",
          onClick && "cursor-pointer hover:shadow-lg",
        )}
      >
        {/* ── Visual ── */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={asset.name}
              className="size-full object-cover transition-transform duration-500 group-hover/asset:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Package className="size-10 text-muted-foreground/40" />
            </div>
          )}

          <div className="absolute right-2 top-2">
            <FavoriteStar active={asset.is_favorite} onClick={onToggleFavorite} />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            {categoryLabel ? (
              <AssetCategoryPill
                categoryKey={asset.category_key as AssetCategoryKey | null}
                label={categoryLabel}
              />
            ) : (
              <span />
            )}
          </div>

          <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground">
            {asset.name}
          </h3>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {valueLabel}
              </p>
              <p className="text-lg font-semibold text-foreground">{valueText}</p>
            </div>
            {typeof documentHealth === "number" && (
              <div className="min-w-[88px]">
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="text-[11px] text-muted-foreground">
                    {docHealthLabel}
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {documentHealth}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: healthTone(documentHealth) }}
                    initial={prefersReduced ? false : { width: 0 }}
                    animate={{ width: `${documentHealth}%` }}
                    transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  />
                </div>
              </div>
            )}
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.slice(0, 3).map((b) => (
                <span
                  key={b.key}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    TONE_CLASS[b.tone],
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {insightPreview && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {insightPreview}
            </p>
          )}

          {onClick && (
            <div className="mt-auto flex items-center gap-1 pt-1 text-xs font-medium text-[var(--accent-pink)] opacity-0 transition-opacity duration-200 group-hover/asset:opacity-100">
              {openLabel}
              <ArrowUpRight className="size-3.5" />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function FavoriteStar({
  active,
  onClick,
}: {
  active: boolean;
  onClick?: () => void;
}) {
  const prefersReduced = useHydrationSafeReducedMotion();
  const interactive = typeof onClick === "function";

  const icon = (
    <Star
      className={cn(
        "size-4 transition-colors",
        active
          ? "fill-[var(--accent-pink)] text-[var(--accent-pink)]"
          : "text-white drop-shadow",
      )}
    />
  );

  if (!interactive) {
    return (
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
    );
  }

  return (
    <button data-control-variant="ghost"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Mark as favorite"}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-background/40 backdrop-blur sm:size-8",
        "transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={String(active)}
          initial={prefersReduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          animate={
            prefersReduced ? { opacity: 1 } : { scale: [0.6, 1.25, 1], opacity: 1 }
          }
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.15 : 0.35, ease: EASE_OUT_EXPO }}
          className="inline-flex"
        >
          {icon}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
