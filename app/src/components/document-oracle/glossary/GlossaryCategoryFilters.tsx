"use client";

import { cn } from "@/lib/utils";

type Props = {
  categories: string[];
  value: string | "all";
  onChange: (c: string | "all") => void;
  allLabel: string;
};

export function GlossaryCategoryFilters(props: Props) {
  const { categories, value, onChange, allLabel } = props;

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Category filter">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full border px-3 py-1 text-[11px] font-semibold transition",
          value === "all"
            ? "border-primary/45 bg-primary/10 text-primary"
            : "border-border/80 bg-background/45 text-muted-foreground hover:border-primary/25 hover:bg-primary/8 hover:text-foreground",
        )}
      >
        {allLabel}
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "max-w-[220px] truncate rounded-full border px-3 py-1 text-[11px] font-semibold transition sm:max-w-xs",
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
