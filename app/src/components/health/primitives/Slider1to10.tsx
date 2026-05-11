"use client";

import { useCallback, useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

interface Slider1to10Props {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
  ariaValueTextMap?: Partial<Record<number, string>>;
  colorClassName?: string;
  className?: string;
}

/**
 * 1–10 discrete slider using ARIA role="slider" so it is fully keyboard
 * accessible (Arrow keys, Home/End, PageUp/PageDown).
 *
 * Renders 10 segments as visual buttons but lets screen readers announce
 * a single slider control.
 */
export function Slider1to10({
  value,
  onChange,
  label,
  disabled,
  ariaValueTextMap,
  colorClassName = "bg-primary",
  className,
}: Slider1to10Props) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement | null>(null);

  const setFromClientX = useCallback(
    (clientX: number) => {
      if (disabled) return;
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const next = Math.max(1, Math.min(10, Math.round(ratio * 9 + 1)));
      onChange(next);
    },
    [disabled, onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    setFromClientX(e.clientX);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = value ?? 5;
    let next = current;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(1, current - 1);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(10, current + 1);
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 10;
        break;
      case "PageUp":
        next = Math.min(10, current + 3);
        break;
      case "PageDown":
        next = Math.max(1, current - 3);
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(next);
  };

  const fillPct = value ? ((value - 1) / 9) * 100 : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-2xl font-bold tabular-nums">{value ?? "—"}</span>
      </div>
      <div
        id={id}
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value ?? undefined}
        aria-valuetext={
          value && ariaValueTextMap?.[value] ? ariaValueTextMap[value] : value ? String(value) : undefined
        }
        aria-disabled={disabled || undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className={cn(
          "relative h-10 cursor-pointer select-none rounded-full bg-foreground/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all", colorClassName)}
          style={{ width: `${fillPct}%` }}
        />
        <div className="pointer-events-none absolute inset-x-3 inset-y-0 flex items-center justify-between text-[10px] font-medium text-foreground/60">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "z-10 h-4 w-4 text-center leading-4",
                value === i + 1 && "text-background font-bold",
              )}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
