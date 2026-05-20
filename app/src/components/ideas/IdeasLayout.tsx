"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useIdeas } from "@/hooks/use-ideas";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { IdeasSidebar, IdeasSidebarMobileMenuButton } from "./IdeasSidebar";
import { IdeasTopControlBar } from "./IdeasTopControlBar";
import { IdeasActiveFiltersBar } from "./IdeasActiveFiltersBar";
import { IdeasContent } from "./IdeasContent";
import { IdeaDetailSheet } from "./IdeaDetailSheet";
import { AddIdeaModal } from "./AddIdeaModal";
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
  const hydrate = useIdeasStore((s) => s.hydrate);
  const openAddModal = useIdeasStore((s) => s.openAddModal);

  useEffect(() => {
    if (data) hydrate(data);
  }, [data, hydrate]);

  if (isError && error) {
    return (
      <PageShell title={ui.pageTitle} description={ui.pageDescription}>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6">
          <h2 className="text-sm font-semibold">Ideas failed to load</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button className="mt-4" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <IdeasSidebarMobileMenuButton />
          <Button size="sm" className="gap-2" onClick={() => openAddModal()}>
            <Plus className="h-4 w-4" />
            {ui.captureIdea}
          </Button>
        </div>
      }
    >
      <Suspense fallback={null}>
        <IdeasDeepLinkSync />
      </Suspense>
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
        <IdeasSidebar />
        <Card className="flex min-h-[min(70vh,640px)] min-w-0 flex-1 flex-col overflow-hidden border-border/70 shadow-sm lg:h-full">
          <CardContent className="flex flex-1 flex-col gap-0 p-0">
            <IdeasTopControlBar />
            <IdeasActiveFiltersBar />
            <Separator />
            <IdeasContent />
          </CardContent>
        </Card>
      </div>
      <IdeaDetailSheet />
      <AddIdeaModal />
    </PageShell>
  );
}
