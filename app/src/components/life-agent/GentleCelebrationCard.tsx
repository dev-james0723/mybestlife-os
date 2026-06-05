"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import { cn } from "@/lib/utils";

type GentleCelebrationCardProps = {
  ui: LifeAgentUiCopy;
  message: string;
  className?: string;
};

export function GentleCelebrationCard({ ui, message, className }: GentleCelebrationCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={REDUCED_MOTION_FADE}
      className={cn(
        "flex gap-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30",
        className,
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600/80 dark:text-emerald-400/80" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">{ui.celebrationTitle}</p>
        <p className="mt-0.5 text-sm text-foreground/90">{message}</p>
      </div>
    </motion.div>
  );
}
