"use client";

import { cn } from "@/lib/utils";
import {
  CAREER_VAULT_CATEGORIES,
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { VaultCategoryFilter } from "@/types/career-vault";

interface CategoryFilterProps {
  value: VaultCategoryFilter;
  onChange: (value: VaultCategoryFilter) => void;
  copy: CareerVaultCopy;
  counts?: Partial<Record<VaultCategoryFilter, number>>;
}

export function CategoryFilter({
  value,
  onChange,
  copy,
  counts,
}: CategoryFilterProps) {
  const pills: Array<{
    key: VaultCategoryFilter;
    label: string;
    emoji: string;
  }> = [
    { key: "all", label: copy.filters.all, emoji: "📁" },
    ...CAREER_VAULT_CATEGORIES.map((c) => ({
      key: c,
      label: copy.categories[c],
      emoji: CAREER_VAULT_CATEGORY_EMOJI[c],
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label={copy.filters.all}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pills.map(({ key, label, emoji }) => {
        const active = value === key;
        const count = counts?.[key];
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              active
                ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            <span aria-hidden>{emoji}</span>
            <span>{label}</span>
            {typeof count === "number" && count > 0 ? (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0 text-[10px] font-semibold tabular-nums",
                  active
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
