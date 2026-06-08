"use client";

import { Check, ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { OSControl, OSStatusRail } from "@/components/ui/os-primitives";
import { filterChipScrollClassName } from "@/components/shared/filter-scroll";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  SignalTypeFacet,
} from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

const MOBILE_PRIMARY_TYPES: SignalTypeFacet[] = ["all", "world", "local", "personal"];
const DESKTOP_PRIMARY_TYPES: SignalTypeFacet[] = [
  "all",
  "world",
  "local",
  "personal",
  "markets",
];

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
  const desktopTypeItems = DESKTOP_PRIMARY_TYPES.map((type) => ({
    id: type,
    label: copy.filters.type[type],
  }));
  const overflowTypes = TYPE_FACET_ORDER.filter(
    (type) => !MOBILE_PRIMARY_TYPES.includes(type),
  );
  const mobileMoreActive = !MOBILE_PRIMARY_TYPES.includes(filter.type);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <OSStatusRail<SignalTypeFacet>
          items={desktopTypeItems}
          value={filter.type}
          onValueChange={(type) => onChange({ ...filter, type })}
          ariaLabel={copy.filters.groups.type}
          className="hidden flex-1 md:flex md:[&>button]:basis-0 md:[&>button]:grow"
          layoutId="signals-type-filter-active-desktop"
        />

        <div
          role="tablist"
          aria-label={copy.filters.groups.type}
          className={cn(
            "relative flex min-w-0 flex-1 items-center gap-1 rounded-[1.35rem] border border-slate-300/55 bg-white/72 p-1 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/12 dark:bg-white/[0.055] dark:text-white/78 md:hidden",
          )}
        >
          {MOBILE_PRIMARY_TYPES.map((type) => {
            const active = filter.type === type;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange({ ...filter, type })}
                className={cn(
                  "relative inline-flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-[0.9rem] px-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
                  active
                    ? "bg-lime-300 text-slate-950 shadow-[0_10px_24px_rgba(190,242,100,0.16)]"
                    : "text-slate-600 hover:text-slate-950 dark:text-white/58 dark:hover:text-white",
                )}
              >
                <span className="whitespace-nowrap">{copy.filters.type[type]}</span>
              </button>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileMoreActive}
                  className={cn(
                    "inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-[0.9rem] px-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
                    mobileMoreActive
                      ? "bg-lime-300 text-slate-950 shadow-[0_10px_24px_rgba(190,242,100,0.16)]"
                      : "text-slate-600 hover:text-slate-950 dark:text-white/58 dark:hover:text-white",
                  )}
                >
                  <span className="whitespace-nowrap">
                    {mobileMoreActive ? copy.filters.type[filter.type] : copy.filters.more}
                  </span>
                  <ChevronDown className="size-3.5" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>{copy.filters.groups.type}</DropdownMenuLabel>
              {overflowTypes.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => onChange({ ...filter, type })}
                >
                  <Check className={cn("size-4", filter.type === type ? "opacity-100" : "opacity-0")} />
                  {copy.filters.type[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <OSControl
          osSize="compact"
          onClick={onOpenDrawer}
          aria-label={copy.filters.button}
          className="hidden shrink-0 md:inline-flex"
        >
          <SlidersHorizontal />
          <span className="hidden sm:inline">{copy.filters.button}</span>
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </OSControl>
      </div>

      {chips.length > 0 && (
        <div className={filterChipScrollClassName}>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => onChange(removeFilterChip(filter, chip))}
              className="inline-flex max-w-[min(72vw,220px)] shrink-0 items-center gap-1 rounded-full border border-border/60 bg-muted/40 py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium text-foreground/80 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="truncate">{chipLabel(chip, copy)}</span>
              <X className="h-3 w-3 opacity-60" />
            </button>
          ))}
          {hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {copy.filters.clearAll}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
