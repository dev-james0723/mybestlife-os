"use client";

import { ChevronDown, Loader2, RefreshCw, Search, Shrink, StretchHorizontal } from "lucide-react";
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
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRegenerate: () => void;
  regenerateBusy: boolean;
  onToggleBranch: () => void;
  branchToggleDisabled: boolean;
};

const btn =
  "inline-flex touch-manipulation items-center justify-center gap-1 rounded-lg border border-white/12 bg-black/50 px-2 py-1.5 text-[10px] font-medium text-white/80 transition hover:border-[#C8E53A]/35 hover:text-white sm:text-[11px]";

export function MindMapToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onFitView,
  onExpandAll,
  onCollapseAll,
  onRegenerate,
  regenerateBusy,
  onToggleBranch,
  branchToggleDisabled,
}: MindMapToolbarProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/55 p-2 shadow-lg backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[120px] flex-1 basis-[140px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-lg border border-white/10 bg-black/60 py-1 pl-8 pr-2 text-[11px] text-white placeholder:text-white/35 outline-none focus:border-[#C8E53A]/40"
            aria-label="Search concepts"
          />
        </div>
        <button type="button" className={btn} onClick={onFitView}>
          Fit view
        </button>
        <button type="button" className={btn} onClick={onExpandAll} title="Expand all branches">
          <StretchHorizontal className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Expand</span>
        </button>
        <button type="button" className={btn} onClick={onCollapseAll} title="Collapse branches">
          <Shrink className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Collapse</span>
        </button>
        <button
          type="button"
          className={cn(btn, branchToggleDisabled && "opacity-40")}
          disabled={branchToggleDisabled}
          onClick={onToggleBranch}
          title="Expand or collapse this node branch"
        >
          <ChevronDown className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Branch</span>
        </button>
        <button
          type="button"
          className={cn(btn, "border-[#C8E53A]/30 text-[#d4f06a]")}
          disabled={regenerateBusy}
          onClick={onRegenerate}
        >
          {regenerateBusy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" aria-hidden />}
          <span className="hidden sm:inline">Regenerate</span>
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onTypeFilterChange(f.id)}
            className={cn(
              "touch-manipulation rounded-md px-2 py-1 text-[9px] font-medium sm:text-[10px]",
              typeFilter === f.id ? "bg-[#C8E53A] text-black" : "bg-white/5 text-white/65 hover:bg-white/10",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
