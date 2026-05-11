"use client";

import { useKnowledgeStore } from "@/stores/knowledge-store";
import { KnowledgeGalleryView } from "./KnowledgeGalleryView";
import { KnowledgeBoardView } from "./KnowledgeBoardView";
import { KnowledgeTableView } from "./KnowledgeTableView";
import { ConstellationView } from "./constellation/ConstellationView";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { useKnowledgeFilteredItems } from "@/hooks/use-knowledge-filtered-items";

interface KnowledgeContentProps {
  userId: string;
}

export function KnowledgeContent({ userId }: KnowledgeContentProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const currentView = useKnowledgeStore((s) => s.currentView);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const clearAllListFilters = useKnowledgeStore((s) => s.clearAllListFilters);

  const { items, filteredItems, summary } = useKnowledgeFilteredItems();

  if (currentView === "constellation") {
    return (
      <div className="min-h-[520px] min-w-0 flex-1 overflow-hidden">
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
              onClick={openAddModal}
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
      {currentView === "gallery" && <KnowledgeGalleryView items={filteredItems} />}
      {currentView === "board" && <KnowledgeBoardView items={filteredItems} />}
      {currentView === "table" && <KnowledgeTableView items={filteredItems} />}
    </div>
  );
}
