"use client";

import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  activeFilterChips,
  countActiveFilters,
  isDefaultFilter,
  removeFilterChip,
  TYPE_FACET_ORDER,
  type ActiveFilterChip,
} from "@/lib/signals/filters";
import type {
  SignalMediaType,
  SignalRegionFacet,
  SignalRelevanceFacet,
  SignalSourceFacet,
  SignalsFilterState,
  SignalTimeFacet,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

export function chipLabel(chip: ActiveFilterChip, copy: SignalsUiCopy): string {
  switch (chip.kind) {
    case "type":
      return copy.filters.type[chip.value as keyof typeof copy.filters.type] ?? chip.value;
    case "topic":
      return chip.value;
    case "mediaType":
      return copy.filters.media[chip.value as SignalMediaType] ?? chip.value;
    case "region":
      return copy.filters.region[chip.value as SignalRegionFacet] ?? chip.value;
    case "source":
      return copy.filters.source[chip.value as SignalSourceFacet] ?? chip.value;
    case "time":
      return copy.filters.time[chip.value as SignalTimeFacet] ?? chip.value;
    case "relevance":
      return copy.filters.relevance[chip.value as SignalRelevanceFacet] ?? chip.value;
    case "muted":
      return copy.filters.excludeMuted;
    default:
      return chip.value;
  }
}

/**
 * Top filter bar (§ filters): a single-select pill row over the whole pool, a
 * Filters button (opens the advanced drawer, with an active-count badge), and a
 * removable active-chip row with clear-all. Deterministic, no network.
 */
export function SignalsFilterBar({
  filter,
  onChange,
  onClear,
  onOpenDrawer,
  copy,
  className,
}: {
  filter: SignalsFilterState;
  onChange: (next: SignalsFilterState) => void;
  onClear: () => void;
  onOpenDrawer: () => void;
  copy: SignalsUiCopy;
  className?: string;
}) {
  const activeCount = countActiveFilters(filter);
  const chips = activeFilterChips(filter);
  const hasActive = !isDefaultFilter(filter);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div
          className="-mx-1 flex flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={copy.filters.groups.type}
        >
          {TYPE_FACET_ORDER.map((type) => {
            const active = filter.type === type;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange({ ...filter, type })}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {copy.filters.type[type]}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenDrawer}
          aria-label={copy.filters.button}
          className="shrink-0"
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">{copy.filters.button}</span>
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange(removeFilterChip(filter, chip))}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {chipLabel(chip, copy)}
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {copy.filters.clearAll}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
