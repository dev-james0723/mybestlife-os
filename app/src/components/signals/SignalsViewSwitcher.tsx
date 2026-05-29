"use client";

import { LayoutGrid, Newspaper, Rows3, Table2, GalleryHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SignalsViewMode } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

const VIEW_ORDER: SignalsViewMode[] = ["editorial", "grid", "table", "compact", "gallery"];

const VIEW_ICON: Record<SignalsViewMode, typeof Newspaper> = {
  editorial: Newspaper,
  grid: LayoutGrid,
  table: Table2,
  compact: Rows3,
  gallery: GalleryHorizontal,
};

/** Segmented control for the page view mode (persisted in prefs). */
export function SignalsViewSwitcher({
  value,
  onChange,
  copy,
  className,
}: {
  value: SignalsViewMode;
  onChange: (mode: SignalsViewMode) => void;
  copy: SignalsUiCopy;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={copy.views.label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/60 p-0.5",
        className,
      )}
    >
      {VIEW_ORDER.map((mode) => {
        const Icon = VIEW_ICON[mode];
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            title={copy.views.modes[mode]}
            aria-label={copy.views.modes[mode]}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{copy.views.modes[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
