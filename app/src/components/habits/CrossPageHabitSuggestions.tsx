"use client";

import { Lightbulb, Link2, RefreshCw } from "lucide-react";
import type { CrossPageSuggestionsResponse, CrossPageHabitSuggestion } from "@/lib/ai/schemas/habits/secretary";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { OSIconControl, OSPrimaryAction } from "@/components/ui/os-primitives";

export interface CrossPageHabitSuggestionsProps {
  copy: HabitsUiCopy;
  data?: CrossPageSuggestionsResponse | null;
  loading?: boolean;
  error?: boolean;
  refreshing?: boolean;
  onRefresh: () => void;
  onCreate: (suggestion: CrossPageHabitSuggestion) => void;
  creating?: boolean;
}

export function CrossPageHabitSuggestions({
  copy,
  data,
  loading,
  error,
  refreshing,
  onRefresh,
  onCreate,
  creating,
}: CrossPageHabitSuggestionsProps) {
  const suggestions = data?.suggestions ?? [];
  const difficultyLabel = (difficulty: CrossPageHabitSuggestion["difficulty"]) => {
    if (difficulty === "easy") return copy.aiDifficultyEasy;
    if (difficulty === "medium") return copy.aiDifficultyMedium;
    return copy.aiDifficultyHard;
  };

  return (
    <GlassPanel className="space-y-4 p-4 sm:p-5" variant="strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <h2 className="text-lg font-semibold">{copy.aiArchitectTitle}</h2>
          </div>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {copy.aiArchitectDescription}
          </p>
        </div>
        <OSIconControl
          type="button"
          osSize="compact"
          size="icon-sm"
          aria-label={copy.insightRefresh}
          disabled={refreshing}
          onClick={onRefresh}
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </OSIconControl>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {copy.insightFailed}
        </p>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
          {copy.aiArchitectEmpty}
        </p>
      )}

      <div className="space-y-3">
        {suggestions.slice(0, 4).map((suggestion) => (
          <article
            key={`${suggestion.sourceKind}-${suggestion.name}`}
            className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-sm font-semibold">{suggestion.name}</h3>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {suggestion.reason}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 border-white/15 bg-black/20">
                {difficultyLabel(suggestion.difficulty)}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                {suggestion.timeOfDay}
              </Badge>
              <Badge variant="outline" className="border-white/10 bg-white/[0.04]">
                <Link2 className="mr-1 size-3" />
                {suggestion.sourceTitle}
              </Badge>
            </div>
            <OSPrimaryAction
              type="button"
              size="sm"
              osSize="compact"
              className="mt-3 w-full"
              disabled={creating}
              onClick={() => onCreate(suggestion)}
            >
              {copy.aiCreateSuggestion}
            </OSPrimaryAction>
          </article>
        ))}
      </div>

      {data?.secretaryNote && (
        <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">
          {data.secretaryNote}
        </p>
      )}
    </GlassPanel>
  );
}
