"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeBriefResponse } from "@/lib/life-agent/workflow-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { OpenLoopRadar } from "@/components/life-agent/OpenLoopRadar";
import { cn } from "@/lib/utils";

type LifeBriefPanelProps = {
  ui: LifeAgentUiCopy;
  brief: LifeBriefResponse;
  className?: string;
};

export function LifeBriefPanel({ ui, brief, className }: LifeBriefPanelProps) {
  return (
    <article className={cn("space-y-4 rounded-2xl border border-border/60 bg-card/30 p-4", className)}>
      <p className="text-base font-medium leading-relaxed">{brief.greeting}</p>

      {brief.focusSuggestions.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ui.focusSuggestionsLabel}
          </h3>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-foreground/90">
            {brief.focusSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      )}

      {brief.openLoopGroups.length > 0 && (
        <OpenLoopRadar ui={ui} groups={brief.openLoopGroups} compact />
      )}

      {brief.peopleToFollowUp.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ui.peopleFollowUpLabel}
          </h3>
          <ul className="space-y-2 text-sm">
            {brief.peopleToFollowUp.map((p) => (
              <li key={p.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground"> — {p.nextAction}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief.projectBottlenecks.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {ui.projectBottlenecksLabel}
          </h3>
          <ul className="space-y-2 text-sm">
            {brief.projectBottlenecks.map((p) => (
              <li key={p.id} className="rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground"> — {p.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief.gentleReflection && (
        <p className="text-sm italic text-muted-foreground">{brief.gentleReflection}</p>
      )}

      {brief.closingQuestion && (
        <p className="text-sm font-medium text-foreground/90">{brief.closingQuestion}</p>
      )}

      <AgentMemoryUsedPanel ui={ui} items={brief.memoryUsed} />
    </article>
  );
}
