"use client";

import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DailySummary } from "@/lib/calendar/types";

type Props = {
  summary: DailySummary | null;
  isLoading: boolean;
  skeletonLabel: string;
  className?: string;
};

export function AISummaryCard({
  summary,
  isLoading,
  skeletonLabel,
  className,
}: Props) {
  const prefersReduced = useReducedMotion();
  if (isLoading || !summary) {
    return (
      <div
        className={cn(
          "rounded-xl border border-border/60 bg-card/60 p-4",
          className
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-[92%]" />
        <Skeleton className="mt-2 h-4 w-[76%]" />
        <p className="sr-only">{skeletonLabel}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-border/60 bg-card/70 p-4",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {summary.energy_label}
        </p>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{summary.text}</p>
      {summary.highlights.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {summary.highlights.map((h, i) => (
            <li
              key={i}
              className="rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {h}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
