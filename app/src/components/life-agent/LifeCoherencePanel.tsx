"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeCoherenceResponse } from "@/lib/life-agent/intelligence-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { GentleAccountabilityCard } from "@/components/life-agent/GentleAccountabilityCard";
import { cn } from "@/lib/utils";

type LifeCoherencePanelProps = {
  ui: LifeAgentUiCopy;
  data: LifeCoherenceResponse;
  className?: string;
};

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-foreground/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function LifeCoherencePanel({ ui, data, className }: LifeCoherencePanelProps) {
  return (
    <article className={cn("space-y-4", className)}>
      <p className="text-sm leading-relaxed text-foreground/90">{data.coherenceSummary}</p>
      <p className="text-xs italic text-muted-foreground">{ui.intelligenceDisclaimer}</p>
      <BulletSection title={ui.coherenceAlignedLabel} items={data.alignedAreas} />
      <BulletSection title={ui.coherenceFrictionLabel} items={data.frictionAreas} />
      <BulletSection title={ui.coherenceAdjustmentsLabel} items={data.suggestedAdjustments} />
      {data.gentleAccountability.length > 0 && (
        <GentleAccountabilityCard ui={ui} items={data.gentleAccountability} />
      )}
      <AgentMemoryUsedPanel ui={ui} items={data.memoryUsed} />
    </article>
  );
}
