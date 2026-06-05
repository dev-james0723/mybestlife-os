"use client";

import type { LifeAgentUiCopy, LifeAgentEnergyLevelId } from "@/lib/i18n/life-agent-ui";
import type { PlanMyDayResponse } from "@/lib/life-agent/workflow-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ENERGY_LEVELS: LifeAgentEnergyLevelId[] = [
  "low",
  "normal",
  "high_focus",
  "scattered",
  "emotionally_tired",
];

type PlanMyDayPanelProps = {
  ui: LifeAgentUiCopy;
  energyLevel: LifeAgentEnergyLevelId;
  onEnergyChange: (level: LifeAgentEnergyLevelId) => void;
  onRun: () => void;
  isLoading: boolean;
  plan: PlanMyDayResponse | null;
  className?: string;
};

function PlanBlock({ title, items }: { title: string; items: string[] }) {
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

export function PlanMyDayPanel({
  ui,
  energyLevel,
  onEnergyChange,
  onRun,
  isLoading,
  plan,
  className,
}: PlanMyDayPanelProps) {
  return (
    <div className={cn("space-y-4 rounded-2xl border border-border/60 bg-card/30 p-4", className)}>
      <p className="text-sm font-medium">{ui.energyPrompt}</p>
      <div className="flex flex-wrap gap-2">
        {ENERGY_LEVELS.map((level) => (
          <Button
            key={level}
            type="button"
            size="sm"
            variant={energyLevel === level ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onEnergyChange(level)}
          >
            {ui.energyLabels[level]}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        className="rounded-2xl"
        disabled={isLoading}
        onClick={onRun}
      >
        {isLoading ? ui.workflowLoading : ui.workflowRun}
      </Button>

      {plan && (
        <div className="space-y-4 border-t border-border/50 pt-4">
          <PlanBlock title={ui.morningLabel} items={plan.morning} />
          <PlanBlock title={ui.afternoonLabel} items={plan.afternoon} />
          <PlanBlock title={ui.eveningLabel} items={plan.evening} />
          <PlanBlock title={ui.minimumViableDayLabel} items={plan.minimumViableDay} />
          <PlanBlock title={ui.optionalStretchLabel} items={plan.optionalStretch} />
          <AgentMemoryUsedPanel ui={ui} items={plan.memoryUsed} />
        </div>
      )}
    </div>
  );
}
