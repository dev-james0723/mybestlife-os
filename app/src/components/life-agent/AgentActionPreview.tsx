"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import { cn } from "@/lib/utils";

type AgentActionPreviewProps = {
  ui: LifeAgentUiCopy;
  preview: LifeAgentActionPreviewCard;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  isConfirming?: boolean;
  isCancelling?: boolean;
  className?: string;
};

function riskVariant(risk: LifeAgentActionPreviewCard["riskLevel"]) {
  switch (risk) {
    case "high":
      return "destructive" as const;
    case "medium":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function AgentActionPreview({
  ui,
  preview,
  onConfirm,
  onCancel,
  isConfirming = false,
  isCancelling = false,
  className,
}: AgentActionPreviewProps) {
  const isPending = preview.status === "pending";
  const isDone = preview.status === "executed";
  const isFailed = preview.status === "failed";
  const isCancelled = preview.status === "cancelled";

  return (
    <article
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 px-3 py-3 shadow-sm",
        isDone && "border-emerald-500/30 bg-emerald-500/5",
        isFailed && "border-destructive/30 bg-destructive/5",
        isCancelled && "opacity-60",
        className,
      )}
      aria-label={preview.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{preview.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{preview.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Badge variant="outline" className="text-[9px]">
            {ui.actionDomainLabels[preview.domain]}
          </Badge>
          <Badge variant={riskVariant(preview.riskLevel)} className="text-[9px]">
            {ui.actionRiskLabels[preview.riskLevel]}
          </Badge>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        {ui.actionTypeLabels[preview.actionType]}
      </p>

      {preview.resultSummary && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{preview.resultSummary}</p>
      )}
      {preview.errorMessage && (
        <p className="mt-2 text-xs text-destructive">{preview.errorMessage}</p>
      )}

      {isPending && onConfirm && onCancel && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={isConfirming || isCancelling}
            onClick={() => onConfirm(preview.id)}
          >
            {isConfirming ? ui.actionConfirming : ui.actionConfirm}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={isConfirming || isCancelling}
            onClick={() => onCancel(preview.id)}
          >
            {isCancelling ? ui.actionCancelling : ui.actionCancel}
          </Button>
        </div>
      )}

      {isDone && (
        <p className="mt-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          {ui.actionExecuted}
        </p>
      )}
      {isCancelled && (
        <p className="mt-2 text-[10px] text-muted-foreground">{ui.actionCancelled}</p>
      )}
    </article>
  );
}
