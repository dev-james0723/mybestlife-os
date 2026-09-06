"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { filterHorizontalScrollClassName } from "@/components/shared/filter-scroll";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useHydrationSafeReducedMotion } from "@/hooks/use-hydration-safe-reduced-motion";
import {
  ASSET_CATEGORY_KEYS,
  type AssetCategoryKey,
} from "@/types/assets";

/**
 * Horizontal category filter row used on tablet/desktop (sm+). On mobile we
 * fall back to a plain Select rendered separately in AssetsView.
 *
 * The "Favorites" chip is intentionally part of the same row so it reads as
 * another filter facet rather than a disconnected toggle.
 */

export const ALL_CATEGORIES_VALUE = "__all__" as const;
export type CategoryChipValue =
  | typeof ALL_CATEGORIES_VALUE
  | AssetCategoryKey;

type CategoryFilterChipsProps = {
  value: CategoryChipValue;
  onChange: (next: CategoryChipValue) => void;
  favoritesOnly: boolean;
  onFavoritesOnlyChange: (next: boolean) => void;
  /** Localized labels. Keyed by AssetCategoryKey. */
  categoryLabels: Record<AssetCategoryKey, string>;
  /** Localized "All categories" label. */
  allLabel: string;
  /** Localized "Favorites" label. */
  favoritesLabel: string;
  className?: string;
};

export function CategoryFilterChips({
  value,
  onChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  categoryLabels,
  allLabel,
  favoritesLabel,
  className,
}: CategoryFilterChipsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Category filters"
      className={cn(
        filterHorizontalScrollClassName,
        className,
      )}
    >
      <CategoryChip
        active={value === ALL_CATEGORIES_VALUE}
        label={allLabel}
        onClick={() => onChange(ALL_CATEGORIES_VALUE)}
      />
      {ASSET_CATEGORY_KEYS.map((key) => (
        <CategoryChip
          key={key}
          active={value === key}
          label={categoryLabels[key]}
          onClick={() => onChange(key)}
        />
      ))}
      {/* Visual divider between category chips and the favorites facet */}
      <span
        aria-hidden
        className="mx-0.5 hidden h-5 w-px shrink-0 bg-border sm:inline-block"
      />
      <FavoritesChip
        active={favoritesOnly}
        label={favoritesLabel}
        onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
      />
    </div>
  );
}

// -------------------------------------------------------------------------
// Chip primitives
// -------------------------------------------------------------------------

type CategoryChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function CategoryChip({ active, label, onClick }: CategoryChipProps) {
  const prefersReduced = useHydrationSafeReducedMotion();

  return (
    <motion.button
      type="button"
      data-slot="project-filter"
      onClick={onClick}
      aria-pressed={active}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium leading-tight sm:min-h-0 sm:min-w-0",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        !active &&
          "border-border/70 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </motion.button>
  );
}

function FavoritesChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  const prefersReduced = useHydrationSafeReducedMotion();

  return (
    <motion.button
      type="button"
      data-slot="project-filter"
      onClick={onClick}
      aria-pressed={active}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium leading-tight transition-colors sm:min-h-0 sm:min-w-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        active
          ? "border-[var(--accent-pink)]/50 bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]"
          : "border-border/70 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Star
        className={cn(
          "size-3.5",
          active && "fill-[var(--accent-pink)] text-[var(--accent-pink)]",
        )}
      />
      {label}
    </motion.button>
  );
}
