"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import { cn } from "@/lib/utils";

type MotivationCardCopy = {
  generating: string;
};

type MotivationCardProps = {
  summaryText: string;
  onRefresh: () => void;
  refreshSpin: boolean;
  copy: MotivationCardCopy;
  /** Accessible label for the refresh control (matches UI language). */
  refreshAriaLabel?: string;
};

export function MotivationCard({
  summaryText,
  onRefresh,
  refreshSpin,
  copy,
  refreshAriaLabel = "Refresh motivation",
}: MotivationCardProps) {
  const [phase, setPhase] = useState<"generating" | "ready">("generating");

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("ready"), 1800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <GlassTintPanel
      tint="teal"
      className="p-5 md:max-xl:p-6 xl:p-5"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-700 dark:bg-teal-400/20 dark:text-teal-200">
          <Sunrise className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 min-h-11 w-11 shrink-0 rounded-xl text-teal-700 hover:bg-teal-500/15 dark:text-teal-200 dark:hover:bg-teal-400/15"
          aria-label={refreshAriaLabel}
          onClick={() => {
            setPhase("generating");
            onRefresh();
            window.setTimeout(() => setPhase("ready"), 1600);
          }}
        >
          <RefreshCw className={cn("h-5 w-5", refreshSpin && "animate-spin")} />
        </Button>
      </div>

      {phase === "generating" ? (
        <div className="space-y-3">
          <div className="space-y-2.5">
            <div className="h-2.5 w-full max-w-[92%] animate-pulse rounded-full bg-foreground/10" />
            <div className="h-2.5 w-full max-w-[78%] animate-pulse rounded-full bg-foreground/10" />
            <div className="h-2.5 w-full max-w-[64%] animate-pulse rounded-full bg-foreground/10" />
          </div>
          <p className="text-sm font-medium text-foreground/80">{copy.generating}</p>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-foreground/90">{summaryText}</p>
      )}
    </GlassTintPanel>
  );
}
