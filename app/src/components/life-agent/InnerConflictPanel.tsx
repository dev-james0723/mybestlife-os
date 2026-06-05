"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { InnerConflictResponse } from "@/lib/life-agent/intelligence-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { cn } from "@/lib/utils";

type InnerConflictPanelProps = {
  ui: LifeAgentUiCopy;
  data: InnerConflictResponse;
  className?: string;
};

export function InnerConflictPanel({ ui, data, className }: InnerConflictPanelProps) {
  return (
    <article className={cn("space-y-4", className)}>
      <p className="text-sm text-foreground/90">{data.summary}</p>
      <ul className="space-y-3">
        {data.conflicts.map((c) => (
          <li
            key={c.pattern}
            className="rounded-xl border border-border/50 bg-muted/20 p-3 text-sm"
          >
            <p className="font-medium leading-snug">{c.pattern}</p>
            {c.evidence.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                {c.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {data.emotionalPatterns.length > 0 && (
        <section>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ui.emotionalPatternsLabel}
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {data.emotionalPatterns.map((p) => (
              <li
                key={p}
                className="rounded-full bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}
      <AgentMemoryUsedPanel ui={ui} items={data.memoryUsed} />
    </article>
  );
}
