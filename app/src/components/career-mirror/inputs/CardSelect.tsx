"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type CardSelectOption = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

export type CardSelectProps = {
  options: CardSelectOption[];
  value: string | string[];
  onChange: (next: string | string[]) => void;
  /** When true, behaves as a multi-select (value is string[]). */
  multi?: boolean;
  className?: string;
};

/**
 * CardSelect — grid of selectable glass cards.
 *
 * Single-select renders as role="radiogroup"/"radio"; multi-select renders as
 * role="listbox"/"option" with aria-multiselectable. Roving focus + arrow keys
 * (incl. Home/End) move between cards; Enter/Space toggle the focused card. The
 * selected card gains an accent ring, a subtle scale, and a check badge.
 */
export function CardSelect({
  options,
  value,
  onChange,
  multi = false,
  className,
}: CardSelectProps) {
  const prefersReduced = useReducedMotion();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIds = React.useMemo<string[]>(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const isSelected = (id: string) => selectedIds.includes(id);

  const select = (id: string) => {
    if (multi) {
      const set = new Set(selectedIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      onChange([...set]);
    } else {
      onChange(id);
    }
  };

  const focusAt = (index: number) => {
    const len = options.length;
    if (len === 0) return;
    const wrapped = ((index % len) + len) % len;
    refs.current[wrapped]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(index - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(options.length - 1);
        break;
      // Enter/Space are handled natively by the <button>.
      default:
        break;
    }
  };

  // For single-select, the roving tabindex anchors on the selected (or first) card.
  const activeIndex = (() => {
    const i = options.findIndex((o) => isSelected(o.id));
    return i >= 0 ? i : 0;
  })();

  return (
    <div
      role={multi ? "listbox" : "radiogroup"}
      aria-multiselectable={multi ? true : undefined}
      className={cn(
        "grid grid-cols-1 gap-2 sm:grid-cols-2",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = isSelected(option.id);
        return (
          <motion.button
            key={option.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role={multi ? "option" : "radio"}
            aria-selected={multi ? selected : undefined}
            aria-checked={multi ? undefined : selected}
            tabIndex={multi ? 0 : index === activeIndex ? 0 : -1}
            onClick={() => select(option.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            whileHover={prefersReduced ? undefined : { y: -2 }}
            whileTap={prefersReduced ? undefined : { scale: 0.99 }}
            animate={
              prefersReduced ? undefined : { scale: selected ? 1.01 : 1 }
            }
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className={cn(
              "group/card relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left",
              "[background:var(--surface-glass)] [box-shadow:var(--shadow-glass)] [backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))]",
              "transition-[border-color,box-shadow] duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
              selected
                ? "border-[var(--accent-pink)]/60 ring-2 ring-[var(--accent-pink)]/40"
                : "[border-color:var(--border-glass)] hover:[border-color:var(--border-glass-strong)]",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100",
              )}
              style={{
                background:
                  "linear-gradient(135deg, transparent 40%, var(--accent-pink-from) 100%)",
                mixBlendMode: "soft-light",
              }}
            />

            {option.icon ? (
              <span className="relative mt-0.5 inline-flex size-5 shrink-0 items-center justify-center text-foreground [&_svg]:size-5">
                {option.icon}
              </span>
            ) : null}

            <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold leading-snug text-foreground">
                {option.label}
              </span>
              {option.description ? (
                <span className="text-xs leading-snug text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </span>

            {selected ? (
              <span className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)] text-[var(--accent-pink-foreground)]">
                <Check className="size-3.5" />
              </span>
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

export default CardSelect;
