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
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  ClipboardList,
  Info,
  Plus,
  Trophy,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  CareerEmptyState,
  CareerHelpPanel,
  CareerMetricCard,
  CareerMetricGrid,
  CareerSectionPanel,
} from "@/components/career/career-page-ui";
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

  const opportunities = useMemo(
    () => opportunitiesQuery.data ?? [],
    [opportunitiesQuery.data],
  );
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
    for (const o of opportunities) {
      (map[o.stage] ??= []).push(o);
    }
    return map;
  }, [opportunities]);

  const activeCount = useMemo(
    () =>
      opportunities.filter((o) =>
        ["researching", "applied", "phone_screen", "interviewing", "offer"].includes(o.stage),
      ).length,
    [opportunities],
  );
  const interviewCount = useMemo(
    () =>
      opportunities.filter((o) => o.stage === "phone_screen" || o.stage === "interviewing")
        .length,
    [opportunities],
  );
  const offerCount = useMemo(
    () => opportunities.filter((o) => o.stage === "offer").length,
    [opportunities],
  );
  const followUpsDue = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return opportunities.filter((o) => {
      if (!o.next_action_date) return false;
      const due = new Date(`${o.next_action_date}T23:59:59`);
      return !Number.isNaN(due.getTime()) && due.getTime() <= endOfToday.getTime();
    }).length;
  }, [opportunities]);

  if (opportunitiesQuery.isLoading) return <LoadingPage />;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const opportunityId = String(active.id);
    const nextStage = String(over.id) as OpportunityStage;
    if (!STAGE_ORDER.includes(nextStage)) return;
    const opp = opportunities.find((o) => o.id === opportunityId);
    if (!opp || opp.stage === nextStage) return;
    setStageMutation.mutate({ id: opportunityId, stage: nextStage });
  };

  return (
    <PageShell
      title={copy.pipeline.pageTitle}
      description={copy.pipeline.pageDescription}
      actions={
        <>
          <OSControl render={<Link href={careerHref} />} className="gap-2">
            <ArrowLeft className="size-4" aria-hidden />
            Career
          </OSControl>
          <OSPrimaryAction onClick={() => setNewOpen(true)} className="gap-2">
            <Plus className="size-4" aria-hidden />
            {copy.pipeline.newButton}
          </OSPrimaryAction>
        </>
      }
    >
      <div className="space-y-5">
        <CareerMetricGrid>
          <CareerMetricCard
            icon={Briefcase}
            label="Active opportunities"
            value={activeCount}
            description="Roles still moving from research through offer."
          />
          <CareerMetricCard
            icon={ClipboardList}
            label="Interviews"
            value={interviewCount}
            description="Screens and interview loops that need preparation."
          />
          <CareerMetricCard
            icon={Trophy}
            label="Offers"
            value={offerCount}
            description="Negotiations or final choices waiting on you."
          />
          <CareerMetricCard
            icon={CalendarClock}
            label="Follow-ups due"
            value={followUpsDue}
            description="Next actions with a date due today or earlier."
          />
        </CareerMetricGrid>

        <CareerHelpPanel icon={Info} title="How to use this workspace">
          Drag an opportunity when the stage changes. Open a card to attach Vault files,
          log interviews, track next actions, and keep the story of each role in one place.
        </CareerHelpPanel>

        {opportunities.length === 0 ? (
          <CareerEmptyState
            icon={Briefcase}
            title="Start your first opportunity"
            description="Add one role you are researching, applying to, interviewing for, or deciding on."
            actionLabel={copy.pipeline.newButton}
            onAction={() => setNewOpen(true)}
          />
        ) : null}

        <CareerSectionPanel
          title="Opportunity board"
          description="Each column is a stage. The board scrolls horizontally on small screens so drag-and-drop stays usable."
        >
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-3">
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
        </CareerSectionPanel>
      </div>

      <NewOpportunityModal
        open={newOpen}
        onOpenChange={setNewOpen}
        copy={copy}
      />
    </PageShell>
  );
}
