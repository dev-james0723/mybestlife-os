"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TagSearchHit } from "@/hooks/use-tag-taxonomy";
import { TagCountBadge } from "./TagCountBadge";

interface TagSearchResultsProps {
  hits: TagSearchHit[];
  activeTagId: string | null;
  onSelect: (id: string) => void;
  emptyLabel: string;
  resultsHintLabel: string;
}

/**
 * Render a flat ranked list of search hits with their full taxonomy path.
 * Used as a replacement for the tree while the search input has a value.
 *
 * Each hit shows: `Technology > AI > AI Agents · 12 items`.
 * The trailing segment is rendered with stronger color so the eye finds the
 * actual tag name first; ancestors are de-emphasized.
 */
export function TagSearchResults({
  hits,
  activeTagId,
  onSelect,
  emptyLabel,
  resultsHintLabel,
}: TagSearchResultsProps) {
  if (hits.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {resultsHintLabel}
      </p>
      <div className="space-y-0.5">
        {hits.map((hit) => {
          const isActive = activeTagId === hit.id;
          const ancestors = hit.path.slice(0, -1);
          const leaf = hit.path[hit.path.length - 1] ?? hit.name;
          return (
            <button
              key={hit.id}
              type="button"
              onClick={() => onSelect(hit.id)}
              aria-pressed={isActive}
              data-selection-glow={isActive ? "active" : undefined}
              className={cn(
                "group/search-row flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/60",
              )}
              title={hit.path.join(" / ")}
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                {ancestors.length > 0 && (
                  <p className="flex min-w-0 items-center gap-0.5 truncate text-[10px] text-muted-foreground">
                    {ancestors.map((seg, idx) => (
                      <span key={`${seg}-${idx}`} className="flex min-w-0 items-center gap-0.5">
                        <span className="truncate">{seg}</span>
                        <ChevronRight className="h-2.5 w-2.5 shrink-0 opacity-60" />
                      </span>
                    ))}
                  </p>
                )}
                <p
                  className={cn(
                    "min-w-0 truncate text-[13px]",
                    isActive ? "font-medium" : "font-normal",
                  )}
                >
                  {leaf}
                </p>
              </div>
              <TagCountBadge count={hit.totalCount} active={isActive} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
