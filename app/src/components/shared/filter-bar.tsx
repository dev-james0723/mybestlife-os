"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  List,
  Columns3,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
  value?: string;
};

export type ViewMode = "grid" | "list" | "table" | "kanban" | "calendar";

const viewModeIcons: Record<ViewMode, LucideIcon> = {
  grid: LayoutGrid,
  list: List,
  table: List,
  kanban: Columns3,
  calendar: Calendar,
};

export type FilterBarI18n = {
  searchDefaultPlaceholder: string;
  sortPlaceholder: string;
  /** e.g. (label) => `All ${label}` or `全部${label}` */
  formatAllFilterOption: (filterLabel: string) => string;
};

interface FilterBarProps {
  search?: {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
  };
  filters?: FilterConfig[];
  onFilterChange?: (key: string, value: string) => void;
  sort?: {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  };
  viewModes?: ViewMode[];
  activeViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  /** When set, search / sort / “All …” use localized defaults. */
  i18n?: FilterBarI18n;
}

export function FilterBar({
  search,
  filters,
  onFilterChange,
  sort,
  viewModes,
  activeViewMode,
  onViewModeChange,
  i18n,
}: FilterBarProps) {
  const language = useAppStore((s) => s.language);
  const common = getCommonUiCopy(language);

  return (
    <div
      data-slot="filter-bar"
      className="flex flex-col gap-2 rounded-[1.25rem] border border-slate-200/70 bg-white/68 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] supports-backdrop-filter:backdrop-blur-xl supports-backdrop-filter:backdrop-saturate-150 dark:border-white/10 dark:bg-white/[0.055] sm:flex-row sm:flex-wrap sm:items-center"
    >
      {search && (
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              search.placeholder ?? i18n?.searchDefaultPlaceholder ?? common.searchPlaceholder
            }
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="h-11 min-h-11 rounded-[0.95rem] border-slate-200/80 bg-white/76 pl-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-white/[0.06]"
          />
        </div>
      )}

      {filters?.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value ?? "all"}
          onValueChange={(value) => {
            if (value !== null) onFilterChange?.(filter.key, value);
          }}
        >
          <SelectTrigger className="h-11 min-h-11 w-full rounded-[0.95rem] sm:w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {(i18n?.formatAllFilterOption ?? ((l: string) => `All ${l}`))(
                filter.label,
              )}
            </SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {sort && (
        <Select
          value={sort.value}
          onValueChange={(value) => {
            if (value !== null) sort.onChange(value);
          }}
        >
          <SelectTrigger className="h-11 min-h-11 w-full rounded-[0.95rem] sm:w-[160px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue
              placeholder={i18n?.sortPlaceholder ?? common.sortBy}
            />
          </SelectTrigger>
          <SelectContent>
            {sort.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {viewModes && viewModes.length > 1 && (
        <div className="ml-auto flex w-full items-center gap-1 overflow-x-auto rounded-[1.15rem] border border-slate-200/70 bg-white/58 p-1 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-white/10 dark:bg-white/[0.04] sm:w-auto [&::-webkit-scrollbar]:hidden">
          {viewModes.map((mode) => {
            const Icon = viewModeIcons[mode];
            return (
              <Button
                key={mode}
                variant={activeViewMode === mode ? "secondary" : "ghost"}
                size="sm"
                className="h-11 min-h-11 w-11 shrink-0 rounded-xl p-0"
                onClick={() => onViewModeChange?.(mode)}
                aria-label={common.switchToView(mode)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
