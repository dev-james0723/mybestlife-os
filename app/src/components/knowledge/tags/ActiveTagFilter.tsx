"use client";

import { useMemo } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTagFilter } from "@/hooks/use-tag-taxonomy";
import { getTagBreadcrumb } from "@/lib/knowledge/tags/build-tree";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

/**
 * Above-the-grid status strip:
 *   `Filtered by: Technology / AI / AI Agents  [Clear]`
 *
 * Each crumb is clickable and re-targets the filter to its level, so users
 * can step back up the tree without leaving the main content area. The
 * component renders nothing when no tag filter is active, so it can sit
 * unconditionally inside the filter bar without leaving empty space.
 */
export function ActiveTagFilter({ className }: { className?: string }) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const { taxonomy, activeTagId, setTag, clearTagFilter } = useTagFilter();

  const trail = useMemo(
    () => (activeTagId ? getTagBreadcrumb(activeTagId, taxonomy) : []),
    [activeTagId, taxonomy],
  );

  if (!activeTagId || trail.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="text-muted-foreground">{ui.tagTaxonomy.filteredBy}:</span>
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
        {trail.map((crumb, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <span key={`${crumb.id}-${idx}`} className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => setTag(crumb.id)}
                className={cn(
                  "max-w-[200px] truncate rounded px-1 py-0.5 transition-colors",
                  isLast
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title={crumb.name}
                disabled={crumb.type === "category" && !taxonomy.categories.find((c) => c.id === crumb.id) && taxonomy.other.id !== crumb.id}
              >
                {crumb.name}
              </button>
              {!isLast && <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
            </span>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={clearTagFilter}
        aria-label={ui.tagTaxonomy.clear}
      >
        <X className="h-3 w-3" />
        {ui.tagTaxonomy.clear}
      </Button>
    </div>
  );
}
