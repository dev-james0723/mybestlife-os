"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import {
  COMPANION_ARRIVAL_STATES,
  type CompanionArrivalState,
} from "@/lib/life-agent/companion-presence-types";
import { cn } from "@/lib/utils";

type CompanionCheckInProps = {
  ui: LifeAgentUiCopy;
  onSelect: (arrival: CompanionArrivalState) => void;
  className?: string;
};

export function CompanionCheckIn({ ui, onSelect, className }: CompanionCheckInProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? REDUCED_MOTION_FADE : { duration: 0.45, ease: EASE_OUT_EXPO }}
      className={cn(
        "rounded-3xl border border-rose-200/40 bg-gradient-to-br from-rose-50/80 via-card/95 to-amber-50/50 p-5 shadow-sm dark:border-rose-900/30 dark:from-rose-950/30 dark:via-card/90 dark:to-amber-950/20 sm:p-6",
        className,
      )}
      aria-labelledby="companion-check-in-heading"
    >
      <div className="space-y-1">
        <h2 id="companion-check-in-heading" className="text-lg font-semibold tracking-tight">
          {ui.checkInTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{ui.checkInSubtitle}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {COMPANION_ARRIVAL_STATES.map((state) => (
          <Button
            key={state}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-border/70 bg-background/60 hover:bg-background"
            onClick={() => onSelect(state)}
          >
            {ui.arrivalLabels[state]}
          </Button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{ui.checkInSafetyNote}</p>
    </motion.section>
  );
}
