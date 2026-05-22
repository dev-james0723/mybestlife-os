"use client";

import { useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  QUADRANTS,
  QUADRANT_META,
  type Quadrant,
} from "@/lib/journal/constants";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";

interface EmotionPickerProps {
  value: Quadrant | "";
  onChange: (next: Quadrant) => void;
  copy: JournalUiCopy;
  disabled?: boolean;
}

/**
 * 2×2 quadrant grid. Roving tabindex: only the selected quadrant (or the
 * first one if none selected) is in the tab order; Arrow keys move
 * between cards.
 */
export function EmotionPicker({
  value,
  onChange,
  copy,
  disabled,
}: EmotionPickerProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const reduceMotion = useReducedMotion();

  const focusIndex = (() => {
    if (value) {
      const idx = QUADRANTS.indexOf(value);
      if (idx >= 0) return idx;
    }
    return 0;
  })();

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    // Grid layout:
    //   0 (RED)    1 (YELLOW)
    //   2 (BLUE)   3 (GREEN)
    let next = idx;
    switch (e.key) {
      case "ArrowRight":
        next = idx % 2 === 0 ? idx + 1 : idx;
        break;
      case "ArrowLeft":
        next = idx % 2 === 1 ? idx - 1 : idx;
        break;
      case "ArrowDown":
        next = idx < 2 ? idx + 2 : idx;
        break;
      case "ArrowUp":
        next = idx >= 2 ? idx - 2 : idx;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next !== idx) {
      buttonsRef.current[next]?.focus();
    }
  };

  return (
    <div
      role="group"
      aria-label={copy.labelEmotionPicker}
      className="grid grid-cols-2 gap-3"
    >
      {QUADRANTS.map((q, idx) => {
        const meta = QUADRANT_META[q];
        const selected = value === q;
        const isInTabOrder = idx === focusIndex;
        return (
          <motion.button
            key={q}
            ref={(el) => {
              buttonsRef.current[idx] = el;
            }}
            type="button"
            aria-pressed={selected}
            aria-label={`${copy.quadrantName[q]} — ${copy.quadrantSubtitle[q]}`}
            tabIndex={isInTabOrder ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(q)}
            onKeyDown={(e) => onKey(e, idx)}
            initial={false}
            animate={
              reduceMotion
                ? undefined
                : { scale: selected ? 1.02 : 1 }
            }
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className={cn(
              "group relative flex flex-col items-start gap-1 rounded-lg border-2 p-4 text-left transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? cn(meta.bgSelectedClass, meta.borderClass)
                : cn(
                    meta.bgClass,
                    "border-transparent hover:border-border",
                  ),
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <span className={cn("text-base font-semibold", meta.textClass)}>
              {copy.quadrantName[q]}
            </span>
            <span className="text-xs text-muted-foreground">
              {copy.quadrantSubtitle[q]}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
