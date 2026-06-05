"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { cn } from "@/lib/utils";

type LifeAgentWorkflowCardProps = {
  title: string;
  description: string;
  isActive?: boolean;
  isLoading?: boolean;
  index?: number;
  onClick: () => void;
  className?: string;
};

export function LifeAgentWorkflowCard({
  title,
  description,
  isActive = false,
  isLoading = false,
  index = 0,
  onClick,
  className,
}: LifeAgentWorkflowCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion
          ? REDUCED_MOTION_FADE
          : { delay: 0.04 + index * 0.03, duration: 0.28, ease: EASE_OUT_EXPO }
      }
      whileHover={reduceMotion ? undefined : { scale: 1.01 }}
      whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      onClick={onClick}
      disabled={isLoading}
      aria-pressed={isActive}
      className={cn(
        "flex w-full items-start gap-2 rounded-2xl border p-3 text-left transition-colors",
        isActive
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-background/50 hover:border-primary/30 hover:bg-primary/5",
        isLoading && "opacity-80",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {isLoading && (
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      )}
    </motion.button>
  );
}
