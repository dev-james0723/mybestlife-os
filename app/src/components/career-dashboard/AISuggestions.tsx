"use client";

import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useSetInsightInteraction,
  useTodayInsights,
} from "@/hooks/use-daily-insights";
import { generateDailyInsights } from "@/lib/dashboard/daily-insights-client";
import { useQueryClient } from "@tanstack/react-query";
import type { DailyInsightSuggestion } from "@/types/database";

const PRIORITY_STYLES: Record<
  DailyInsightSuggestion["priority"],
  string
> = {
  high: "border-rose-400/50 bg-rose-50/40 dark:bg-rose-950/20",
  medium: "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20",
  low: "border-muted bg-background/60",
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AISuggestionsWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard.intelligence;

  const qc = useQueryClient();
  const insights = useTodayInsights();
  const setInteraction = useSetInsightInteraction();
  const [regenerating, setRegenerating] = useState(false);

  const row = insights.data ?? null;
  const suggestions = useMemo(() => row?.suggestions ?? [], [row]);
  const interactions = row?.interactions ?? {};

  const active = suggestions.filter(
    (s) => !interactions[s.id] || interactions[s.id].status === "done",
  );

  const handleGenerate = async () => {
    setRegenerating(true);
    try {
      const res = await generateDailyInsights({ force: !!row });
      if (res.ok) {
        qc.setQueryData(["daily-insights", todayIso()], res.data);
      }
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" aria-hidden />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.aiSuggestion}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={regenerating || insights.isLoading}
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
          />
          {copy.aiRegenerate}
        </Button>
      </div>

      {insights.isLoading || regenerating ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.aiLoading}</p>
      ) : active.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{copy.aiEmpty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {active.slice(0, 3).map((s) => {
            const done = interactions[s.id]?.status === "done";
            return (
              <li
                key={s.id}
                className={`rounded-xl border p-3 ${
                  PRIORITY_STYLES[s.priority] ?? PRIORITY_STYLES.low
                } ${done ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <span>
                        {copy.category[s.category] ?? s.category}
                      </span>
                      <span>·</span>
                      <span>{copy.priority[s.priority] ?? s.priority}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.rationale}
                    </p>
                    <p className="mt-1 text-xs">{s.action}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={copy.markDone}
                      title={copy.markDone}
                      onClick={() => {
                        if (!row) return;
                        setInteraction.mutate({
                          row,
                          suggestionId: s.id,
                          status: "done",
                        });
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={copy.dismiss}
                      title={copy.dismiss}
                      onClick={() => {
                        if (!row) return;
                        setInteraction.mutate({
                          row,
                          suggestionId: s.id,
                          status: "dismissed",
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
