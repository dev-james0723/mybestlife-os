"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/shared/page-shell";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import {
  OSActionRow,
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
  OSSolidPanel,
} from "@/components/ui/os-primitives";
import { useIdeas } from "@/hooks/use-ideas";
import { useProfile } from "@/hooks/use-settings";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { normalizeIdeaQuickFilters } from "@/lib/ideas/quick-filters";
import { IdeasSidebar, IdeasSidebarMobileMenuButton } from "./IdeasSidebar";
import { IdeasTopControlBar } from "./IdeasTopControlBar";
import { IdeasActiveFiltersBar } from "./IdeasActiveFiltersBar";
import { IdeasContent } from "./IdeasContent";
import { IdeaDetailSheet } from "./IdeaDetailSheet";
import { AddIdeaModal } from "./AddIdeaModal";
import { IdeasAutoEnrichmentRunner } from "./IdeasAutoEnrichmentRunner";
import type { Idea } from "@/types/database";

function IdeasDeepLinkSync() {
  const searchParams = useSearchParams();
  const items = useIdeasStore((s) => s.items);
  const setSelectedIdeaId = useIdeasStore((s) => s.setSelectedIdeaId);
  useEffect(() => {
    const id = searchParams.get("idea")?.trim();
    if (!id) return;
    if (items.some((i) => i.id === id)) setSelectedIdeaId(id);
  }, [searchParams, items, setSelectedIdeaId]);
  return null;
}

export function IdeasLayout({ initialIdeas }: { initialIdeas: Idea[] }) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const { data, error, isError, refetch } = useIdeas({ initialData: initialIdeas });
  const profile = useProfile();
  const hydrate = useIdeasStore((s) => s.hydrate);
  const setQuickFilterDefinitions = useIdeasStore(
    (s) => s.setQuickFilterDefinitions,
  );
  const openAddModal = useIdeasStore((s) => s.openAddModal);

  useEffect(() => {
    if (data) hydrate(data);
  }, [data, hydrate]);

  useEffect(() => {
    setQuickFilterDefinitions(
      normalizeIdeaQuickFilters(profile.data?.idea_quick_filters),
    );
  }, [profile.data?.idea_quick_filters, setQuickFilterDefinitions]);

  if (isError && error) {
    return (
      <PageShell title={ui.pageTitle} description={ui.pageDescription}>
        <OSSolidPanel className="max-w-xl space-y-4 border-destructive/30 bg-destructive/10 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Ideas failed to load</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <OSControl className="w-fit" onClick={() => void refetch()}>
            Retry
          </OSControl>
        </OSSolidPanel>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
      actions={
        <OSActionRow>
          <IdeasSidebarMobileMenuButton />
          <OSPrimaryAction onClick={() => openAddModal()}>
            <Plus className="h-4 w-4" />
            {ui.captureIdea}
          </OSPrimaryAction>
        </OSActionRow>
      }
    >
      <Suspense fallback={null}>
        <IdeasDeepLinkSync />
      </Suspense>
      <IdeasAutoEnrichmentRunner items={data ?? initialIdeas} />
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
        <IdeasSidebar />
        <OSFrostedPanel className="flex min-h-[min(70vh,640px)] min-w-0 flex-1 flex-col p-0 lg:h-full">
          <div className="flex flex-1 flex-col gap-0">
            <IdeasTopControlBar />
            <IdeasActiveFiltersBar />
            <Separator />
            <IdeasContent />
          </div>
        </OSFrostedPanel>
      </div>
      <IdeaDetailSheet />
      <AddIdeaModal />
    </PageShell>
  );
}
