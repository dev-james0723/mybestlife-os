"use client";

import { useState } from "react";
import { ChevronDown, Focus, Loader2, RefreshCw, Search, Shrink, StretchHorizontal, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type MindMapTypeFilterId =
  | "all"
  | "concepts"
  | "sections"
  | "pages"
  | "glossary"
  | "visuals"
  | "people"
  | "dates"
  | "requirements";

const FILTERS: { id: MindMapTypeFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "concepts", label: "Concepts" },
  { id: "sections", label: "Sections" },
  { id: "pages", label: "Pages" },
  { id: "glossary", label: "Glossary" },
  { id: "visuals", label: "Visuals" },
  { id: "people", label: "People" },
  { id: "dates", label: "Dates" },
  { id: "requirements", label: "Req." },
];

export type MindMapToolbarProps = {
  search: string;
  onSearchChange: (v: string) => void;
  typeFilter: MindMapTypeFilterId;
  onTypeFilterChange: (v: MindMapTypeFilterId) => void;
  onFitView: () => void;
  onResetView: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRegenerate: () => void;
  regenerateBusy: boolean;
  onToggleBranch: () => void;
  branchToggleDisabled: boolean;
};

const btn =
  "inline-flex touch-manipulation shrink-0 items-center justify-center gap-0.5 rounded-lg border border-white/12 bg-black/50 px-1.5 py-1.5 text-[10px] font-medium text-white/80 transition hover:border-primary/35 hover:text-white sm:gap-1 sm:px-2 sm:py-1.5 sm:text-[11px]";

export function MindMapToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onFitView,
  onResetView,
  onExpandAll,
  onCollapseAll,
  onRegenerate,
  regenerateBusy,
  onToggleBranch,
  branchToggleDisabled,
}: MindMapToolbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showSearch = searchOpen || search.trim().length > 0;

  return (
    <div className="flex max-w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-black/55 p-1.5 shadow-lg backdrop-blur-md sm:gap-2 sm:p-2">
      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          className={cn(btn, "sm:hidden")}
          aria-expanded={showSearch}
          aria-label={showSearch ? "Hide search" : "Search"}
          onClick={() => setSearchOpen((o) => !o)}
        >
          <Search className="size-3.5" aria-hidden />
        </button>
        <div
          className={cn(
            "relative min-w-0 flex-1 basis-[140px] max-sm:order-last max-sm:w-full",
            !showSearch && "max-sm:hidden",
          )}
        >
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full min-w-0 rounded-lg border border-white/10 bg-black/60 py-1 pl-8 pr-2 text-[11px] text-white placeholder:text-white/35 outline-none focus:border-primary/40"
            aria-label="Search concepts"
          />
        </div>
        <button type="button" className={btn} onClick={onFitView} title="Fit view">
          <Focus className="size-3.5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Fit</span>
        </button>
        <button type="button" className={btn} onClick={onResetView} title="Reset view">
          <Home className="size-3.5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button type="button" className={btn} onClick={onExpandAll} title="Expand all branches">
          <StretchHorizontal className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Expand</span>
        </button>
        <button type="button" className={btn} onClick={onCollapseAll} title="Collapse branches">
          <Shrink className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Collapse</span>
        </button>
        <button
          type="button"
          className={cn(btn, branchToggleDisabled && "opacity-40")}
          disabled={branchToggleDisabled}
          onClick={onToggleBranch}
          title="Expand or collapse this node branch"
        >
          <ChevronDown className="size-3.5" aria-hidden />
          <span className="hidden md:inline">Branch</span>
        </button>
        <button
          type="button"
          className={cn(btn, "border-primary/30 text-primary")}
          disabled={regenerateBusy}
          onClick={onRegenerate}
          title="Regenerate mind map"
        >
          {regenerateBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" aria-hidden />}
          <span className="hidden sm:inline">Regen</span>
        </button>
        <button
          type="button"
          className={cn(btn, "sm:hidden")}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filters
        </button>
      </div>
      <div
        className={cn(
          "-mx-0.5 flex max-w-full gap-1 overflow-x-auto overflow-y-hidden pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible",
          !filtersOpen && "max-sm:hidden sm:flex",
        )}
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onTypeFilterChange(f.id)}
            className={cn(
              "shrink-0 touch-manipulation rounded-md px-2 py-1 text-[9px] font-medium sm:text-[10px]",
              typeFilter === f.id ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/65 hover:bg-white/10",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
