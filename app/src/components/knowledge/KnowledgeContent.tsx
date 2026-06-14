"use client";

import { useEffect } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { KnowledgeGalleryView } from "./KnowledgeGalleryView";
import { KnowledgeBoardView } from "./KnowledgeBoardView";
import { KnowledgeTableView } from "./KnowledgeTableView";
import { ConstellationView } from "./constellation/ConstellationView";
import { Button } from "@/components/ui/button";
import { OSIconControl } from "@/components/ui/os-primitives";
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { useKnowledgeFilteredItems } from "@/hooks/use-knowledge-filtered-items";
import { BoardLandscapeMode } from "@/components/shared/board-landscape-mode";

interface KnowledgeContentProps {
  userId: string;
}

export function KnowledgeContent({ userId }: KnowledgeContentProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const clearAllListFilters = useKnowledgeStore((s) => s.clearAllListFilters);
  const cardsPerPage = useKnowledgeStore((s) => s.cardsPerPage);
  const currentPage = useKnowledgeStore((s) => s.currentPage);
  const setCurrentPage = useKnowledgeStore((s) => s.setCurrentPage);

  const { items, filteredItems, summary } = useKnowledgeFilteredItems();
  const pageSize = Math.max(1, cardsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredItems.length);
  const pagedItems = filteredItems.slice(pageStart, pageEnd);

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage);
  }, [currentPage, safePage, setCurrentPage]);

  if (currentView === "constellation") {
    return (
      <div className="min-h-[clamp(640px,76dvh,900px)] min-w-0 flex-1 overflow-hidden">
        <ConstellationView userId={userId} />
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-muted/25">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-medium">
            {items.length === 0 ? ui.emptyStateNoKnowledgeTitle : ui.emptyStateNoMatchesTitle}
          </h3>
          <p className="mx-auto max-w-[280px] text-xs leading-relaxed text-muted-foreground">
            {items.length === 0
              ? ui.emptyStateNoKnowledgeDescription
              : ui.emptyStateNoMatchesDescription}
          </p>
          {items.length === 0 ? (
            <Button
              size="sm"
              onClick={() => openAddModal()}
              className="mt-1 h-9 gap-2 border-transparent bg-violet-600 text-white shadow-sm hover:bg-violet-700"
            >
              {ui.addKnowledge}
            </Button>
          ) : summary.hasAnyFilter ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-1"
              onClick={() => clearAllListFilters()}
            >
              {ui.emptyFilteredClearButton}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
      {currentView === "gallery" && <KnowledgeGalleryView items={pagedItems} />}
      {currentView === "board" && (
        <BoardLandscapeMode
          title={ui.boardLandscape.title}
          description={ui.boardLandscape.description}
          enterLabel={ui.boardLandscape.enter}
          exitLabel={ui.boardLandscape.exit}
          rotateHint={ui.boardLandscape.rotateHint}
          landscapeChildren={<KnowledgeBoardView items={pagedItems} isLandscapeMode />}
        >
          <KnowledgeBoardView items={pagedItems} />
        </BoardLandscapeMode>
      )}
      {currentView === "table" && <KnowledgeTableView items={pagedItems} />}

      <div className="mt-4 flex min-w-0 flex-col gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="tabular-nums">
          {ui.formatPaginationRange(pageStart + 1, pageEnd, filteredItems.length)}
        </span>

        {totalPages > 1 ? (
          <div className="flex min-w-0 items-center gap-2">
            <OSIconControl
              type="button"
              size="icon-sm"
              osSize="none"
              className="h-8 min-h-8 w-8"
              disabled={safePage <= 1}
              aria-label={ui.previousPage}
              onClick={() => setCurrentPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </OSIconControl>
            <span className="min-w-24 text-center tabular-nums">
              {ui.formatPaginationPage(safePage, totalPages)}
            </span>
            <OSIconControl
              type="button"
              size="icon-sm"
              osSize="none"
              className="h-8 min-h-8 w-8"
              disabled={safePage >= totalPages}
              aria-label={ui.nextPage}
              onClick={() => setCurrentPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </OSIconControl>
          </div>
        ) : null}
      </div>
    </div>
  );
}
