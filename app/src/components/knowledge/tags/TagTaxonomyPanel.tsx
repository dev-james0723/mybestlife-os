"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Cpu,
  Briefcase,
  GraduationCap,
  Music,
  HeartPulse,
  Microscope,
  Palette,
  Globe2,
  Sparkles,
  Layers,
  Search,
  Tag as TagIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTagFilter, useTagSearch } from "@/hooks/use-tag-taxonomy";
import type {
  TagCategoryAccent,
  TagCategoryIconName,
  TagCategoryNode,
} from "@/lib/knowledge/tags/types";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { TagTreeNode } from "./TagTreeNode";
import { TagCountBadge } from "./TagCountBadge";
import { TagSearchResults } from "./TagSearchResults";

interface TagTaxonomyPanelProps {
  /** Called after a tag is selected (used to close the mobile drawer). */
  onAfterSelect?: () => void;
  className?: string;
}

const ICON_MAP: Record<TagCategoryIconName, React.ComponentType<{ className?: string }>> = {
  Cpu,
  Briefcase,
  GraduationCap,
  Music,
  HeartPulse,
  Microscope,
  Palette,
  Globe2,
  Sparkles,
  Layers,
};

const ACCENT_TEXT: Record<TagCategoryAccent, string> = {
  violet: "text-violet-600 dark:text-violet-400",
  teal: "text-teal-600 dark:text-teal-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  blue: "text-blue-600 dark:text-blue-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  slate: "text-slate-500 dark:text-slate-400",
  indigo: "text-indigo-600 dark:text-indigo-400",
  pink: "text-pink-600 dark:text-pink-400",
  orange: "text-orange-600 dark:text-orange-400",
};

/**
 * The full Tags section that replaces the old flat-pill list in the
 * knowledge sidebar. Composes:
 *   - search input
 *   - "All knowledge" reset row when a tag filter is active
 *   - tree of categories → roots → descendants (or search results)
 *
 * State management:
 *   - The active tag id lives in the knowledge store via `useTagFilter`.
 *   - Expanded category / branch ids live locally; if the active tag id
 *     changes (e.g. clicking a search result), we auto-expand its
 *     ancestors so the user sees where they landed.
 */
