"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import { cn } from "@/lib/utils";

type AgentSuggestedActionsProps = {
  ui: LifeAgentUiCopy;
  actions: LifeAgentSuggestedAction[];
  className?: string;
};

function actionTypeLabel(ui: LifeAgentUiCopy, type: LifeAgentSuggestedAction["type"]): string {
  return ui.suggestedActionTypes[type] ?? type;
}

export function AgentSuggestedActions({ ui, actions, className }: AgentSuggestedActionsProps) {
  if (!actions.length) return null;

  return (
    <div className={cn("space-y-2", className)} aria-label={ui.suggestedActionsTitle}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        <span>{ui.suggestedActionsTitle}</span>
        <Badge variant="outline" className="rounded-full text-[9px]">
          {ui.suggestedActionsPhaseBadge}
        </Badge>
      </div>
      <ul className="flex flex-col gap-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="rounded-xl border border-dashed border-border/70 bg-background/50 px-3 py-2.5 opacity-90"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{action.title}</p>
              <Badge variant="secondary" className="shrink-0 text-[9px]">
                {actionTypeLabel(ui, action.type)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
            <p className="mt-2 text-[10px] text-muted-foreground/80">{ui.suggestedActionsDisabledHint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
