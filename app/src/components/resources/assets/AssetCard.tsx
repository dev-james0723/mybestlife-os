"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { AssetCategoryPill } from "./AssetCategoryPill";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import type { Asset, AssetCategoryKey } from "@/types/assets";

type FieldRow = {
  /** Already-localized label, e.g. "Value". */
  label: string;
  /** Already-formatted value (currency / date / location). Optional because we skip empty rows. */
  value: string | null | undefined;
};

export type AssetCardProps = {
  asset: Asset;
  /** Already-localized category label (resolved upstream from category_key or legacy category). */
  categoryLabel: string | null;
  /** Field rows rendered under the title. Falsy values skipped. */
  fields: FieldRow[];
  onClick?: () => void;
  /**
   * Favorite toggle. Renders filled star when `asset.is_favorite` is true.
   * Pass no-op / undefined and the star becomes purely decorative.
   */
  onToggleFavorite?: () => void;
};

// Motion variants used for grid entrance stagger. The grid parent wraps all
// cards in a `motion.div` with variants: { show: { transition: { staggerChildren } } },
// and each AssetCard declares itself a child via `variants={cardVariants}`.
const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

export function AssetCard({
  asset,
  categoryLabel,
  fields,
  onClick,
  onToggleFavorite,
}: AssetCardProps) {
  const prefersReduced = useReducedMotion();
  const visibleFields = fields.filter(
    (f): f is FieldRow & { value: string } => !!f.value,
  );

  return (
    <motion.div
      variants={prefersReduced ? undefined : cardVariants}
      whileHover={prefersReduced ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className="relative"
    >
      <Card
        onClick={onClick}
        className={cn(
          "group/asset relative flex h-full flex-col gap-3 overflow-hidden p-4 transition-[box-shadow,border-color] duration-200",
          onClick && "cursor-pointer hover:shadow-lg",
        )}
      >
        {/* Gradient sweep on hover — diagonal pink glaze, behind content. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
            "group-hover/asset:opacity-100",
          )}
          style={{
            background:
              "linear-gradient(135deg, transparent 40%, var(--accent-pink-from) 100%)",
            mixBlendMode: "soft-light",
          }}
        />

        <div className="relative flex items-start justify-between gap-2">
          {categoryLabel ? (
            <AssetCategoryPill
              categoryKey={asset.category_key as AssetCategoryKey | null}
              label={categoryLabel}
            />
          ) : (
            <span />
          )}
          <FavoriteStar
            active={asset.is_favorite}
            onClick={onToggleFavorite}
          />
        </div>

        <h3 className="relative text-base font-semibold leading-snug tracking-tight text-foreground">
          {asset.name}
        </h3>

        {visibleFields.length > 0 && (
          <dl className="relative mt-auto grid grid-cols-1 gap-y-1 text-sm">
            {visibleFields.map((f) => (
              <div
                key={f.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="min-w-0 truncate text-right text-foreground">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
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
  const prefersReduced = useReducedMotion();
  const interactive = typeof onClick === "function";

  const icon = (
    <Star
      className={cn(
        "size-4 transition-colors",
        active
          ? "fill-[var(--accent-pink)] text-[var(--accent-pink)]"
          : interactive
            ? "text-muted-foreground"
            : "text-muted-foreground/30",
      )}
    />
  );

  // Decorative (non-interactive): render static icon, no button / no pop.
  if (!interactive) {
    return <span aria-hidden className="shrink-0">{icon}</span>;
  }

  // Interactive: pop on each toggle via key-rekeyed motion child inside AnimatePresence.
  // `key={String(active)}` forces remount so the scale-pop plays on every state flip.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Mark as favorite"}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
        "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={String(active)}
          initial={prefersReduced ? { opacity: 0 } : { scale: 0.6, opacity: 0 }}
          animate={
            prefersReduced
              ? { opacity: 1 }
              : { scale: [0.6, 1.25, 1], opacity: 1 }
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
