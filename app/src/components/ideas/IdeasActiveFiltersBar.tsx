"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIdeasStore } from "@/stores/ideas-store";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { cn } from "@/lib/utils";
import {
  getActiveIdeaQuickFilterDefinitions,
  getIdeaQuickFilterDisplayLabel,
  type IdeaBuiltinQuickFilterId,
} from "@/lib/ideas/quick-filters";

export function IdeasActiveFiltersBar({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);

  const searchQuery = useIdeasStore((s) => s.searchQuery);
  const setSearchQuery = useIdeasStore((s) => s.setSearchQuery);
  const ideaStatusScope = useIdeasStore((s) => s.ideaStatusScope);
  const setIdeaStatusScope = useIdeasStore((s) => s.setIdeaStatusScope);
  const activeSourceFilters = useIdeasStore((s) => s.activeSourceFilters);
  const clearSourceFilters = useIdeasStore((s) => s.clearSourceFilters);
  const activeCategoryFilters = useIdeasStore((s) => s.activeCategoryFilters);
  const clearCategoryFilters = useIdeasStore((s) => s.clearCategoryFilters);
  const activeTagToken = useIdeasStore((s) => s.activeTagToken);
  const setActiveTagToken = useIdeasStore((s) => s.setActiveTagToken);
  const activeQuickFilters = useIdeasStore((s) => s.activeQuickFilters);
  const quickFilterDefinitions = useIdeasStore((s) => s.quickFilterDefinitions);
  const toggleQuickFilter = useIdeasStore((s) => s.toggleQuickFilter);
  const relatedScopeFilter = useIdeasStore((s) => s.relatedScopeFilter);
  const setRelatedScopeFilter = useIdeasStore((s) => s.setRelatedScopeFilter);
  const clearAllListFilters = useIdeasStore((s) => s.clearAllListFilters);

  const tagLabel = useMemo(() => {
    if (!activeTagToken) return "";
    const [, ...rest] = activeTagToken.split(":");
    const tag = rest.join(":");
    return `${ui.tags}: ${tag}`;
  }, [activeTagToken, ui.tags]);

  const relatedLabel = useMemo(() => {
    switch (relatedScopeFilter) {
      case "hasIdea":
        return ui.linkedIdea;
      case "hasProject":
        return ui.linkedProject;
      case "hasGoal":
        return ui.linkedGoal;
      case "hasResource":
        return ui.linkedResource;
      case "hasTask":
        return ui.linkedTask;
      case "hasKnowledge":
        return ui.linkedKnowledge;
      case "noRelated":
        return ui.noRelatedResource;
      default:
        return "";
    }
  }, [
    relatedScopeFilter,
    ui.linkedGoal,
    ui.linkedIdea,
    ui.linkedKnowledge,
    ui.linkedProject,
    ui.linkedResource,
    ui.linkedTask,
    ui.noRelatedResource,
  ]);

  const activeQuickFilterDefinitions = useMemo(
    () => getActiveIdeaQuickFilterDefinitions(activeQuickFilters, quickFilterDefinitions),
    [activeQuickFilters, quickFilterDefinitions],
  );

  const hasFilters =
    searchQuery.trim().length > 0 ||
    ideaStatusScope !== "all" ||
    activeSourceFilters.length > 0 ||
    activeCategoryFilters.length > 0 ||
    Boolean(activeTagToken) ||
    activeQuickFilterDefinitions.length > 0 ||
    relatedScopeFilter !== "none";

  if (!hasFilters) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border/50 bg-muted/15 px-4 py-2.5 sm:px-5",
        className,
      )}
      role="region"
      aria-label={ui.activeFiltersHeading}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {ui.activeFiltersHeading}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {searchQuery.trim() ? (
          <FilterChip label={`Search: ${searchQuery.trim()}`} onRemove={() => setSearchQuery("")} />
        ) : null}
        {ideaStatusScope !== "all" ? (
          <FilterChip
            label={ui.statusLabels[ideaStatusScope]}
            onRemove={() => setIdeaStatusScope("all")}
          />
        ) : null}
        {activeSourceFilters.length > 0 ? (
          <FilterChip label={`Source (${activeSourceFilters.length})`} onRemove={() => clearSourceFilters()} />
        ) : null}
        {activeCategoryFilters.length > 0 ? (
          <FilterChip
            label={`${ui.categories} (${activeCategoryFilters.length})`}
            onRemove={() => clearCategoryFilters()}
          />
        ) : null}
        {activeTagToken ? (
          <FilterChip label={tagLabel} onRemove={() => setActiveTagToken(null)} />
        ) : null}
        {activeQuickFilterDefinitions.map((def) => (
          <FilterChip
            key={def.id}
            label={getIdeaQuickFilterDisplayLabel(
              def,
              ui.quickLabels as Record<IdeaBuiltinQuickFilterId, string>,
            )}
            onRemove={() => toggleQuickFilter(def.id)}
          />
        ))}
        {relatedScopeFilter !== "none" ? (
          <FilterChip label={relatedLabel} onRemove={() => setRelatedScopeFilter("none")} />
        ) : null}
      </div>
      <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => clearAllListFilters()}>
        {ui.clearAllFilters}
      </Button>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs shadow-sm">
      <span className="truncate">{label}</span>
      <button
        type="button"
        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onRemove}
        aria-label="Remove filter"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
