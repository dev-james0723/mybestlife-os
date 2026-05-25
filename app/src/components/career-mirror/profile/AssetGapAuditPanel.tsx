"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, ClipboardCheck, Check, Plus, AlertCircle, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerProfile, PersonalBrandAssets } from "@/types/database";
import {
  useCareerMirrorAdvanced,
  type AssetAuditResultData,
} from "@/hooks/use-career-mirror-advanced";

export type AssetGapAuditPanelProps = {
  profile: CareerProfile | null;
  /** Optional stub CTA per missing asset (e.g. open a draft generator). */
  onGenerateAsset?: (assetType: string) => void;
  className?: string;
};

export function AssetGapAuditPanel({
  profile,
  onGenerateAsset,
  className,
}: AssetGapAuditPanelProps) {
  const prefersReduced = useReducedMotion();
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language);

  const { runAssetAudit } = useCareerMirrorAdvanced();

  const [running, setRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [audit, setAudit] = React.useState<AssetAuditResultData | null>(null);

  // Seed from any audit already saved on the profile, so the panel isn't empty
  // before the user runs a fresh one.
  const seeded = React.useMemo<AssetAuditResultData | null>(() => {
    const a = profile?.personal_brand_assets as PersonalBrandAssets | undefined;
    if (!a) return null;
    if (!a.has?.length && !a.missing?.length && !a.priorities?.length) return null;
    return { has: a.has ?? [], missing: a.missing ?? [], priorities: a.priorities ?? [] };
  }, [profile?.personal_brand_assets]);

  const view = audit ?? seeded;

  const onRun = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    const result = await runAssetAudit();
    if (result.ok) {
      setAudit((result.audit ?? {}) as AssetAuditResultData);
    } else {
      setError(copy.states.error);
    }
    setRunning(false);
  };

  const generateLabel = "Generate draft";

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-600 dark:text-violet-300"
        >
          <ClipboardCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold leading-tight">
            {copy.panels.assetGapAudit}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What you already have, what's missing, what to build first.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="gradient-pink" disabled={running} onClick={onRun}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
          {running ? copy.states.loading : "Run asset audit"}
        </Button>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {view ? (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReduced ? REDUCED_MOTION_FADE : { duration: 0.4, ease: EASE_OUT_EXPO }}
          className="mt-5 space-y-5"
        >
          {view.priorities && view.priorities.length > 0 ? (
            <div className="rounded-lg border border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/5 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--accent-pink)]">
                <Star className="size-3" /> Build these first
              </p>
              <ul className="mt-1.5 space-y-1">
                {view.priorities.map((p, i) => (
                  <li key={i} className="text-sm leading-snug">
                    {i + 1}. {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                <Check className="size-3" /> You already have
              </p>
              {view.has && view.has.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {view.has.map((item, i) => (
                    <li key={i} className="text-sm leading-snug text-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm italic text-muted-foreground">Nothing logged yet.</p>
              )}
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
                <AlertCircle className="size-3" /> Missing
              </p>
              {view.missing && view.missing.length > 0 ? (
                <ul className="mt-1.5 space-y-1.5">
                  {view.missing.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 text-sm leading-snug text-foreground"
                    >
                      <span className="min-w-0">{item}</span>
                      {onGenerateAsset ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="shrink-0 text-muted-foreground"
                          onClick={() => onGenerateAsset(item)}
                        >
                          <Plus className="size-3" />
                          {generateLabel}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-sm italic text-muted-foreground">
                  {copy.completion.missingEmpty}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <p className="mt-5 text-sm italic text-muted-foreground">
          {copy.states.emptyDescription}
        </p>
      )}
    </GlassPanel>
  );
}

export default AssetGapAuditPanel;
