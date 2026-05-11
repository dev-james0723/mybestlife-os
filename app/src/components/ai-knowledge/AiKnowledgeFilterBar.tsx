"use client";

import { useMemo } from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={ui.filters.searchPlaceholder}
          className="pl-9"
          aria-label={ui.filters.searchPlaceholder}
        />
        {onOpenPalette && (
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label={ui.header.commandPaletteHint}
            className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-muted/70"
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
        <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[200px]">
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
          <SelectTrigger className="w-[160px]">
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
        >
          <X className="h-3.5 w-3.5" />
          {ui.filters.clearFilters}
        </Button>
      )}

      <div className="sm:ml-auto flex items-center gap-0.5 rounded-lg border p-0.5">
        <button
          type="button"
          onClick={() => onLayoutChange("grid")}
          aria-label={ui.filters.layoutGrid}
          aria-pressed={layout === "grid"}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors",
            layout === "grid"
              ? "bg-muted text-foreground"
              : "hover:text-foreground",
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onLayoutChange("list")}
          aria-label={ui.filters.layoutList}
          aria-pressed={layout === "list"}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors",
            layout === "list"
              ? "bg-muted text-foreground"
              : "hover:text-foreground",
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
