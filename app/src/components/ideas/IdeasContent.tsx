"use client";

import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { filterIdeas, sortIdeas } from "@/lib/ideas/filter-sort-ideas";
import { ideaQuickFiltersNeedMinuteTicker } from "@/lib/ideas/quick-filters";
import { Button } from "@/components/ui/button";
import { IdeasGalleryView } from "./IdeasGalleryView";
import { IdeasBoardView } from "./IdeasBoardView";
import { IdeasTableView } from "./IdeasTableView";
import { IdeasConstellationView } from "./IdeasConstellationView";
import type { Idea } from "@/types/database";
import { BoardLandscapeMode } from "@/components/shared/board-landscape-mode";

export function IdeasContent() {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const items = useIdeasStore((s) => s.items);
  const currentView = useIdeasStore((s) => s.currentView);
  const openAddModal = useIdeasStore((s) => s.openAddModal);
  const setSelectedIdeaId = useIdeasStore((s) => s.setSelectedIdeaId);
  const clearAllListFilters = useIdeasStore((s) => s.clearAllListFilters);
  const [minuteTick, setMinuteTick] = useState(0);

  const filterState = useIdeasStore(
    useShallow((s) => ({
      searchQuery: s.searchQuery,
      ideaStatusScope: s.ideaStatusScope,
      activeSourceFilters: s.activeSourceFilters,
      activeCategoryFilters: s.activeCategoryFilters,
      activeTagToken: s.activeTagToken,
      activeQuickFilters: s.activeQuickFilters,
      quickFilterDefinitions: s.quickFilterDefinitions,
      relatedScopeFilter: s.relatedScopeFilter,
    })),
  );
  const sortBy = useIdeasStore((s) => s.sortBy);

  useEffect(() => {
    if (
      !ideaQuickFiltersNeedMinuteTicker(
        filterState.activeQuickFilters,
        filterState.quickFilterDefinitions,
      )
    ) {
      return;
    }
    const interval = window.setInterval(() => setMinuteTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, [filterState.activeQuickFilters, filterState.quickFilterDefinitions]);

  const filtered = useMemo(
    () => {
      void minuteTick;
      return sortIdeas(filterIdeas(items, filterState), sortBy);
    },
    [items, filterState, sortBy, minuteTick],
  );

  const hasAnyFilter =
    filterState.searchQuery.trim().length > 0 ||
    filterState.ideaStatusScope !== "all" ||
    filterState.activeSourceFilters.length > 0 ||
    filterState.activeCategoryFilters.length > 0 ||
    Boolean(filterState.activeTagToken) ||
    filterState.activeQuickFilters.length > 0 ||
    filterState.relatedScopeFilter !== "none";

  const onOpen = (idea: Idea) => setSelectedIdeaId(idea.id);

  if (currentView === "constellation") {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <IdeasConstellationView items={filtered} />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="space-y-3 text-center">
          <h3 className="text-sm font-medium">
            {items.length === 0 ? ui.emptyNoIdeasTitle : ui.emptyNoMatchesTitle}
          </h3>
          <p className="mx-auto max-w-[320px] text-xs leading-relaxed text-muted-foreground">
            {items.length === 0 ? ui.emptyNoIdeasDescription : ui.emptyNoMatchesDescription}
          </p>
          {items.length === 0 ? (
            <Button size="sm" className="mt-1 h-9" onClick={() => openAddModal()}>
              {ui.captureIdea}
            </Button>
          ) : hasAnyFilter ? (
            <Button size="sm" variant="outline" className="mt-1" onClick={() => clearAllListFilters()}>
              {ui.clearAllFilters}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
      {currentView === "gallery" && <IdeasGalleryView items={filtered} language={language} onOpen={onOpen} />}
      {currentView === "board" && (
        <BoardLandscapeMode
          title={ui.boardLandscape.title}
          description={ui.boardLandscape.description}
          enterLabel={ui.boardLandscape.enter}
          exitLabel={ui.boardLandscape.exit}
          rotateHint={ui.boardLandscape.rotateHint}
          landscapeChildren={
            <IdeasBoardView
              items={filtered}
              language={language}
              onOpen={onOpen}
              isLandscapeMode
            />
          }
        >
          <IdeasBoardView items={filtered} language={language} onOpen={onOpen} />
        </BoardLandscapeMode>
      )}
      {currentView === "table" && <IdeasTableView items={filtered} language={language} onOpen={onOpen} />}
    </div>
  );
}
