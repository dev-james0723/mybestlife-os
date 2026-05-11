"use client";

import { Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import {
  ASSET_CATEGORY_KEYS,
  type AssetCategoryKey,
} from "@/types/assets";
import {
  CATEGORY_HUE,
  DEFAULT_CATEGORY_HUE,
} from "./AssetCategoryPill";

/**
 * Horizontal category filter row used on desktop (sm+). On mobile we fall
 * back to a plain Select (rendered separately in AssetsView) because chip rows
 * don't scale well at narrow widths without horizontal scroll.
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
        "flex flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <CategoryChip
        active={value === ALL_CATEGORIES_VALUE}
        hue={DEFAULT_CATEGORY_HUE}
        label={allLabel}
        onClick={() => onChange(ALL_CATEGORIES_VALUE)}
      />
      {ASSET_CATEGORY_KEYS.map((key) => (
        <CategoryChip
          key={key}
          active={value === key}
          hue={CATEGORY_HUE[key]}
          label={categoryLabels[key]}
          onClick={() => onChange(key)}
        />
      ))}
      {/* Visual divider between category chips and the favorites facet */}
      <span
        aria-hidden
        className="mx-0.5 hidden h-5 w-px bg-border sm:inline-block"
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
  hue: number;
  label: string;
  onClick: () => void;
};

function CategoryChip({ active, hue, label, onClick }: CategoryChipProps) {
  const prefersReduced = useReducedMotion();

  // Two visual states:
  //  - inactive: muted outline, inherits foreground color (so the row reads
  //    as a unified surface before selection)
  //  - active: filled with the category hue — same family as AssetCategoryPill
  //    but bumped chroma so the selection is unambiguous
  const activeStyle: React.CSSProperties = {
    backgroundColor: `oklch(0.6 0.14 ${hue} / 0.18)`,
    borderColor: `oklch(0.6 0.14 ${hue} / 0.5)`,
    color: `oklch(0.42 0.18 ${hue})`,
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium leading-tight",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        !active &&
          "border-border/70 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
      style={active ? activeStyle : undefined}
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
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-tight transition-colors",
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
