/**
 * Visual tokens for Bio Lab tools — Phase 3 polish.
 *
 * Why this file exists:
 *   - Each of the four tools needs its own subtle accent so the four
 *     completion cards/panels feel distinct without breaking the shared
 *     shell.
 *   - The four UI themes (default / astronaut / academia / forest) each
 *     have their own palette in `globals.css`. Tool accents must read
 *     well in all of them.
 *   - We deliberately use Tailwind arbitrary-value classes (with explicit
 *     opacity) instead of one-off CSS variables so changes happen in one
 *     place and ship as JIT-compiled utilities.
 *
 * Stability guarantee: the *tokens themselves* (object keys, return shape)
 * are stable; the actual Tailwind classes are styling and may evolve.
 *
 * Consumers MUST treat the returned strings as opaque — don't parse or
 * pattern-match them. Just spread into `className`.
 */

import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import type { UiTheme } from "@/types/database";

// ============================================================
// Public token shape
// ============================================================

export type BioLabVisualTokens = {
  /** Subtle background tint for the completion card surface. */
  cardSurface: string;
  /** Decorative gradient overlay applied above the surface (absolute). */
  cardGradient: string;
  /** Color of the small "next-step" CTA accent ring on the completion card. */
  accentRing: string;
  /** Tailwind class string for the tool's icon foreground. */
  iconForeground: string;
  /** Background for the icon chip (small rounded square in the header). */
  iconChip: string;
  /** Color of the celebratory sparkle particles. */
  sparkleColor: string;
};

// ============================================================
// Per-tool base palette (theme-neutral; theme overlays on top)
// ============================================================

/**
 * Per-tool accent stays consistent across themes — only opacity / surface
 * darkness shifts per theme. This way a user always recognises State Scan
 * as "the cyan one" regardless of which theme they're in.
 */
const toolPalette: Record<
  BioLabToolId,
  {
    iconColorClass: string;
    iconChipClass: string;
    accentRingClass: string;
    sparkleClass: string;
  }
> = {
  "focus-sprint": {
    iconColorClass: "text-amber-500 dark:text-amber-300",
    iconChipClass:
      "bg-amber-500/10 dark:bg-amber-300/10 ring-1 ring-amber-500/20 dark:ring-amber-300/20",
    accentRingClass: "ring-amber-500/40 dark:ring-amber-300/40",
    sparkleClass: "text-amber-500 dark:text-amber-300",
  },
  "mind-sweep": {
    iconColorClass: "text-violet-500 dark:text-violet-300",
    iconChipClass:
      "bg-violet-500/10 dark:bg-violet-300/10 ring-1 ring-violet-500/20 dark:ring-violet-300/20",
    accentRingClass: "ring-violet-500/40 dark:ring-violet-300/40",
    sparkleClass: "text-violet-500 dark:text-violet-300",
  },
  "state-scan": {
    iconColorClass: "text-cyan-600 dark:text-cyan-300",
    iconChipClass:
      "bg-cyan-500/10 dark:bg-cyan-300/10 ring-1 ring-cyan-500/20 dark:ring-cyan-300/20",
    accentRingClass: "ring-cyan-500/40 dark:ring-cyan-300/40",
    sparkleClass: "text-cyan-600 dark:text-cyan-300",
  },
  "system-reset": {
    iconColorClass: "text-emerald-600 dark:text-emerald-300",
    iconChipClass:
      "bg-emerald-500/10 dark:bg-emerald-300/10 ring-1 ring-emerald-500/20 dark:ring-emerald-300/20",
    accentRingClass: "ring-emerald-500/40 dark:ring-emerald-300/40",
    sparkleClass: "text-emerald-600 dark:text-emerald-300",
  },
};

// ============================================================
// Per-theme card surface treatment
// ============================================================

/**
 * Theme-specific surface + gradient treatment. The tool-accent layer sits
 * on top of these to keep the four tools recognisable inside each theme.
 */
const themeSurface: Record<
  UiTheme,
  { cardSurface: string; cardGradient: string }
> = {
  default: {
    cardSurface: "bg-card/95",
    cardGradient:
      "bg-gradient-to-br from-primary/[0.06] via-transparent to-muted/25",
  },
  astronaut: {
    // Cool, deep — the astronaut palette tends darker, lift the gradient
    cardSurface: "bg-card/95",
    cardGradient:
      "bg-gradient-to-br from-indigo-500/[0.10] via-transparent to-slate-500/[0.10]",
  },
  academia: {
    // Warm parchment feel
    cardSurface: "bg-card/95",
    cardGradient:
      "bg-gradient-to-br from-amber-700/[0.08] via-transparent to-stone-500/[0.10]",
  },
  forest: {
    // Soft green wash
    cardSurface: "bg-card/95",
    cardGradient:
      "bg-gradient-to-br from-emerald-600/[0.08] via-transparent to-teal-700/[0.08]",
  },
};

// ============================================================
// Public resolver
// ============================================================

export function getBioLabVisualTokens(
  tool: BioLabToolId,
  theme: UiTheme,
): BioLabVisualTokens {
  const tool_ = toolPalette[tool];
  const theme_ = themeSurface[theme];
  return {
    cardSurface: theme_.cardSurface,
    cardGradient: theme_.cardGradient,
    accentRing: tool_.accentRingClass,
    iconForeground: tool_.iconColorClass,
    iconChip: tool_.iconChipClass,
    sparkleColor: tool_.sparkleClass,
  };
}
