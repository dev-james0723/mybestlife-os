"use client";

import { useCallback, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

interface MoodPadProps {
  valence: number | null; // 1-10, horizontal axis (sad ↔ happy)
  arousal: number | null; // 1-10, vertical axis (calm ↔ energized)
  onChange: (next: { valence: number; arousal: number }) => void;
  quadrantLabels: { tense: string; excited: string; calm: string; low: string };
  valenceAxis: string;
  arousalAxis: string;
  disabled?: boolean;
  className?: string;
}

/**
 * 2D mood pad: Russell's circumplex model. Valence on X, arousal on Y.
 * Values 1-10 on each axis.
 *
 * Keyboard: Arrow keys move by 1, Shift+Arrow by 3.
 */
export function MoodPad({
  valence,
  arousal,
  onChange,
  quadrantLabels,
  valenceAxis,
  arousalAxis,
  disabled,
  className,
}: MoodPadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);

  const setFromClient = useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;
      const rect = padRef.current?.getBoundingClientRect();
      if (!rect) return;
      const vx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const vy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const nextValence = Math.max(1, Math.min(10, Math.round(vx * 9 + 1)));
      // Screen Y grows downward; arousal is higher at the top, so invert.
      const nextArousal = Math.max(1, Math.min(10, Math.round((1 - vy) * 9 + 1)));
      onChange({ valence: nextValence, arousal: nextArousal });
    },
    [disabled, onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClient(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromClient(e.clientX, e.clientY);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 3 : 1;
    let v = valence ?? 5;
    let a = arousal ?? 5;
    switch (e.key) {
      case "ArrowLeft":
        v = Math.max(1, v - step);
        break;
      case "ArrowRight":
        v = Math.min(10, v + step);
        break;
      case "ArrowUp":
        a = Math.min(10, a + step);
        break;
      case "ArrowDown":
        a = Math.max(1, a - step);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange({ valence: v, arousal: a });
  };

  // Convert model values -> px% for the dot.
  const dotX = valence !== null ? ((valence - 1) / 9) * 100 : null;
  const dotY = arousal !== null ? (1 - (arousal - 1) / 9) * 100 : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{valenceAxis}</span>
        <span>{arousalAxis}</span>
      </div>
      <div
        ref={padRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${valenceAxis}, ${arousalAxis}`}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={valence ?? undefined}
        aria-valuetext={
          valence !== null && arousal !== null
            ? `${valenceAxis}: ${valence}, ${arousalAxis}: ${arousal}`
            : undefined
        }
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className={cn(
          "relative aspect-square w-full select-none rounded-2xl border bg-gradient-to-br from-amber-200/30 via-green-200/20 to-indigo-400/20",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair",
        )}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-3 text-[11px] font-medium text-foreground/60 pointer-events-none">
          <div className="flex justify-between">
            <span>{quadrantLabels.tense}</span>
            <span>{quadrantLabels.excited}</span>
          </div>
          <div className="flex justify-between">
            <span>{quadrantLabels.low}</span>
            <span>{quadrantLabels.calm}</span>
          </div>
        </div>
        <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/10" />
        {dotX !== null && dotY !== null && (
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg ring-2 ring-background transition"
            style={{ left: `${dotX}%`, top: `${dotY}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
