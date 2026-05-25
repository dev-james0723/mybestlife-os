"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SliderInputProps = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (n: number) => void;
  /** Optional captions rendered under the track ends. */
  labels?: { min?: string; max?: string };
  className?: string;
};

/**
 * SliderInput — accessible glass range slider.
 *
 * Built on a native <input type="range"> so keyboard (arrows/Home/End/PageUp),
 * pointer, and touch interaction plus the implicit role="slider" semantics come
 * for free. The native control is visually hidden but kept interactive on top of
 * a styled glass track; the filled portion and thumb are derived from `value`.
 */
export function SliderInput({
  min,
  max,
  step = 1,
  value,
  onChange,
  labels,
  className,
}: SliderInputProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative flex h-9 items-center">
        {/* Track */}
        <div
          aria-hidden
          className="absolute inset-x-0 h-2 rounded-full border [background:var(--surface-glass)] [border-color:var(--border-glass)] [backdrop-filter:blur(var(--glass-blur,20px))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))]"
        />
        {/* Filled portion */}
        <div
          aria-hidden
          className="absolute h-2 rounded-full bg-[linear-gradient(135deg,var(--accent-pink-from),var(--accent-pink-to))]"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          aria-hidden
          className="pointer-events-none absolute size-5 -translate-x-1/2 rounded-full border-2 border-[var(--accent-pink)] bg-background shadow-[0_2px_8px_-2px_var(--accent-pink)]"
          style={{ left: `${pct}%` }}
        />
        {/* Native range — visually transparent, fully interactive + a11y */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clamped}
          className={cn(
            "relative z-10 m-0 h-9 w-full cursor-pointer appearance-none bg-transparent",
            "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
            // Hide the native thumb (our styled thumb sits underneath) while
            // keeping the full-width hit area for pointer/keyboard control.
            "[&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-transparent",
            "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent",
          )}
        />
      </div>

      {(labels?.min || labels?.max) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{labels?.min ?? ""}</span>
          <span>{labels?.max ?? ""}</span>
        </div>
      )}
    </div>
  );
}

export default SliderInput;
