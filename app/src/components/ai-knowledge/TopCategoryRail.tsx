"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
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

  return (
    <div className="relative -mx-1">
      <div
        className="flex items-center gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Top category filter"
      >
        <CategoryChip
          label={ui.filters.allCategories}
          count={prompts.length}
          active={activeTopCategory === null}
          onClick={() => onSelect(null)}
        />
        {PROMPT_TOP_CATEGORIES.map((top) => {
          const count = counts.get(top) ?? 0;
          return (
            <CategoryChip
              key={top}
              label={ui.topCategoryLabels[top]}
              count={count}
              active={activeTopCategory === top}
              onClick={() => onSelect(activeTopCategory === top ? null : top)}
              disabled={count === 0 && activeTopCategory !== top}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CategoryChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
  disabled,
}: CategoryChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-background hover:text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-[10px] leading-4",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
