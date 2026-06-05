"use client";

import { Brain } from "lucide-react";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import { cn } from "@/lib/utils";

type AgentMemoryUsedPanelProps = {
  ui: LifeAgentUiCopy;
  items: LifeAgentMemoryUsedItem[];
  className?: string;
};

function formatMemoryLabel(item: LifeAgentMemoryUsedItem): string {
  const typeLabel = item.sourceType.replace(/_/g, " ");
  const titled = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
  return `${titled}: ${item.title}`;
}

export function AgentMemoryUsedPanel({ ui, items, className }: AgentMemoryUsedPanelProps) {
  if (!items.length) return null;

  const compact = items.slice(0, 8);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-xs",
        className,
      )}
      aria-label={ui.memoryUsedTitle}
    >
      <div className="mb-1.5 flex items-center gap-1.5 font-medium text-muted-foreground">
        <Brain className="h-3.5 w-3.5" aria-hidden />
        <span>{ui.memoryUsedTitle}</span>
      </div>
      <ul className="space-y-1 text-muted-foreground">
        {compact.map((item) => (
          <li key={`${item.sourceType}-${item.sourceId}`} className="truncate">
            {formatMemoryLabel(item)}
          </li>
        ))}
      </ul>
      {items.length > compact.length && (
        <p className="mt-1 text-[10px] text-muted-foreground/80">
          {ui.memoryUsedMore(items.length - compact.length)}
        </p>
      )}
    </div>
  );
}
