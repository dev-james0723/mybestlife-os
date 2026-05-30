"use client";

import { CheckCircle2, AlertTriangle, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/ui/glass-panel";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import type { TaskReviewAiResult } from "@/lib/ai/schemas/tasks";
import type { TaskAiSource } from "@/lib/ai/task-ai";

interface TaskAiReviewCardProps {
  title: string;
  result: TaskReviewAiResult | null;
  source?: TaskAiSource;
  loading?: boolean;
  copy: TasksCenterUiCopy;
}

function BulletList({
  icon: Icon,
  label,
  items,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  items: string[];
  tone: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <ul className="space-y-1 pl-5 text-sm text-foreground/80">
        {items.map((item, i) => (
          <li key={i} className="list-disc">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renders a weekly-review / summary result (headline + wins / risks / recs). */
export function TaskAiReviewCard({
  title,
  result,
  source,
  loading,
  copy,
}: TaskAiReviewCardProps) {
  return (
    <GlassPanel className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </p>
        {source && !loading && (
          <Badge variant="secondary" className="text-[10px]">
            {source === "gemini" ? copy.aiSourceAi : copy.aiSourceHeuristic}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.aiThinking}
        </div>
      ) : result ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{result.headline}</p>
          <BulletList
            icon={CheckCircle2}
            label={copy.aiReviewWins}
            items={result.wins ?? []}
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <BulletList
            icon={AlertTriangle}
            label={copy.aiReviewRisks}
            items={result.risks ?? []}
            tone="text-amber-600 dark:text-amber-400"
          />
          <BulletList
            icon={Lightbulb}
            label={copy.aiReviewRecommendations}
            items={result.recommendations ?? []}
            tone="text-primary"
          />
        </div>
      ) : null}
    </GlassPanel>
  );
}
