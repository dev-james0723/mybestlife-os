"use client";

import { useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, Loader2, Play, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptRun,
  type PromptRunStatus,
} from "@/types/prompt";
import type { OpenRunOptions } from "@/components/ai-knowledge/ai-knowledge-run-context";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface RunActivityPanelProps {
  library: LibraryPrompt[];
  userPrompts: CustomPrompt[];
  recentRuns: PromptRun[];
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenRun: (prompt: AnyPrompt, options?: OpenRunOptions) => void;
  onOpenPrompt: (id: string) => void;
}

function resolvePrompt(
  run: PromptRun,
  library: LibraryPrompt[],
  userPrompts: CustomPrompt[],
): AnyPrompt | null {
  if (run.library_prompt_id) {
    return library.find((p) => p.id === run.library_prompt_id) ?? null;
  }
  if (run.custom_prompt_id) {
    return userPrompts.find((p) => p.id === run.custom_prompt_id) ?? null;
  }
  return null;
}

function statusLabel(
  status: PromptRunStatus,
  ui: ReturnType<typeof getAiKnowledgeUiCopy>,
): string {
  switch (status) {
    case "succeeded":
      return ui.activity.statusSucceeded;
    case "failed":
      return ui.activity.statusFailed;
    case "pending":
      return ui.activity.statusPending;
    case "running":
      return ui.activity.statusRunning;
    case "canceled":
      return ui.activity.statusCanceled;
    default:
      return status;
  }
}

function statusVariant(
  status: PromptRunStatus,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "default";
  if (status === "failed") return "destructive";
  return "secondary";
}

/**
 * Phase 5 — chronological run log with re-run (variables prefilled) and open prompt.
 */
export function RunActivityPanel({
  library,
  userPrompts,
  recentRuns,
  isRefreshing,
  onRefresh,
  onOpenRun,
  onOpenPrompt,
}: RunActivityPanelProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const rows = useMemo(
    () =>
      recentRuns.map((run) => ({
        run,
        prompt: resolvePrompt(run, library, userPrompts),
      })),
    [recentRuns, library, userPrompts],
  );

  const handleRerun = useCallback(
    (run: PromptRun, prompt: AnyPrompt | null) => {
      if (!prompt) return;
      onOpenRun(prompt, { initialVariables: run.variables });
    },
    [onOpenRun],
  );

  if (recentRuns.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={ui.activity.emptyTitle}
        description={ui.activity.emptyDescription}
        action={{
          label: ui.activity.refresh,
          onClick: onRefresh,
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {ui.activity.refresh}
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map(({ run, prompt }) => {
          const title = prompt
            ? pickLocalizedText(prompt.title_i18n, language)
            : ui.activity.unknownPrompt;
          const snippet =
            run.status === "failed" && run.error_message
              ? run.error_message
              : run.result_snippet;
          const varEntries = Object.entries(run.variables ?? {}).filter(
            ([, v]) => v && String(v).trim() !== "",
          );

          return (
            <li
              key={run.id}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-sm truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(run.started_at), {
                      addSuffix: true,
                    })}
                    {run.provider ? ` · ${run.provider}` : null}
                  </p>
                </div>
                <Badge variant={statusVariant(run.status)} className="shrink-0">
                  {statusLabel(run.status, ui)}
                </Badge>
              </div>

              {varEntries.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {ui.activity.variablesUsed}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {varEntries.slice(0, 8).map(([k, v]) => (
                      <Badge key={k} variant="outline" className="text-[10px] font-normal">
                        {`{${k}}`}: {String(v).slice(0, 40)}
                        {String(v).length > 40 ? "…" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {snippet && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {run.status === "failed" ? ui.activity.error : ui.activity.snippet}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {snippet}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {prompt && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      onClick={() => handleRerun(run, prompt)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {ui.activity.rerun}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPrompt(prompt.id)}
                    >
                      {ui.activity.openPrompt}
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ActivityStatsStripProps {
  runCount: number;
  myPromptsCount: number;
  favoritesCount: number;
}

export function ActivityStatsStrip({
  runCount,
  myPromptsCount,
  favoritesCount,
}: ActivityStatsStripProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const items = [
    { label: ui.activity.statsRuns, value: runCount },
    { label: ui.activity.statsMyPrompts, value: myPromptsCount },
    { label: ui.activity.statsFavorites, value: favoritesCount },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-3"
        >
          <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-2xl font-semibold tabular-nums leading-none">
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
