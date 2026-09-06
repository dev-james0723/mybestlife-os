"use client";

import { cn } from "@/lib/utils";
import { filterHorizontalScrollClassName } from "@/components/shared/filter-scroll";

type Props = {
  categories: string[];
  value: string | "all";
  onChange: (c: string | "all") => void;
  allLabel: string;
};

export function GlossaryCategoryFilters(props: Props) {
  const { categories, value, onChange, allLabel } = props;

  return (
    <div className={filterHorizontalScrollClassName} role="tablist" aria-label="Category filter">
      <button data-control-variant="outline" data-selected={value === "all"}
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
          value === "all"
            ? "border-primary/45 bg-primary/10 text-primary"
            : "border-border/80 bg-background/45 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
        )}
      >
        {allLabel}
      </button>
      {categories.map((c) => (
        <button data-control-variant="outline" data-selected={value === c}
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "max-w-[min(72vw,220px)] shrink-0 truncate rounded-full border px-3 py-1 text-[11px] font-semibold transition sm:max-w-xs",
            value === c
              ? "border-primary/45 bg-primary/10 text-primary"
              : "border-border/80 bg-background/45 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
          )}
          title={c}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
