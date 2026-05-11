"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  useCareerOpportunities,
  useSetOpportunityStage,
} from "@/hooks/use-career-opportunities";
import type {
  CareerOpportunity,
  OpportunityStage,
} from "@/types/career-vault";
import { STAGE_ORDER } from "./PipelineConstants";
import { StageColumn } from "./StageColumn";
import { NewOpportunityModal } from "./NewOpportunityModal";

export function KanbanBoard() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();

  const opportunitiesQuery = useCareerOpportunities();
  const setStageMutation = useSetOpportunityStage();
  const [newOpen, setNewOpen] = useState(false);

  const careerHref = withLocalePrefix(localeSlug, "/career");
  const buildDetailHref = (opportunityId: string) =>
    withLocalePrefix(localeSlug, `/career/pipeline/${opportunityId}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const grouped = useMemo(() => {
    const map: Record<OpportunityStage, CareerOpportunity[]> = {
      researching: [],
      applied: [],
      phone_screen: [],
      interviewing: [],
      offer: [],
      accepted: [],
      rejected: [],
      withdrawn: [],
    };
    for (const o of opportunitiesQuery.data ?? []) {
      (map[o.stage] ??= []).push(o);
    }
    return map;
  }, [opportunitiesQuery.data]);

  if (opportunitiesQuery.isLoading) return <LoadingPage />;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const opportunityId = String(active.id);
    const nextStage = String(over.id) as OpportunityStage;
    if (!STAGE_ORDER.includes(nextStage)) return;
    const opp = (opportunitiesQuery.data ?? []).find(
      (o) => o.id === opportunityId,
    );
    if (!opp || opp.stage === nextStage) return;
    setStageMutation.mutate({ id: opportunityId, stage: nextStage });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={careerHref} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.pipeline.breadcrumb}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.pipeline.pageTitle}
        </h1>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {copy.pipeline.newButton}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.pipeline.pageDescription}
      </p>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-2">
          {STAGE_ORDER.map((s) => (
            <StageColumn
              key={s}
              stage={s}
              opportunities={grouped[s] ?? []}
              copy={copy}
              buildHref={buildDetailHref}
            />
          ))}
        </div>
      </DndContext>

      <NewOpportunityModal
        open={newOpen}
        onOpenChange={setNewOpen}
        copy={copy}
      />
    </div>
  );
}
