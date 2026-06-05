"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { ContinuityCardData } from "@/lib/life-agent/companion-presence-types";
import { cn } from "@/lib/utils";

type WarmContinuityCardProps = {
  ui: LifeAgentUiCopy;
  data: ContinuityCardData;
  onContinue: (suggestedPrompt?: string) => void;
  onDismiss: () => void;
  className?: string;
};

export function WarmContinuityCard({
  ui,
  data,
  onContinue,
  onDismiss,
  className,
}: WarmContinuityCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={REDUCED_MOTION_FADE}
      className={cn(
        "rounded-2xl border border-amber-200/50 bg-gradient-to-r from-amber-50/70 to-card/90 p-4 dark:border-amber-900/40 dark:from-amber-950/25",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
        {ui.continuityTitle}
      </p>
      <p className="mt-2 text-sm text-foreground/90">{data.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          onClick={() => onContinue(data.suggestedPrompt)}
        >
          {ui.continuityContinue}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-full"
          onClick={onDismiss}
        >
          {ui.continuityDismiss}
        </Button>
      </div>
    </motion.aside>
  );
}
