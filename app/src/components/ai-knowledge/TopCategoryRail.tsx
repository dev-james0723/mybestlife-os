"use client";

import { useMemo } from "react";
import {
  OSStatusRail,
  type OSStatusRailItem,
} from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  PROMPT_TOP_CATEGORIES,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptTopCategory,
} from "@/types/prompt";

interface TopCategoryRailProps {
  prompts: Array<LibraryPrompt | CustomPrompt>;
  activeTopCategory: PromptTopCategory | null;
  onSelect: (top: PromptTopCategory | null) => void;
}

const ALL_CATEGORIES = "__all__";

type TopCategoryRailId = PromptTopCategory | typeof ALL_CATEGORIES;

/**
 * Horizontally scrollable strip of the 12 curated top-level categories.
 * Counts reflect the currently-active tab's prompts so users can see which
 * buckets have content at a glance.
 */
export function TopCategoryRail({
  prompts,
  activeTopCategory,
  onSelect,
}: TopCategoryRailProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const counts = useMemo(() => {
    const map = new Map<PromptTopCategory, number>();
    for (const p of prompts) {
      map.set(p.top_category, (map.get(p.top_category) ?? 0) + 1);
    }
    return map;
  }, [prompts]);

  const items = useMemo<Array<OSStatusRailItem<TopCategoryRailId>>>(
    () => [
      {
        id: ALL_CATEGORIES,
        label: ui.filters.allCategories,
        count: prompts.length,
      },
      ...PROMPT_TOP_CATEGORIES.map((top) => {
        const count = counts.get(top) ?? 0;
        return {
          id: top,
          label: ui.topCategoryLabels[top],
          count,
          disabled: count === 0 && activeTopCategory !== top,
        };
      }),
    ],
    [activeTopCategory, counts, prompts.length, ui.filters.allCategories, ui.topCategoryLabels],
  );

  const value: TopCategoryRailId = activeTopCategory ?? ALL_CATEGORIES;

  return (
    <OSStatusRail
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next === ALL_CATEGORIES || next === activeTopCategory) {
          onSelect(null);
          return;
        }
        onSelect(next);
      }}
      ariaLabel={ui.filters.allCategories}
      allowReselect
      layoutId="ai-knowledge-category-active-pill"
      selectionGlow
    />
  );
}
