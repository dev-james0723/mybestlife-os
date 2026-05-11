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
import { Search, ArrowUpDown, LayoutGrid, List, Columns3, Calendar } from "lucide-react";
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

const viewModeIcons: Record<ViewMode, React.ElementType> = {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {search && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              search.placeholder ?? i18n?.searchDefaultPlaceholder ?? common.searchPlaceholder
            }
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className="pl-9"
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
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[160px]">
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
        <div className="flex items-center border rounded-lg p-1 ml-auto">
          {viewModes.map((mode) => {
            const Icon = viewModeIcons[mode];
            return (
              <Button
                key={mode}
                variant={activeViewMode === mode ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
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
