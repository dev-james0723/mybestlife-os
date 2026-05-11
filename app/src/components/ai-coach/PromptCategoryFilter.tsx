"use client";

import { cn } from "@/lib/utils";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import type {
  CareerCoachCategoryFilter,
  PromptCategory,
} from "@/types/ai-coach";

const CATEGORY_EMOJI: Record<PromptCategory, string> = {
  resume: "📄",
  interview: "🎤",
  discovery: "🧭",
  transition: "🔄",
  growth: "📚",
  branding: "✍️",
  application: "📬",
  other: "💡",
};

interface Props {
  copy: AICoachCopy;
  selected: CareerCoachCategoryFilter;
  counts: Record<PromptCategory | "all", number>;
  onSelect: (c: CareerCoachCategoryFilter) => void;
}

export function PromptCategoryFilter({
  copy,
  selected,
  counts,
  onSelect,
}: Props) {
  const items: Array<{
    id: CareerCoachCategoryFilter;
    label: string;
    emoji?: string;
  }> = [
    { id: "all", label: copy.allCategoriesLabel },
    ...Object.entries(copy.categories).map(([id, label]) => ({
      id: id as PromptCategory,
      label,
      emoji: CATEGORY_EMOJI[id as PromptCategory],
    })),
  ];

  return (
    <nav
      aria-label={copy.categoriesHeader}
      className="-mx-4 overflow-x-auto px-4"
    >
      <ul className="flex min-w-full items-center gap-2 pb-1">
        {items.map(({ id, label, emoji }) => {
          const count = counts[id] ?? 0;
          const active = selected === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-transparent bg-foreground text-background"
                    : "border-border bg-background text-foreground/70 hover:border-foreground/30 hover:text-foreground",
                )}
              >
                {emoji ? <span aria-hidden>{emoji}</span> : null}
                <span>{label}</span>
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px]",
                    active
                      ? "bg-background/20 text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
