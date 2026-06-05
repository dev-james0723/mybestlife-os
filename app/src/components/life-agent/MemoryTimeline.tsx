"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { MemoryTimelineResponse } from "@/lib/life-agent/intelligence-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { cn } from "@/lib/utils";

type MemoryTimelineProps = {
  ui: LifeAgentUiCopy;
  data: MemoryTimelineResponse;
  className?: string;
};

export function MemoryTimeline({ ui, data, className }: MemoryTimelineProps) {
  return (
    <article className={cn("space-y-4", className)}>
      <p className="text-sm text-foreground/90">{data.headline}</p>
      <ol className="relative space-y-0 border-l border-border/60 pl-4">
        {data.entries.map((entry) => (
          <li key={`${entry.sourceType}-${entry.id}`} className="relative pb-4 last:pb-0">
            <span
              className="absolute -left-[1.3rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary/70"
              aria-hidden
            />
            <time className="text-[10px] font-medium uppercase text-muted-foreground">
              {entry.date}
            </time>
            <p className="text-sm font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {ui.timelineSourceLabel(entry.sourceType)}
              {entry.theme ? ` · ${entry.theme}` : null}
            </p>
          </li>
        ))}
      </ol>
      {data.entries.length === 0 && (
        <p className="text-sm text-muted-foreground">{ui.intelligenceEmpty}</p>
      )}
      <AgentMemoryUsedPanel ui={ui} items={data.memoryUsed} />
    </article>
  );
}
