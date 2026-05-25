"use client";

import * as React from "react";
import { ArrowRight, Sparkles, Target } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { useAppStore } from "@/stores/app-store";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import {
  computeMissingFields,
  computeSetupCompletionScore,
} from "@/lib/career-mirror/careerSetupMapping";
import type { SetupAnswers } from "@/lib/career-mirror/careerSetupTypes";
import { cn } from "@/lib/utils";
import type { CareerProfile } from "@/types/database";

export type CompletionWidgetProps = {
  profile: CareerProfile | null;
  onContinueSetup: () => void;
  onGenerateWithAi?: () => void;
  className?: string;
};

/** Humanize a technical column key into a readable label fallback. */
function humanizeField(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * CompletionWidget — profile strength at a glance: a percentage, the top
 * still-missing critical fields, the AI-suggested next step, and CTAs to either
 * continue the wizard or ask AI to draft missing fields.
 */
export function CompletionWidget({
  profile,
  onContinueSetup,
  onGenerateWithAi,
  className,
}: CompletionWidgetProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerMirrorUiCopy(language).completion;

  const answers = (profile?.setup_answers ?? {}) as SetupAnswers;
  const score = computeSetupCompletionScore(answers);
  const missing = computeMissingFields(
    (profile as Record<string, unknown> | null) ?? null,
  ).slice(0, 4);

  const nextStep =
    profile?.ai_next_actions?.[0]?.title ??
    profile?.ai_diagnosis?.main_tension ??
    null;

  return (
    <GlassPanel className={cn("p-5", className)}>
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <Target className="size-5" />
        </span>
        <h2 className="font-heading text-base font-semibold">
          {copy.widgetTitle}
        </h2>
      </header>

      <div className="mt-4">
        <Progress value={score} className="gap-1.5">
          <ProgressLabel>{copy.scoreLabel(score)}</ProgressLabel>
          <ProgressValue />
        </Progress>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {copy.missingTitle}
        </p>
        {missing.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((field) => (
              <li
                key={field}
                className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground"
              >
                {humanizeField(field)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {copy.missingEmpty}
          </p>
        )}
      </div>

      {nextStep ? (
        <div className="mt-4 rounded-xl border border-[var(--accent-pink)]/25 bg-[var(--accent-pink)]/5 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--accent-pink)]">
            <Sparkles className="size-3" /> {getCareerMirrorUiCopy(language).aiSuggestion.badge}
          </p>
          <p className="mt-1 text-sm leading-snug text-foreground">{nextStep}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onContinueSetup}>
          {copy.keepGoing}
          <ArrowRight className="size-3.5" />
        </Button>
        {onGenerateWithAi ? (
          <Button size="sm" variant="outline" onClick={onGenerateWithAi}>
            <Sparkles className="size-3.5" />
            {getCareerMirrorUiCopy(language).profileSections.generateMissingWithAi}
          </Button>
        ) : null}
      </div>
    </GlassPanel>
  );
}
