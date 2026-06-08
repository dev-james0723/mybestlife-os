"use client";

import { useMemo } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OSControl, OSSegmentedControl } from "@/components/ui/os-primitives";
import {
  filterHorizontalScrollClassName,
  filterSearchControlClassName,
} from "@/components/shared/filter-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  PROMPT_TOP_CATEGORIES,
  pickLocalizedText,
  type PromptCategory,
  type PromptTopCategory,
} from "@/types/prompt";
import type { PromptLayout } from "@/stores/prompt-store";

interface AiKnowledgeFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;

  activeTopCategory: PromptTopCategory | null;
  onTopCategoryChange: (top: PromptTopCategory | null) => void;

  activeSubCategorySlug: string | null;
  onSubCategoryChange: (slug: string | null) => void;

  activeTag: string | null;
  onTagChange: (tag: string | null) => void;

  availableTags: string[];
  categories: PromptCategory[];

  layout: PromptLayout;
  onLayoutChange: (layout: PromptLayout) => void;

  onClear: () => void;

  onOpenPalette?: () => void;
}

const ALL_VALUE = "__all__";

export function AiKnowledgeFilterBar({
  searchQuery,
  onSearchChange,
  activeTopCategory,
  onTopCategoryChange,
  activeSubCategorySlug,
  onSubCategoryChange,
  activeTag,
  onTagChange,
  availableTags,
  categories,
  layout,
  onLayoutChange,
  onClear,
  onOpenPalette,
}: AiKnowledgeFilterBarProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const subCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.parent_slug !== null &&
          (!activeTopCategory || c.top_category === activeTopCategory),
      ),
    [categories, activeTopCategory],
  );

  const hasActiveFilters =
    searchQuery.length > 0 ||
    activeTopCategory !== null ||
    activeSubCategorySlug !== null ||
    activeTag !== null;

  const layoutOptions = [
    {
      id: "grid" as const,
      label: ui.filters.layoutGrid,
      icon: LayoutGrid,
      ariaLabel: ui.filters.layoutGrid,
    },
    {
      id: "list" as const,
      label: ui.filters.layoutList,
      icon: List,
      ariaLabel: ui.filters.layoutList,
    },
  ];

  return (
    <div className={filterHorizontalScrollClassName}>
      <div className={`${filterSearchControlClassName} lg:max-w-md`}>
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={ui.filters.searchPlaceholder}
          className="h-11 pl-9 sm:h-8"
          aria-label={ui.filters.searchPlaceholder}
        />
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label={ui.header.commandPaletteHint}
            className="absolute right-2 top-1/2 hidden min-h-8 min-w-11 -translate-y-1/2 items-center justify-center gap-0.5 rounded border bg-muted px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted/70 sm:inline-flex"
          >
            {ui.header.commandPaletteShortcut}
          </button>
        )}
      </div>

      <Select
        value={activeTopCategory ?? ALL_VALUE}
        onValueChange={(v) =>
          onTopCategoryChange(v === ALL_VALUE ? null : (v as PromptTopCategory))
        }
      >
        <SelectTrigger
          data-selection-glow={activeTopCategory ? "active" : undefined}
          className="!h-11 w-[200px] shrink-0 sm:!h-8"
        >
          <SelectValue placeholder={ui.filters.allCategories} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{ui.filters.allCategories}</SelectItem>
          {PROMPT_TOP_CATEGORIES.map((top) => (
            <SelectItem key={top} value={top}>
              {ui.topCategoryLabels[top]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {subCategories.length > 0 && (
        <Select
          value={activeSubCategorySlug ?? ALL_VALUE}
          onValueChange={(v) =>
            onSubCategoryChange(v === ALL_VALUE ? null : v)
          }
        >
          <SelectTrigger
            data-selection-glow={activeSubCategorySlug ? "active" : undefined}
            className="!h-11 w-[200px] shrink-0 sm:!h-8"
          >
            <SelectValue placeholder={ui.filters.allSubcategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {ui.filters.allSubcategories}
            </SelectItem>
            {subCategories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {pickLocalizedText(c.name_i18n, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {availableTags.length > 0 && (
        <Select
          value={activeTag ?? ALL_VALUE}
          onValueChange={(v) => onTagChange(v === ALL_VALUE ? null : v)}
        >
          <SelectTrigger
            data-selection-glow={activeTag ? "active" : undefined}
            className="!h-11 w-[160px] shrink-0 sm:!h-8"
          >
            <SelectValue placeholder={ui.filters.tagFilterPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              {ui.filters.tagFilterPlaceholder}
            </SelectItem>
            {availableTags.slice(0, 120).map((tag) => (
              <SelectItem key={tag} value={tag}>
                #{tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <OSControl
          size="sm"
          onClick={onClear}
          className="shrink-0 gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          {ui.filters.clearFilters}
        </OSControl>
      )}

      <OSSegmentedControl
        items={layoutOptions}
        value={layout}
        onValueChange={onLayoutChange}
        ariaLabel={`${ui.filters.layoutGrid} / ${ui.filters.layoutList}`}
        className="shrink-0 lg:ml-auto lg:w-auto"
        labelMode="sr-only"
        layoutId="ai-knowledge-layout-active-pill"
      />
    </div>
  );
}
