"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type ChipMultiSelectOption = {
  id: string;
  label: string;
};

export type ChipMultiSelectProps = {
  options: ChipMultiSelectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** When set, unselected chips are disabled once `value.length >= max`. */
  max?: number;
  className?: string;
};

/**
 * ChipMultiSelect — toggleable row of glass chips.
 *
 * Mirrors the visual language of resources/CategoryFilterChips: inactive chips
 * read as a muted outline; active chips fill with the accent-pink family. When a
 * `max` is supplied, unselected chips become disabled (not hidden) once the cap
 * is hit so the user understands they're at the limit rather than missing options.
 */
export function ChipMultiSelect({
  options,
  value,
  onChange,
  max,
  className,
}: ChipMultiSelectProps) {
  const atMax = typeof max === "number" && value.length >= max;

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      if (atMax) return;
      onChange([...value, id]);
    }
  };

  return (
    <div
      role="group"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {options.map((option) => {
        const active = value.includes(option.id);
        const disabled = !active && atMax;
        return (
          <Chip
            key={option.id}
            active={active}
            disabled={disabled}
            label={option.label}
            onClick={() => toggle(option.id)}
          />
        );
      })}
    </div>
  );
}

type ChipProps = {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
};

function Chip({ active, disabled, label, onClick }: ChipProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      whileTap={prefersReduced || disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium leading-tight",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        active
          ? "border-[var(--accent-pink)]/50 bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]"
          : "border-border/70 bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {label}
    </motion.button>
  );
}

export default ChipMultiSelect;
