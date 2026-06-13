import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * GlassPanel — frosted-glass surface for the `default` UI theme.
 *
 * Visuals are driven by CSS variables defined under
 * `html[data-ui-theme="default"]` in `globals.css` (`--surface-glass`,
 * `--border-glass`, `--shadow-glass`, `--glass-blur`,
 * `--glass-saturation`). Under other themes those variables are
 * undefined, so the wrapper falls back to a solid card surface
 * (`--card` / `--border`) — i.e. glass on the default theme, a plain
 * opaque card elsewhere. Callers may still override via `className`.
 *
 * This component is purely presentational: it adds no interactive
 * behaviour, no business logic, and never alters the children it wraps.
 */
const glassPanelVariants = cva(
  "relative rounded-2xl border [background:var(--surface-glass,var(--card))] [border-color:var(--border-glass,var(--border))] [box-shadow:var(--shadow-glass,0_1px_2px_rgba(0,0,0,0.05))] [backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))]",
  {
    variants: {
      variant: {
        default: "",
        strong:
          "rounded-xl [background:var(--surface-glass-strong,var(--card))] [border-color:var(--border-glass-strong,var(--border))]",
      },
      interactive: {
        true: "transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:[border-color:var(--border-glass-strong)] focus-within:[border-color:var(--border-glass-strong)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
)

type GlassPanelProps = React.ComponentProps<"div"> &
  VariantProps<typeof glassPanelVariants>

function GlassPanel({
  className,
  variant,
  interactive,
  ...props
}: GlassPanelProps) {
  return (
    <div
      data-slot="glass-panel"
      data-variant={variant ?? "default"}
      data-interactive={interactive ? "true" : undefined}
      className={cn(glassPanelVariants({ variant, interactive, className }))}
      {...props}
    />
  )
}

export { GlassPanel, glassPanelVariants }
export type { GlassPanelProps }
