"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { WeeklyReviewResponse } from "@/lib/life-agent/workflow-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { OpenLoopRadar } from "@/components/life-agent/OpenLoopRadar";
import { cn } from "@/lib/utils";

type WeeklyReviewPanelProps = {
  ui: LifeAgentUiCopy;
  review: WeeklyReviewResponse;
  className?: string;
};

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function WeeklyReviewPanel({ ui, review, className }: WeeklyReviewPanelProps) {
  return (
    <article className={cn("space-y-4 rounded-2xl border border-border/60 bg-card/30 p-4", className)}>
      <h3 className="text-base font-semibold">{review.headline}</h3>
      <BulletSection title={ui.weeklyWinsLabel} items={review.wins} />
      <BulletSection title={ui.weeklyPatternsLabel} items={review.patterns} />
      {review.groups.length > 0 && (
        <OpenLoopRadar ui={ui} groups={review.groups} compact />
      )}
      <BulletSection title={ui.weeklyFocusLabel} items={review.focusForNextWeek} />
      {review.gentleReflection && (
        <p className="text-sm italic text-muted-foreground">{review.gentleReflection}</p>
      )}
      <AgentMemoryUsedPanel ui={ui} items={review.memoryUsed} />
    </article>
  );
}
