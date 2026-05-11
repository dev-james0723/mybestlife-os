import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { GlassPanel } from "@/components/ui/glass-panel"
import { cn } from "@/lib/utils"

/**
 * GlassTintPanel — used on the dashboard to wrap emotionally-colored
 * sections (MotivationCard teal / Grateful pink / DailyInspirationCard
 * violet). It renders a `<GlassPanel>` with a secondary tint overlay
 * stacked behind the content, so the liquid-glass feel is preserved
 * while each section retains its identifying hue.
 *
 * Scoped usage: dashboard-only helper. Other themes will naturally fall
 * back to a weaker glass look because GlassPanel's CSS variables are
 * undefined outside `html[data-ui-theme="default"]`; the tint overlay
 * itself is self-contained and safe.
 */
const tintOverlay = cva(
  "pointer-events-none absolute inset-0 -z-0 mix-blend-screen dark:mix-blend-overlay",
  {
    variants: {
      tint: {
        none: "",
        teal: "[background:radial-gradient(ellipse_at_top_left,color-mix(in_oklch,oklch(0.78_0.13_190)_13%,transparent),transparent_70%)]",
        pink: "[background:radial-gradient(ellipse_at_top_right,color-mix(in_oklch,oklch(0.74_0.18_350)_13%,transparent),transparent_70%)]",
        violet:
          "[background:radial-gradient(ellipse_at_top,color-mix(in_oklch,oklch(0.7_0.19_295)_13%,transparent),transparent_72%)]",
      },
    },
    defaultVariants: {
      tint: "none",
    },
  }
)

type TintVariant = NonNullable<VariantProps<typeof tintOverlay>["tint"]>

type GlassTintPanelProps = Omit<
  React.ComponentProps<typeof GlassPanel>,
  "children"
> & {
  tint?: TintVariant
  children?: React.ReactNode
  /** Forwarded to the inner content wrapper (NOT the outer panel). */
  contentClassName?: string
}

function GlassTintPanel({
  tint = "none",
  className,
  children,
  contentClassName,
  ...rest
}: GlassTintPanelProps) {
  return (
    <GlassPanel
      data-tint={tint}
      className={cn("overflow-hidden", className)}
      {...rest}
    >
      <span aria-hidden className={cn(tintOverlay({ tint }))} />
      <div className={cn("relative z-10", contentClassName)}>{children}</div>
    </GlassPanel>
  )
}

export { GlassTintPanel }
export type { GlassTintPanelProps, TintVariant }
