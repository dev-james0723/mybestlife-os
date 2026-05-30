"use client";

import { useMemo, useState } from "react";
import { BarChart3, ListChecks, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

  const TabButton = ({
    value,
    icon: Icon,
    label,
    onClick,
  }: {
    value: InsightMode;
    icon: typeof Sparkles;
    label: string;
    onClick: () => void;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={mode === value ? "default" : "outline"}
      className={cn("h-8 gap-1.5 text-xs", mode === value && "shadow-sm")}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="gap-3">
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {centerCopy.insightsTitle}
          </SheetTitle>
          <div className="flex flex-wrap gap-2">
            <TabButton
              value="rule"
              icon={ListChecks}
              label={centerCopy.insightRuleBased}
              onClick={() => setMode("rule")}
            />
            <TabButton
              value="summary"
              icon={Sparkles}
              label={centerCopy.insightAiSummary}
              onClick={() => runAi("summary")}
            />
            <TabButton
              value="weekly-review"
              icon={Sparkles}
              label={centerCopy.insightWeeklyReview}
              onClick={() => runAi("weekly-review")}
            />
          </div>
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
      </SheetContent>
    </Sheet>
  );
}