export function TagTaxonomyPanel({ onAfterSelect, className }: TagTaxonomyPanelProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const { taxonomy, activeTagId, setTag, clearTagFilter } = useTagFilter();

  const [query, setQuery] = useState("");
  const searchHits = useTagSearch(query);

  // Expanded ids: by default expand top-level categories that have items so
  // the panel doesn't open as a wall of empty headers.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const init = new Set<string>();
    for (const cat of taxonomy.categories) {
      if (cat.totalCount > 0) init.add(`category:${cat.id}`);
    }
    if (taxonomy.other.totalCount > 0) init.add(`category:${taxonomy.other.id}`);
    return init;
  });

  // The *effective* expansion set is the union of explicit user toggles and
  // the ancestors of the currently-selected tag. Computing this during
  // render (instead of mirroring it into state via an effect) avoids
  // cascading renders and stays correct when a search hit is selected from
  // outside the tree.
  const effectiveExpandedIds = useMemo(() => {
    const out = new Set(expandedIds);
    if (activeTagId) {
      const node = taxonomy.tagIndex.get(activeTagId);
      if (node) {
        out.add(`category:${node.categoryId}`);
        for (let i = 0; i < node.idPath.length - 1; i++) out.add(node.idPath[i]);
      }
    }
    return out;
  }, [activeTagId, expandedIds, taxonomy]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategoryExpanded = useCallback(
    (id: string) => toggleExpanded(`category:${id}`),
    [toggleExpanded],
  );

  const handleSelect = useCallback(
    (id: string) => {
      setTag(activeTagId === id ? null : id);
      onAfterSelect?.();
    },
    [activeTagId, setTag, onAfterSelect],
  );

  const handleSelectCategory = useCallback(
    (id: string) => {
      // Always auto-expand on category click so the user can see immediate children.
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.add(`category:${id}`);
        return next;
      });
      handleSelect(id);
    },
    [handleSelect],
  );

  const visibleCategories = useMemo(() => {
    const cats = taxonomy.categories.filter((c) => c.totalCount > 0);
    if (taxonomy.other.totalCount > 0) cats.push(taxonomy.other);
    return cats;
  }, [taxonomy]);

  const treeLabels = useMemo(
    () => ({
      expand: ui.tagTaxonomy.expandNode,
      collapse: ui.tagTaxonomy.collapseNode,
      selectTag: ui.tagTaxonomy.selectTag,
    }),
    [ui.tagTaxonomy],
  );

  const isSearching = !!searchHits;
  const hasAnyTags = taxonomy.tagIndex.size > 0 || taxonomy.other.roots.length > 0;

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {ui.tagTaxonomy.sectionTitle}
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui.tagTaxonomy.searchPlaceholder}
          aria-label={ui.tagTaxonomy.searchPlaceholder}
          className="h-7 border-border/60 bg-background/80 pl-7 pr-2 text-xs"
        />
      </div>

      {!hasAnyTags ? (
        <TagPanelEmptyState
          title={ui.tagTaxonomy.emptyTitle}
          description={ui.tagTaxonomy.emptyDescription}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              clearTagFilter();
              setQuery("");
              onAfterSelect?.();
            }}
            aria-pressed={!activeTagId}
            data-selection-glow={!activeTagId ? "active" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[13px] transition-colors",
              !activeTagId
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{ui.tagTaxonomy.allKnowledge}</span>
            </span>
            <TagCountBadge count={taxonomy.totalItems} active={!activeTagId} />
          </button>

          <div className="max-h-[min(38vh,280px)] min-h-0 space-y-1 overflow-y-auto overflow-x-hidden pr-1">
            {isSearching ? (
              <TagSearchResults
                hits={searchHits!}
                activeTagId={activeTagId}
                onSelect={(id) => {
                  handleSelect(id);
                }}
                emptyLabel={ui.tagTaxonomy.searchNoResults}
                resultsHintLabel={ui.tagTaxonomy.searchResultsHint(searchHits!.length)}
              />
            ) : (
              visibleCategories.map((cat) => (
                <CategorySection
                  key={cat.id}
                  category={cat}
                  isExpanded={effectiveExpandedIds.has(`category:${cat.id}`)}
                  onToggle={() => toggleCategoryExpanded(cat.id)}
                  activeTagId={activeTagId}
                  onSelectCategory={handleSelectCategory}
                  onSelectTag={handleSelect}
                  expandedIds={effectiveExpandedIds}
                  onToggleNode={toggleExpanded}
                  treeLabels={treeLabels}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface CategorySectionProps {
  category: TagCategoryNode;
  isExpanded: boolean;
  onToggle: () => void;
  activeTagId: string | null;
  onSelectCategory: (id: string) => void;
  onSelectTag: (id: string) => void;
  expandedIds: Set<string>;
  onToggleNode: (id: string) => void;
  treeLabels: {
    expand: (name: string) => string;
    collapse: (name: string) => string;
    selectTag: (path: string) => string;
  };
}

/**
 * One top-level category bucket (Technology, Music, Other, …). The header
 * row is itself a selectable filter ("Technology" alone matches every
 * Technology tag). Children render only when expanded.
 */
function CategorySection({
  category,
  isExpanded,
  onToggle,
  activeTagId,
  onSelectCategory,
  onSelectTag,
  expandedIds,
  onToggleNode,
  treeLabels,
}: CategorySectionProps) {
  const Icon = category.iconName ? ICON_MAP[category.iconName] : Layers;
  const accent = ACCENT_TEXT[category.accent] ?? ACCENT_TEXT.slate;
  const isCategoryActive = activeTagId === category.id;

  return (
    <div className="min-w-0">
      <div
        data-selection-glow={isCategoryActive ? "active" : undefined}
        className={cn(
          "group/tag-row flex items-center gap-1 rounded-md transition-colors",
          isCategoryActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/60",
        )}
      >
        <button
          type="button"
          aria-label={
            isExpanded ? treeLabels.collapse(category.name) : treeLabels.expand(category.name)
          }
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-transform",
            "hover:text-foreground",
            isExpanded && "rotate-90",
          )}
        >
          <ChevronRightSolid />
        </button>
        <button
          type="button"
          onClick={() => onSelectCategory(category.id)}
          aria-pressed={isCategoryActive}
          aria-label={treeLabels.selectTag(category.name)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-md py-1 pr-1.5 text-left text-[13px] outline-none transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring/50",
            isCategoryActive ? "font-medium text-foreground" : "font-medium text-foreground",
          )}
          title={category.description ?? category.name}
        >
          <Icon className={cn("h-3.5 w-3.5 shrink-0", accent)} />
          <span className="min-w-0 flex-1 truncate">{category.name}</span>
          <TagCountBadge count={category.totalCount} active={isCategoryActive} />
        </button>
      </div>

      {isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {category.roots.map((node) => (
            <TagTreeNode
              key={node.id}
              node={node}
              depth={1}
              activeTagId={activeTagId}
              expandedIds={expandedIds}
              onSelect={onSelectTag}
              onToggle={onToggleNode}
              labels={treeLabels}
            />
          ))}
          {category.roots.length === 0 && (
            <p className="px-2 py-1 pl-7 text-[11px] italic text-muted-foreground/70">—</p>
          )}
        </div>
      )}
    </div>
  );
}

function TagPanelEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/**
 * Local, dependency-free chevron so we don't pull in a duplicate icon
 * import path through the existing lucide tree-shake budget.
 */
function ChevronRightSolid() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
