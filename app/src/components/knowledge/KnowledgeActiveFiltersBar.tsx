"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useTagFilter } from "@/hooks/use-tag-taxonomy";
import { getTagBreadcrumb } from "@/lib/knowledge/tags/build-tree";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { filterChipScrollClassName } from "@/components/shared/filter-scroll";
import {
  getActiveKnowledgeQuickFilterDefinitions,
  getKnowledgeQuickFilterDisplayLabel,
  type KnowledgeBuiltinQuickFilterId,
} from "@/lib/knowledge/quick-filters";

export function KnowledgeActiveFiltersBar({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);

  const searchQuery = useKnowledgeStore((s) => s.searchQuery);
  const setSearchQuery = useKnowledgeStore((s) => s.setSearchQuery);
  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const clearTypeFilters = useKnowledgeStore((s) => s.clearTypeFilters);
  const activeCategoryFilters = useKnowledgeStore((s) => s.activeCategoryFilters);
  const clearCategoryFilters = useKnowledgeStore((s) => s.clearCategoryFilters);
  const activeQuickFilters = useKnowledgeStore((s) => s.activeQuickFilters);
  const quickFilterDefinitions = useKnowledgeStore((s) => s.quickFilterDefinitions);
  const toggleQuickFilter = useKnowledgeStore((s) => s.toggleQuickFilter);
  const activeSmartCollectionId = useKnowledgeStore((s) => s.activeSmartCollectionId);
  const setActiveSmartCollectionId = useKnowledgeStore((s) => s.setActiveSmartCollectionId);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const clearAllListFilters = useKnowledgeStore((s) => s.clearAllListFilters);

  const { taxonomy, activeTagId, setTag, clearTagFilter } = useTagFilter();

  const tagTrail = useMemo(
    () => (activeTagId ? getTagBreadcrumb(activeTagId, taxonomy) : []),
    [activeTagId, taxonomy],
  );

  const activeCollection = useMemo(
    () => smartCollections.find((c) => c.id === activeSmartCollectionId) ?? null,
    [smartCollections, activeSmartCollectionId],
  );

  const hasFilters =
    searchQuery.trim().length > 0 ||
    activeTypeFilters.length > 0 ||
    activeCategoryFilters.length > 0 ||
    activeQuickFilters.length > 0 ||
    Boolean(activeSmartCollectionId) ||
    Boolean(activeTagId);

  const activeQuickFilterDefinitions = getActiveKnowledgeQuickFilterDefinitions(
    activeQuickFilters,
    quickFilterDefinitions,
  );

  if (!hasFilters) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden border-b border-border/50 bg-muted/15 py-2.5 pl-4 pr-20 sm:px-5 lg:flex-wrap lg:overflow-visible",
        className,
      )}
      role="region"
      aria-label={ui.activeFiltersHeading}
    >
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {ui.activeFiltersHeading}
      </span>

      <div className={filterChipScrollClassName}>
        {searchQuery.trim() ? (
          <FilterChip
            label={ui.formatActiveSearch(searchQuery.trim())}
            onRemove={() => setSearchQuery("")}
            removeAriaLabel={ui.clearAllFilters}
          />
        ) : null}

        {activeTypeFilters.length > 0 ? (
          <FilterChip
            label={ui.formatActiveTypes(activeTypeFilters.length)}
            onRemove={() => clearTypeFilters()}
            removeAriaLabel={ui.clearAllFilters}
          />
        ) : null}

        {activeCategoryFilters.length > 0 ? (
          <FilterChip
            label={ui.formatActiveCategories(activeCategoryFilters.length)}
            onRemove={() => clearCategoryFilters()}
            removeAriaLabel={ui.clearAllFilters}
          />
        ) : null}

        {activeQuickFilterDefinitions.map((def) => (
          <FilterChip
            key={def.id}
            label={getKnowledgeQuickFilterDisplayLabel(
              def,
              ui.quickFilters as Record<KnowledgeBuiltinQuickFilterId, string>,
            )}
            onRemove={() => toggleQuickFilter(def.id)}
            removeAriaLabel={ui.clearAllFilters}
          />
        ))}

        {activeCollection ? (
          <FilterChip
            label={ui.formatActiveCollection(activeCollection.name)}
            onRemove={() => setActiveSmartCollectionId(null)}
            removeAriaLabel={ui.clearAllFilters}
          />
        ) : null}

        {activeTagId && tagTrail.length > 0 ? (
          <div
            data-selection-glow="static"
            className="flex max-w-[min(72vw,260px)] shrink-0 items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-none">
              {tagTrail.map((crumb, idx) => {
                const isLast = idx === tagTrail.length - 1;
                return (
                  <span key={`${crumb.id}-${idx}`} className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setTag(crumb.id)}
                      className={cn(
                        "max-w-[140px] truncate rounded px-1 py-0.5 transition-colors",
                        isLast
                          ? "font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      title={crumb.name}
                    >
                      {crumb.name}
                    </button>
                    {!isLast ? (
                      <span className="text-muted-foreground/50" aria-hidden>
                        /
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={clearTagFilter}
              aria-label={ui.tagTaxonomy.clear}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          clearAllListFilters();
        }}
      >
        {ui.clearAllFilters}
      </Button>
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
  removeAriaLabel,
}: {
  label: string;
  onRemove: () => void;
  removeAriaLabel: string;
}) {
  return (
    <span
      data-selection-glow="static"
      className="inline-flex max-w-[min(72vw,220px)] shrink-0 items-center gap-0.5 rounded-full border border-border/70 bg-background/90 pl-2.5 pr-1 text-[11px] text-foreground shadow-sm"
    >
      <span className="min-w-0 truncate font-medium">{label}</span>
      <button data-control-variant="ghost"
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={removeAriaLabel}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
