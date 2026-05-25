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
 * BinaryChoice — two large glass toggle cards (Yes / No).
 *
 * Rendered as a radiogroup so the pair is announced as a single choice; arrow
 * keys move focus between the two cards and Enter/Space selects. The chosen card
 * is highlighted with the accent ring + a check badge.
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
      whileHover={prefersReduced ? undefined : { y: -2 }}
      whileTap={prefersReduced ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
      className={cn(
        "relative flex min-h-20 items-center justify-center gap-2 overflow-hidden rounded-2xl border p-5 text-center",
        "[background:var(--surface-glass)] [box-shadow:var(--shadow-glass)] [backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))] [-webkit-backdrop-filter:blur(var(--glass-blur,20px))_saturate(var(--glass-saturation,135%))]",
        "transition-[border-color,box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        selected
          ? "border-[var(--accent-pink)]/60 ring-2 ring-[var(--accent-pink)]/40"
          : "[border-color:var(--border-glass)] hover:[border-color:var(--border-glass-strong)]",
      )}
    >
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
