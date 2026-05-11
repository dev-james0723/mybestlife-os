"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wind, Anchor, Eye, SkipForward } from "lucide-react";
import type { PreTaskRitualUiCopy } from "@/lib/i18n/pre-task-ritual-ui";

type RitualPhase = "breathing" | "anchor" | "visualization";

const BREATH_CYCLE_MS = 12000;
const INHALE_MS = 4000;
const HOLD_MS = 4000;
const TARGET_CYCLES = 3;

interface PreTaskRitualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  copy: PreTaskRitualUiCopy;
  onBeginTask: () => void;
}

export function PreTaskRitualModal({
  open,
  onOpenChange,
  taskTitle,
  copy,
  onBeginTask,
}: PreTaskRitualModalProps) {
  const [phase, setPhase] = useState<RitualPhase>("breathing");
  const [cycleCount, setCycleCount] = useState(0);
  const [breathLabel, setBreathLabel] = useState(copy.breathInhale);
  const [breathScale, setBreathScale] = useState(false);

  useEffect(() => {
    if (!open) {
      setPhase("breathing");
      setCycleCount(0);
      setBreathLabel(copy.breathInhale);
      setBreathScale(false);
    }
  }, [open, copy.breathInhale]);

  useEffect(() => {
    if (phase !== "breathing" || !open) return;

    let cancelled = false;

    const runCycle = (cycle: number) => {
      if (cancelled || cycle >= TARGET_CYCLES) {
        if (!cancelled) setPhase("anchor");
        return;
      }

      setBreathLabel(copy.breathInhale);
      setBreathScale(true);

      const holdTimer = setTimeout(() => {
        if (cancelled) return;
        setBreathLabel(copy.breathHold);
      }, INHALE_MS);

      const exhaleTimer = setTimeout(() => {
        if (cancelled) return;
        setBreathLabel(copy.breathExhale);
        setBreathScale(false);
      }, INHALE_MS + HOLD_MS);

      const nextTimer = setTimeout(() => {
        if (cancelled) return;
        setCycleCount(cycle + 1);
        runCycle(cycle + 1);
      }, BREATH_CYCLE_MS);

      return () => {
        clearTimeout(holdTimer);
        clearTimeout(exhaleTimer);
        clearTimeout(nextTimer);
      };
    };

    const cleanup = runCycle(cycleCount);
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    phase,
    open,
    cycleCount,
    copy.breathExhale,
    copy.breathHold,
    copy.breathInhale,
  ]);

  const handleSkipBreathing = useCallback(() => setPhase("anchor"), []);
  const handleContinueToViz = useCallback(
    () => setPhase("visualization"),
    [],
  );
  const handleBegin = useCallback(() => {
    onBeginTask();
    onOpenChange(false);
  }, [onBeginTask, onOpenChange]);

  const phaseIndicator = (
    <div className="flex items-center justify-center gap-2 mb-2">
      {(["breathing", "anchor", "visualization"] as RitualPhase[]).map(
        (p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                phase === p
                  ? "bg-primary"
                  : (["breathing", "anchor", "visualization"].indexOf(phase) >
                        i
                      ? "bg-primary/40"
                      : "bg-muted-foreground/20"),
              )}
            />
            {i < 2 && (
              <div className="h-px w-6 bg-muted-foreground/20" />
            )}
          </div>
        ),
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          {phaseIndicator}
          <DialogTitle>
            {phase === "breathing" && copy.phaseBreathingTitle}
            {phase === "anchor" && copy.phaseAnchorTitle}
            {phase === "visualization" && copy.phaseVisualizationTitle}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {copy.focusRitualFor}{" "}
            <span className="font-medium text-foreground">{taskTitle}</span>
          </p>
        </DialogHeader>

        <div className="py-4">
          {phase === "breathing" && (
            <div className="flex flex-col items-center gap-6">
              <div className="relative flex items-center justify-center h-48 w-48">
                <div
                  className={cn(
                    "absolute inset-0 rounded-full bg-primary/10 transition-transform",
                    breathScale
                      ? "scale-100 duration-[4000ms] ease-in-out"
                      : "scale-[0.55] duration-[4000ms] ease-in-out",
                  )}
                />
                <div
                  className={cn(
                    "absolute rounded-full bg-primary/20 transition-transform",
                    breathScale
                      ? "h-28 w-28 duration-[4000ms] ease-in-out"
                      : "h-16 w-16 duration-[4000ms] ease-in-out",
                  )}
                />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Wind className="h-6 w-6 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {breathLabel}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {copy.cycleLabel(
                  Math.min(cycleCount + 1, TARGET_CYCLES),
                  TARGET_CYCLES,
                )}
              </p>
              <Button variant="ghost" size="sm" onClick={handleSkipBreathing}>
                <SkipForward className="h-4 w-4 mr-1" />
                {copy.skip}
              </Button>
            </div>
          )}

          {phase === "anchor" && (
            <div className="flex flex-col items-center gap-6 text-center px-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Anchor className="h-7 w-7 text-primary" />
              </div>
              <p className="text-base leading-relaxed italic text-foreground/90 max-w-sm">
                &ldquo;{copy.anchorQuote}&rdquo;
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleContinueToViz}
                >
                  <SkipForward className="h-4 w-4 mr-1" />
                  {copy.skip}
                </Button>
                <Button onClick={handleContinueToViz}>{copy.continue}</Button>
              </div>
            </div>
          )}

          {phase === "visualization" && (
            <div className="flex flex-col items-center gap-6 text-center px-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-7 w-7 text-primary" />
              </div>
              <p className="text-base leading-relaxed italic text-foreground/90 max-w-sm">
                &ldquo;{copy.visualizationQuote}&rdquo;
              </p>
              <Button onClick={handleBegin} size="lg">
                {copy.beginTask}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
