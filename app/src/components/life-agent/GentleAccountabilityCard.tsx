"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { GentleAccountabilityItem } from "@/lib/life-agent/intelligence-types";
import { cn } from "@/lib/utils";

type GentleAccountabilityCardProps = {
  ui: LifeAgentUiCopy;
  items: GentleAccountabilityItem[];
  className?: string;
};

export function GentleAccountabilityCard({ ui, items, className }: GentleAccountabilityCardProps) {
  if (!items.length) return null;

  return (
    <section
      className={cn("rounded-xl border border-primary/20 bg-primary/5 p-3", className)}
      aria-label={ui.gentleAccountabilityTitle}
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
        {ui.gentleAccountabilityTitle}
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.topic} className="text-sm text-foreground/90">
            <p>{item.prompt}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ui.gentleAccountabilityMentions(item.mentionCount)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
