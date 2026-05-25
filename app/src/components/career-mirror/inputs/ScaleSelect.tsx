"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type ScaleSelectProps = {
  min?: number;
  max?: number;
  value: number | null;
  onChange: (n: number) => void;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
};

/**
 * ScaleSelect — a Likert row of selectable segments (e.g. 1..5).
 *
 * Rendered as a radiogroup with roving tabindex; arrow keys move between
 * segments (and select), Home/End jump to the ends. Optional end captions sit
 * beneath the row. The selected segment fills with the accent gradient.
 */
export function ScaleSelect({
  min = 1,
  max = 5,
  value,
  onChange,
  minLabel,
  maxLabel,
  className,
}: ScaleSelectProps) {
  const prefersReduced = useReducedMotion();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const points = React.useMemo(() => {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const out: number[] = [];
    for (let n = lo; n <= hi; n += 1) out.push(n);
    return out;
  }, [min, max]);

  const selectedIndex = value == null ? -1 : points.indexOf(value);
  // Roving focus anchor: selected point, else the first.
  const anchorIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const focusAndSelect = (index: number) => {
    if (index < 0 || index >= points.length) return;
    refs.current[index]?.focus();
    onChange(points[index]);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        e.preventDefault();
        focusAndSelect(points.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div role="radiogroup" className="flex items-center gap-1.5">
        {points.map((point, index) => {
          const selected = value === point;
          return (
            <motion.button
              key={point}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={String(point)}
              tabIndex={index === anchorIndex ? 0 : -1}
              onClick={() => onChange(point)}
              onKeyDown={(e) => onKeyDown(e, index)}
              whileTap={prefersReduced ? undefined : { scale: 0.94 }}
              transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums",
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
                selected
                  ? "border-transparent bg-[linear-gradient(135deg,var(--accent-pink-from),var(--accent-pink-to))] text-[var(--accent-pink-foreground)]"
                  : "[background:var(--surface-glass)] [border-color:var(--border-glass)] text-foreground hover:[border-color:var(--border-glass-strong)] [backdrop-filter:blur(var(--glass-blur,20px))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))]",
              )}
            >
              {point}
            </motion.button>
          );
        })}
      </div>

      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{minLabel ?? ""}</span>
          <span>{maxLabel ?? ""}</span>
        </div>
      )}
    </div>
  );
}

export default ScaleSelect;
