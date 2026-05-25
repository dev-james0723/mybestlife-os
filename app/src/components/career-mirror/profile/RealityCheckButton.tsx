"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, ScanEye, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile } from "@/types/database";
import {
  useCareerMirrorAdvanced,
  type RealityCheckResultData,
} from "@/hooks/use-career-mirror-advanced";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-400/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-400/15 text-amber-700 dark:text-amber-300",
  low: "bg-rose-400/15 text-rose-700 dark:text-rose-300",
};

function ResultBody({ result }: { result: RealityCheckResultData }) {
  const confidence = result.confidence;
  return (
    <div className="space-y-4">
      {result.verdict ? (
        <div className="flex items-start gap-2">
          <p className="text-sm font-medium leading-snug text-foreground">{result.verdict}</p>
          {confidence ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                CONFIDENCE_STYLES[confidence] ?? "bg-muted text-muted-foreground",
              )}
            >
              {confidence}
            </span>
          ) : null}
        </div>
      ) : null}

      {result.gap_summary ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{result.gap_summary}</p>
      ) : null}

      {result.evidence && result.evidence.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            What this is based on
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {result.evidence.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug">
                <span
                  aria-hidden
                  className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[var(--accent-pink)]"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export type RealityCheckButtonProps = {
  profile: CareerProfile | null;
  defaultTarget?: string;
  className?: string;
};

export function RealityCheckButton({
  profile,
  defaultTarget,
  className,
}: RealityCheckButtonProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const { realityCheck } = useCareerMirrorAdvanced();

  const fallbackTarget =
    defaultTarget ?? profile?.transition_goal ?? profile?.career_goals ?? "";

  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState(fallbackTarget);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RealityCheckResultData | null>(null);

  React.useEffect(() => {
    if (open) setTarget((prev) => prev || fallbackTarget);
  }, [open, fallbackTarget]);

  const onCheck = async () => {
    const t = target.trim();
    if (!t || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await realityCheck(t);
    if (res.ok) {
      setResult((res.result ?? {}) as RealityCheckResultData);
    } else {
      setError(copy.states.error);
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        <ScanEye className="size-4" />
        {copy.panels.realityCheck}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[var(--accent-pink)]" />
              {copy.panels.realityCheck}
            </DialogTitle>
            <DialogDescription>
              Name a target. You'll get a direct, evidence-based read on where you
              actually stand — no sugar-coating, no piling on.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="e.g. Become a staff engineer within a year"
              aria-label="Target to reality-check"
              onKeyDown={(e) => {
                if (e.key === "Enter") onCheck();
              }}
            />
            <Button
              variant="gradient-pink"
              className="shrink-0"
              disabled={!target.trim() || loading}
              onClick={onCheck}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanEye className="size-4" />}
              {loading ? copy.states.loading : "Check it"}
            </Button>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          {result ? (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? REDUCED_MOTION_FADE : { duration: 0.35, ease: EASE_OUT_EXPO }}
              className="rounded-xl border border-[var(--border-glass)] bg-black/[0.02] p-4 dark:bg-white/[0.03]"
            >
              <ResultBody result={result} />
            </motion.div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RealityCheckButton;
