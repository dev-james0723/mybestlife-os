"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { CareerOpportunity, OpportunityStage } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { STAGE_ACCENT } from "./PipelineConstants";
import { OpportunityCard } from "./OpportunityCard";

interface StageColumnProps {
  stage: OpportunityStage;
  opportunities: CareerOpportunity[];
  copy: CareerVaultCopy;
  buildHref: (opportunityId: string) => string;
}

export function StageColumn({
  stage,
  opportunities,
  copy,
  buildHref,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] w-[280px] flex-shrink-0 flex-col gap-2 rounded-xl border-2 bg-muted/30 p-2 transition snap-start",
        STAGE_ACCENT[stage],
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <header className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.pipeline.stages[stage]}
        </h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {opportunities.length}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-auto">
        {opportunities.map((o) => (
          <OpportunityCard
            key={o.id}
            opportunity={o}
            copy={copy}
            href={buildHref(o.id)}
          />
        ))}
      </div>
    </section>
  );
}
