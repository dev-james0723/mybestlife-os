"use client";

/**
 * Floating zoom HUD for Brain 3D Sphere — full-sphere and focus modes.
 * **0%** = farthest camera distance; **100%** = closest allowed zoom.
 * Mirrors GraphZoomControls styling (liquid glass pill).
 */

import { Maximize2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";

interface SphereFocusZoomControlsProps {
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Snap to farthest zoom (0%) on the active orbit. */
  onPercentClick?: () => void;
  /** Fit full sphere — reset camera and exit sphere focus. */
  onFit?: () => void;
  /** Percentage points per step (default 5). */
  step?: number;
  className?: string;
}

export function SphereFocusZoomControls({
  percent,
  onZoomIn,
  onZoomOut,
  onPercentClick,
  onFit,
  step = 5,
  className,
}: SphereFocusZoomControlsProps) {
  const { t: graphT } = useGraphSurface();
  const display = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      role="group"
      aria-label="Sphere zoom"
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
        disabled={display <= 0}
        aria-label={`Zoom out ${step} percent`}
        title={`Zoom out (${step}%) — toward 0% farthest`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <button
        type="button"
        onClick={onPercentClick}
        title={
          onPercentClick
            ? "Zoom to farthest (0%) on the current view"
            : undefined
        }
        aria-label="Zoom to farthest"
        className={cn(
          "min-w-[3.25rem] rounded-full px-2 py-1 text-center font-mono text-[11px] tabular-nums tracking-tight",
          graphT.tone.body,
          onPercentClick && graphT.tone.rowHover,
        )}
        aria-live="polite"
      >
        {display}%
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn("h-7 w-7 rounded-full", graphT.tone.ghostBtn)}
        onClick={onZoomIn}
        disabled={display >= 100}
        aria-label={`Zoom in ${step} percent`}
        title={`Zoom in (${step}%) — toward 100% closest`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
      {onFit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn("h-7 w-7 rounded-full", graphT.tone.ghostBtn)}
          onClick={onFit}
          aria-label="Fit full sphere"
          title="Fit full sphere — reset camera and exit focus"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
