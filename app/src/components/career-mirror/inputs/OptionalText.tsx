"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";

export type OptionalTextStatus = "answered" | "skipped" | "not_sure";

export type OptionalTextControls = {
  other: boolean;
  notSure: boolean;
  skip: boolean;
  typeOwn: boolean;
};

export type OptionalTextLabels = {
  other: string;
  notSure: string;
  skipForNow: string;
  typeMyOwn: string;
};

export type OptionalTextProps = {
  /** The actual input control for this question. */
  children: React.ReactNode;
  /** Which auxiliary controls are enabled for this question. */
  controls: OptionalTextControls;
  labels: OptionalTextLabels;
  status: OptionalTextStatus;
  onStatusChange: (status: OptionalTextStatus) => void;
  /** Free-text value used by "Type my own" / "Other". */
  freeText?: string;
  onFreeTextChange?: (text: string) => void;
  className?: string;
};

/**
 * OptionalText — universal question wrapper.
 *
 * Wraps an input and exposes a row of small ghost buttons for the enabled
 * controls. "Type my own" / "Other" reveal a Textarea bound to `freeText`;
 * "Skip for now" sets status 'skipped' (and de-emphasizes the input);
 * "Not sure" sets status 'not_sure'. The parent owns the real answer value —
 * this component only manages status, freeText, and which control is active.
 *
 * Note: when the parent records an actual answer it should set status back to
 * 'answered'; doing so here clears any active free-text control automatically.
 */
export function OptionalText({
  children,
  controls,
  labels,
  status,
  onStatusChange,
  freeText = "",
  onFreeTextChange,
  className,
}: OptionalTextProps) {
  const prefersReduced = useReducedMotion();
  // Which free-text control (if any) revealed the textarea: "typeOwn" | "other".
  const [activeControl, setActiveControl] = React.useState<
    "typeOwn" | "other" | null
  >(null);

  // If the parent resets to an actual answer, collapse the free-text affordance.
  React.useEffect(() => {
    if (status === "answered") setActiveControl(null);
  }, [status]);

  const skipped = status === "skipped";
  const notSure = status === "not_sure";

  const toggleFreeText = (control: "typeOwn" | "other") => {
    if (activeControl === control) {
      // Collapsing the active free-text control returns to a plain answered state.
      setActiveControl(null);
      onStatusChange("answered");
    } else {
      setActiveControl(control);
      onStatusChange("answered");
    }
  };

  const handleSkip = () => {
    setActiveControl(null);
    onStatusChange(skipped ? "answered" : "skipped");
  };

  const handleNotSure = () => {
    setActiveControl(null);
    onStatusChange(notSure ? "answered" : "not_sure");
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* The actual input, de-emphasized when skipped/not-sure. */}
      <div
        className={cn(
          "transition-opacity",
          (skipped || notSure) && "pointer-events-none opacity-40",
        )}
        aria-disabled={skipped || notSure ? true : undefined}
      >
        {children}
      </div>

      {/* Free-text affordance for "Type my own" / "Other". */}
      <AnimatePresence initial={false}>
        {activeControl ? (
          <motion.div
            key="free-text"
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={
              prefersReduced ? { opacity: 1 } : { opacity: 1, height: "auto" }
            }
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="overflow-hidden"
          >
            <Textarea
              value={freeText}
              onChange={(e) => onFreeTextChange?.(e.target.value)}
              aria-label={
                activeControl === "other" ? labels.other : labels.typeMyOwn
              }
              autoFocus
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Control row. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {controls.typeOwn ? (
          <GhostControl
            label={labels.typeMyOwn}
            active={activeControl === "typeOwn"}
            onClick={() => toggleFreeText("typeOwn")}
          />
        ) : null}
        {controls.other ? (
          <GhostControl
            label={labels.other}
            active={activeControl === "other"}
            onClick={() => toggleFreeText("other")}
          />
        ) : null}
        {controls.notSure ? (
          <GhostControl
            label={labels.notSure}
            active={notSure}
            onClick={handleNotSure}
          />
        ) : null}
        {controls.skip ? (
          <GhostControl
            label={labels.skipForNow}
            active={skipped}
            onClick={handleSkip}
          />
        ) : null}
      </div>
    </div>
  );
}

type GhostControlProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function GhostControl({ label, active, onClick }: GhostControlProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={prefersReduced ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.15, ease: EASE_OUT_EXPO }}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-tight",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
        active
          ? "bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </motion.button>
  );
}

export default OptionalText;
