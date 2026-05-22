"use client";

import {
  useCallback,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/utils";

interface JournalSliderProps {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  label: string;
  /** Optional label rendered after the value (e.g. "/10"). */
  valueSuffix?: string;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
}

/**
 * Discrete integer slider with full ARIA / keyboard support.
 *
 * - Pointer drag along the track.
 * - Arrow keys ±1, PageUp/PageDown ±2, Home/End jump to bounds.
 * - Always renders `role="slider"` so screen readers announce a single
 *   control regardless of how many segments we draw.
 */
export function JournalSlider({
  value,
  onChange,
  min,
  max,
  label,
  valueSuffix,
  disabled,
  className,
  trackClassName,
}: JournalSliderProps) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const range = max - min;
  const clamp = useCallback(
    (n: number) => Math.max(min, Math.min(max, Math.round(n))),
    [min, max],
  );

  const setFromClientX = useCallback(
    (clientX: number) => {
      if (disabled) return;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onChange(clamp(min + ratio * range));
    },
    [disabled, onChange, min, range, clamp],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.buttons === 0) return;
    setFromClientX(e.clientX);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = clamp(value - 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = clamp(value + 1);
        break;
      case "PageDown":
        next = clamp(value - 2);
        break;
      case "PageUp":
        next = clamp(value + 2);
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next !== value) onChange(next);
  };

  const ratio = range === 0 ? 0 : (value - min) / range;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        id={id}
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className={cn(
          "relative h-7 flex-1 cursor-pointer touch-none rounded-full bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          trackClassName,
        )}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
          style={{ width: `${ratio * 100}%` }}
          aria-hidden
        />
        <div
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-sm"
          style={{ left: `${ratio * 100}%` }}
          aria-hidden
        />
      </div>
      <span className="min-w-[3rem] text-right text-sm tabular-nums text-muted-foreground">
        {value}
        {valueSuffix ?? ""}
      </span>
    </div>
  );
}
