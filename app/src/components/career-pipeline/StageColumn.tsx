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
        "flex min-h-[320px] w-[286px] flex-shrink-0 snap-start flex-col gap-3 rounded-xl border bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition dark:bg-white/[0.04]",
        STAGE_ACCENT[stage],
        isOver && "ring-2 ring-lime-300/60",
      )}
    >
      <header className="space-y-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {copy.pipeline.stages[stage]}
          </h2>
          <span className="rounded-full border border-white/50 bg-white/64 px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
            {opportunities.length}
          </span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {copy.pipeline.stageDescriptions[stage]}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-auto pr-1">
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
