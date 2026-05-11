"use client";

import { cn } from "@/lib/utils";
import type { AssetCategoryKey } from "@/types/assets";

/**
 * Per-category tint for the small pill badge on AssetCard.
 *
 * We keep this a tiny static map rather than another design-token layer: each
 * pill is a low-chroma translucent background + a saturated foreground, so a
 * single hue per category is enough. Hue values are OKLCH h° degrees.
 *
 * Exported so the category filter chips can share the same palette and feel
 * visually part of the same family as the card pills.
 */
export const CATEGORY_HUE: Record<AssetCategoryKey, number> = {
  real_estate: 145, // green (home/land)
  vehicle: 240, // blue (road/sky)
  electronics: 270, // violet (tech)
  musical_instrument: 25, // warm amber (wood/brass)
  investment: 85, // gold (money)
  other: 220, // neutral slate-blue
};

/** Neutral hue used for the "All categories" chip and as a fallback. */
export const DEFAULT_CATEGORY_HUE = 220;

type AssetCategoryPillProps = {
  categoryKey: AssetCategoryKey | null;
  /** Already-localized label (the only thing we render inside the pill). */
  label: string;
  className?: string;
};

export function AssetCategoryPill({
  categoryKey,
  label,
  className,
}: AssetCategoryPillProps) {
  const hue =
    categoryKey != null ? CATEGORY_HUE[categoryKey] : DEFAULT_CATEGORY_HUE;

  // Two-layer tint: translucent bg + matching border + stronger-chroma text.
  // Each channel uses the same hue so the pill reads as a single color family
  // in both light and dark mode without a second variable set.
  const style = {
    backgroundColor: `oklch(0.6 0.14 ${hue} / 0.14)`,
    borderColor: `oklch(0.6 0.14 ${hue} / 0.28)`,
    color: `oklch(0.48 0.16 ${hue})`,
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight",
        "dark:text-[color:oklch(0.78_0.14_var(--_h))]",
        className,
      )}
      style={{ ...style, ["--_h" as string]: String(hue) }}
    >
      {label}
    </span>
  );
}
