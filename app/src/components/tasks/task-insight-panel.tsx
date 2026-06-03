"use client";

import { useMemo, useState } from "react";
import { BarChart3, ListChecks, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  OSBottomSheet,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import type { Task } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { TasksUiCopy } from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import { computeTaskAnalytics } from "@/lib/tasks/task-analytics";
import { buildLocalTaskInsight } from "@/lib/tasks/task-ai-summary";
import { postTaskAi, type TaskAiSource } from "@/lib/ai/task-ai";
import type { TaskReviewAiResult } from "@/lib/ai/schemas/tasks";
import { TaskAiReviewCard } from "./task-ai-review-card";
import { TaskAnalyticsPanel } from "./task-analytics-panel";

interface TaskInsightPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  locale: AppLocale;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
}

type InsightMode = "rule" | "summary" | "weekly-review";

export function TaskInsightPanel({
  open,
  onOpenChange,
  tasks,
  locale,
  copy,
  centerCopy,
}: TaskInsightPanelProps) {
  const [mode, setMode] = useState<InsightMode>("rule");
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState<
    Record<"summary" | "weekly-review", { result: TaskReviewAiResult; source: TaskAiSource } | null>
  >({ summary: null, "weekly-review": null });

  const analytics = useMemo(() => computeTaskAnalytics(tasks), [tasks]);
  const insightTabs = useMemo(
    () => [
      {
        id: "rule" as const,
        label: centerCopy.insightRuleBased,
        icon: ListChecks,
      },
      {
        id: "summary" as const,
        label: centerCopy.insightAiSummary,
        icon: Sparkles,
      },
      {
        id: "weekly-review" as const,
        label: centerCopy.insightWeeklyReview,
        icon: Sparkles,
      },
    ],
    [centerCopy],
  );

  const ruleInsight = useMemo<TaskReviewAiResult>(
    () => buildLocalTaskInsight(analytics, locale, centerCopy),
    [analytics, locale, centerCopy],
  );

  const runAi = async (target: "summary" | "weekly-review") => {
    setMode(target);
    if (ai[target]) return; // cached
    setLoading(true);
    try {
      const result = await postTaskAi(target, { locale });
      const { source, ...rest } = result;
      setAi((prev) => ({ ...prev, [target]: { result: rest, source } }));
    } catch {
      // Fall back to the rule-based insight on any failure.
      setAi((prev) => ({
        ...prev,
        [target]: { result: ruleInsight, source: "fallback" },
      }));
    } finally {
      setLoading(false);
    }
  };

  const current =
    mode === "rule"
      ? { title: centerCopy.insightRuleBased, result: ruleInsight, source: "fallback" as TaskAiSource }
      : {
          title:
            mode === "summary"
              ? centerCopy.insightAiSummary
              : centerCopy.insightWeeklyReview,
          result: ai[mode]?.result ?? null,
          source: ai[mode]?.source,
        };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <OSBottomSheet side="right" className="w-full sm:max-w-md">
        <SheetHeader className="gap-3">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {centerCopy.insightsTitle}
          </SheetTitle>
          <OSSegmentedControl
            items={insightTabs}
            value={mode}
            onValueChange={(next) => {
              if (next === "rule") {
                setMode(next);
              } else {
                void runAi(next);
              }
            }}
            ariaLabel={centerCopy.insightsTitle}
            layoutId="tasks-insight-mode-pill"
          />
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-6">
          <TaskAiReviewCard
            title={current.title}
            result={current.result}
            source={current.source}
            loading={loading && mode !== "rule"}
            copy={centerCopy}
          />

          <Separator />

          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {centerCopy.analyticsTitle}
            </p>
            <TaskAnalyticsPanel
              analytics={analytics}
              copy={copy}
              centerCopy={centerCopy}
            />
          </div>
        </div>
      </OSBottomSheet>
    </Sheet>
  );
}
