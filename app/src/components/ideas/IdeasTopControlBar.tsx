"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useIdeasStore,
  type IdeasQuickFilter,
  type IdeasSortKey,
} from "@/stores/ideas-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  Clock,
  Columns3,
  LayoutGrid,
  Link2,
  Search,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import { IDEA_CATEGORIES } from "@/lib/ideas/constants";

const QUICK_ORDER: IdeasQuickFilter[] = [
  "recent",
  "unreviewed",
  "hasTags",
  "noTags",
  "linked",
  "unlinked",
  "archived",
];

const QUICK_ICONS: Partial<Record<IdeasQuickFilter, React.ComponentType<{ className?: string }>>> = {
  recent: Clock,
  linked: Link2,
};

const SORT_KEYS: IdeasSortKey[] = [
  "latest",
  "updated",
  "titleAZ",
  "status",
  "category",
  "sourceType",
];

export function IdeasTopControlBar() {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const common = getCommonUiCopy(language);

  const searchQuery = useIdeasStore((s) => s.searchQuery);
  const setSearchQuery = useIdeasStore((s) => s.setSearchQuery);
  const activeSourceFilters = useIdeasStore((s) => s.activeSourceFilters);
  const toggleSourceFilter = useIdeasStore((s) => s.toggleSourceFilter);
  const clearSourceFilters = useIdeasStore((s) => s.clearSourceFilters);
  const activeCategoryFilters = useIdeasStore((s) => s.activeCategoryFilters);
  const toggleCategoryFilter = useIdeasStore((s) => s.toggleCategoryFilter);
  const clearCategoryFilters = useIdeasStore((s) => s.clearCategoryFilters);
  const activeQuickFilters = useIdeasStore((s) => s.activeQuickFilters);
  const toggleQuickFilter = useIdeasStore((s) => s.toggleQuickFilter);
  const sortBy = useIdeasStore((s) => s.sortBy);
  const setSortBy = useIdeasStore((s) => s.setSortBy);
  const currentView = useIdeasStore((s) => s.currentView);
  const setView = useIdeasStore((s) => s.setView);
  const boardGroupBy = useIdeasStore((s) => s.boardGroupBy);
  const setBoardGroupBy = useIdeasStore((s) => s.setBoardGroupBy);

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Keep local input in sync when filters are cleared from the chips row.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- controlled debounce field
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleChange = useCallback(
    (value: string) => {
      setLocalQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSearchQuery(value);
      }, 300);
    },
    [setSearchQuery],
  );

  const viewOptions = [
    { id: "gallery" as const, label: ui.viewLabels.gallery, icon: LayoutGrid },
    { id: "board" as const, label: ui.viewLabels.board, icon: Columns3 },
    { id: "table" as const, label: ui.viewLabels.table, icon: Table },
  ];

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 bg-muted/10 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localQuery}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="h-9 border-border/60 bg-background/80 pl-9 text-sm shadow-sm"
            aria-label={ui.searchPlaceholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as IdeasSortKey)}>
            <SelectTrigger className="h-9 w-full min-w-[9.5rem] border-border/60 bg-background/80 text-xs sm:w-[160px]">
              <SelectValue placeholder={ui.sortLabel} />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((key) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {ui.sortLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <OSSegmentedControl
            items={viewOptions.map((item) => ({
              ...item,
              ariaLabel: common.switchToView(item.label),
            }))}
            value={currentView}
            onValueChange={setView}
            ariaLabel="Ideas view"
            labelMode="desktop"
            layoutId="ideas-view-switcher-active"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full justify-between border-border/60 bg-background/80 text-xs font-normal sm:w-[200px]"
              />
            }
          >
            <span className="truncate">{ui.filtersMenu}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {ui.filterSource}
            </p>
            <DropdownMenuCheckboxItem
              checked={activeSourceFilters.includes("text")}
              onCheckedChange={() => toggleSourceFilter("text")}
            >
              {ui.sourceLabels.text}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeSourceFilters.includes("voice")}
              onCheckedChange={() => toggleSourceFilter("voice")}
            >
              {ui.sourceLabels.voice}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={activeSourceFilters.includes("share")}
              onCheckedChange={() => toggleSourceFilter("share")}
            >
              {ui.sourceLabels.share}
            </DropdownMenuCheckboxItem>
            {activeSourceFilters.length > 0 ? (
              <Button variant="ghost" size="sm" className="mx-2 mt-1 h-7 w-[calc(100%-1rem)] text-xs" onClick={() => clearSourceFilters()}>
                {ui.clearFilters}
              </Button>
            ) : null}
            <p className="mt-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {ui.filterCategory}
            </p>
            {IDEA_CATEGORIES.map((c) => (
              <DropdownMenuCheckboxItem
                key={c}
                checked={activeCategoryFilters.includes(c)}
                onCheckedChange={() => toggleCategoryFilter(c)}
              >
                {ui.categoryLabels[c]}
              </DropdownMenuCheckboxItem>
            ))}
            <Button variant="ghost" size="sm" className="mx-2 mt-1 h-7 w-[calc(100%-1rem)] text-xs" onClick={() => clearCategoryFilters()}>
              {ui.clearFilters}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        {currentView === "board" ? (
          <Select value={boardGroupBy} onValueChange={(v) => v && setBoardGroupBy(v as typeof boardGroupBy)}>
            <SelectTrigger className="h-8 w-full border-border/60 bg-background/80 text-xs sm:w-[180px]">
              <SelectValue placeholder={ui.boardGroupBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status" className="text-xs">
                {ui.groupByStatus}
              </SelectItem>
              <SelectItem value="category" className="text-xs">
                {ui.groupByCategory}
              </SelectItem>
              <SelectItem value="source_type" className="text-xs">
                {ui.groupBySource}
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {QUICK_ORDER.map((f) => {
            const active = activeQuickFilters.includes(f);
            const Icon = QUICK_ICONS[f];
            return (
              <Button
                key={f}
                type="button"
                variant={active ? "secondary" : "outline"}
                size="sm"
                className={cn("h-7 rounded-full px-2.5 text-[11px]", active && "border-transparent")}
                onClick={() => toggleQuickFilter(f)}
                aria-pressed={active}
              >
                {Icon ? <Icon className="mr-1 h-3 w-3" /> : null}
                {ui.quickLabels[f]}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
