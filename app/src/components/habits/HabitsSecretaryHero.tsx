"use client";

import { CalendarClock, Sparkles, Wand2 } from "lucide-react";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import type { Habit, RoutineWithSteps } from "@/lib/habits/types";
import type { SecretaryBriefResponse } from "@/lib/ai/schemas/habits/secretary";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface HabitsSecretaryHeroProps {
  copy: HabitsUiCopy;
  habits: readonly Habit[];
  routines: readonly RoutineWithSteps[];
  completedToday: number;
  totalToday: number;
  brief?: SecretaryBriefResponse | null;
  loading?: boolean;
  onPlan: () => void;
  onManual: () => void;
  onReview: () => void;
}

export function HabitsSecretaryHero({
  copy,
  habits,
  routines,
  completedToday,
  totalToday,
  brief,
  loading,
  onPlan,
  onManual,
  onReview,
}: HabitsSecretaryHeroProps) {
  const activeHabits = habits.filter((h) => h.is_active && !h.archived_at).length;
  const activeRoutines = routines.filter((r) => r.is_active && !r.archived_at).length;
  const progressLabel = copy.secretaryTodayProgress(completedToday, Math.max(totalToday, 0));
  const todaySummary =
    brief?.todaySummary ??
    `${progressLabel} ${copy.secretaryFallbackSummary}`;

  return (
    <GlassPanel
      className="relative overflow-hidden p-5 sm:p-6 lg:p-7"
      variant="strong"
      interactive
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/25" />
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-end">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-white/15 bg-white/[0.08] text-foreground" variant="outline">
              <Sparkles className="mr-1 size-3" />
              {brief?.greeting ?? copy.secretaryHeroTitle}
            </Badge>
            <Badge variant="secondary" className="bg-primary/15 text-primary">
              {completedToday}/{Math.max(totalToday, 0)}
            </Badge>
          </div>
          <div className="space-y-2">
            <h2 className="max-w-3xl text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {copy.secretaryHeroTitle}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {loading ? copy.insightLoading : todaySummary}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="h-9" onClick={onPlan}>
              <Wand2 className="size-4" />
              {copy.secretaryPrimaryCta}
            </Button>
            <Button type="button" variant="secondary" className="h-9" onClick={onManual}>
              {copy.secretaryManualCta}
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={onReview}>
              {copy.secretaryReviewCta}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <HeroStat label={copy.habitsSectionTitle} value={activeHabits} />
            <HeroStat label={copy.routinesSectionTitle} value={activeRoutines} />
            <HeroStat label={copy.todaySectionTitle} value={totalToday} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {copy.analyticsNarrativeTitle}
            </div>
            <ul className="space-y-2 text-sm text-foreground/90">
              {(brief?.suggestions ?? [])
                .slice(0, 3)
                .map((s) => (
                  <li key={s.title} className="leading-5">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-muted-foreground"> — {s.reason}</span>
                  </li>
                ))}
              {!brief?.suggestions?.length && (
                <li className="text-muted-foreground">{copy.secretaryHeroSubtitle}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
