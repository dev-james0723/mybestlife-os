"use client";

/**
 * GraphZoomControls — shared Liquid Glass zoom widget for the Brain
 * page and the Knowledge Constellation View.
 *
 * Renders a compact pill at the bottom-left of the graph viewport with
 * a Zoom-out, percentage, Zoom-in, and Fit-to-screen control. The
 * percentage display syncs with whatever zoom the canvas reports
 * through `onZoomChange` (mouse wheel, trackpad, programmatic fit).
 *
 * Visual language: translucent glass (white/[0.06] in dark, white/70
 * in light) with backdrop-blur, soft white inner highlight, and a thin
 * border — see `liquid_glass_ui.md` §8.1.
 */

import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface GraphZoomControlsProps {
  /** Latest zoom factor reported by the canvas (k from d3-zoom). */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Reset zoom to 100%. Falls back to onFit if not provided. */
  onResetZoom?: () => void;
  /** Fit all visible nodes to the viewport. */
  onFit: () => void;
  /** Optional className override for absolute positioning. */
  className?: string;
}

export function GraphZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
  className,
}: GraphZoomControlsProps) {
  const { t: graphT } = useGraphSurface();
  const percent = Math.max(1, Math.round((zoom || 1) * 100));

  return (
    <div
      role="group"
      aria-label="Zoom controls"
      className={cn(
        "pointer-events-auto absolute left-3 bottom-3 z-30 flex items-center gap-0.5 px-1 py-1",
        graphT.glass.pill,
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("h-7 w-7 rounded-full", graphT.tone.ghostBtn)}
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <button data-control-variant="ghost"
        type="button"
        onClick={onResetZoom ?? onFit}
        title={onResetZoom ? "Reset zoom to 100%" : "Fit to view"}
        aria-label={onResetZoom ? "Reset zoom" : "Fit to view"}
        className={cn(
          "min-w-[3.25rem] rounded-full px-2 py-1 text-center font-mono text-[11px] tabular-nums tracking-tight transition-colors",
          graphT.tone.body,
          graphT.tone.rowHover,
        )}
      >
        {percent}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("h-7 w-7 rounded-full", graphT.tone.ghostBtn)}
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <span aria-hidden className={cn("mx-1 h-4 w-px", graphT.glass.divider, "border-l")} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("h-7 w-7 rounded-full", graphT.tone.ghostBtn)}
        onClick={onFit}
        aria-label="Fit graph to view"
        title="Fit graph to view"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
