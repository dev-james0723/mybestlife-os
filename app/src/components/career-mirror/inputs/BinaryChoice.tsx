"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type BinaryChoiceProps = {
  value: boolean | null;
  onChange: (b: boolean) => void;
  yesLabel: string;
  noLabel: string;
  className?: string;
};

/**
 * BinaryChoice — two large toggle cards (Yes / No).
 *
 * Rendered as a radiogroup so the pair is announced as a single choice; arrow
 * keys move focus between the two cards and Enter/Space selects. The chosen card
 * is highlighted with the accent color + a check badge.
 */
export function BinaryChoice({
  value,
  onChange,
  yesLabel,
  noLabel,
  className,
}: BinaryChoiceProps) {
  return (
    <div role="radiogroup" className={cn("grid grid-cols-2 gap-3", className)}>
      <ChoiceCard
        label={yesLabel}
        selected={value === true}
        onSelect={() => onChange(true)}
        onArrow={() => onChange(false)}
      />
      <ChoiceCard
        label={noLabel}
        selected={value === false}
        onSelect={() => onChange(false)}
        onArrow={() => onChange(true)}
      />
    </div>
  );
}

type ChoiceCardProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  /** Invoked on horizontal/vertical arrow to flip to the sibling. */
  onArrow: () => void;
};

function ChoiceCard({ label, selected, onSelect, onArrow }: ChoiceCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
          e.preventDefault();
          onArrow();
        }
      }}
      whileHover={prefersReduced ? undefined : { y: -1 }}
      whileTap={prefersReduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className={cn(
        "relative flex min-h-20 items-center justify-center gap-2 overflow-hidden rounded-xl border p-5 text-center",
        "transition-[background-color,border-color,box-shadow,transform] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        selected
          ? "border-[var(--accent-pink)]/70 bg-[var(--accent-pink)]/12 shadow-[0_12px_28px_-22px_var(--accent-pink)]"
          : "border-foreground/10 bg-foreground/[0.035] shadow-none hover:border-foreground/20 hover:bg-foreground/[0.055]",
      )}
    >
      {selected ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-4 left-0 w-0.5 rounded-r-full bg-[var(--accent-pink)]"
        />
      ) : null}
      {selected ? (
        <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)] text-[var(--accent-pink-foreground)]">
          <Check className="size-3.5" />
        </span>
      ) : null}
      <span className="text-base font-semibold text-foreground">{label}</span>
    </motion.button>
  );
}

export default BinaryChoice;
