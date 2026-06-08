"use client";

import {
  ArrowDown,
  ArrowUp,
  Columns3,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  Table,
  X,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  OSControl,
  OSIconControl,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import {
  filterHorizontalScrollClassName,
  filterSearchControlClassName,
} from "@/components/shared/filter-scroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  formatAllFilterLabel,
  getTaskPriorityOptions,
  getTaskSortOptions,
  getTaskStatusOptions,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import {
  NO_PROJECT_FILTER,
  type TaskFilterState,
} from "@/lib/tasks/task-filters";
import type { SortDirection, TaskSortKey } from "@/lib/tasks/task-sort";

export type TaskViewMode = "list" | "grid" | "table" | "kanban";

const VIEW_ICONS: Record<TaskViewMode, LucideIcon> = {
  list: List,
  grid: LayoutGrid,
  table: Table,
  kanban: Columns3,
};

type Option = { value: string; label: string };

function QuickSelect({
  value,
  options,
  onChange,
  placeholder,
  width = "w-[150px]",
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  width?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null) onChange(String(v));
      }}
      itemToStringLabel={(v) =>
        options.find((o) => o.value === v)?.label ?? String(v)
      }
    >
      <SelectTrigger className={cn("h-11 min-h-11 shrink-0 rounded-xl", width)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TaskControlBarProps {
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  filter: TaskFilterState;
  onFilterChange: (patch: Partial<TaskFilterState>) => void;
  projects: { id: string; name: string }[] | undefined;
  sortKey: TaskSortKey;
  sortDirection: SortDirection;
  onSortChange: (key: TaskSortKey) => void;
  onToggleSortDirection: () => void;
  viewMode: TaskViewMode;
  viewModes: TaskViewMode[];
  onViewModeChange: (mode: TaskViewMode) => void;
  activeFilterCount: number;
  onOpenAdvanced?: () => void;
  onClearAll?: () => void;
}

export function TaskControlBar({
  copy,
  centerCopy,
  filter,
  onFilterChange,
  projects,
  sortKey,
  sortDirection,
  onSortChange,
  onToggleSortDirection,
  viewMode,
  viewModes,
  onViewModeChange,
  activeFilterCount,
  onOpenAdvanced,
  onClearAll,
}: TaskControlBarProps) {
  const statusOptions: Option[] = [
    { value: "all", label: formatAllFilterLabel(copy, copy.filterStatus) },
    ...getTaskStatusOptions(copy),
  ];
  const priorityOptions: Option[] = [
    { value: "all", label: formatAllFilterLabel(copy, copy.filterPriority) },
    ...getTaskPriorityOptions(copy),
  ];
  const projectOptions: Option[] = [
    { value: "all", label: centerCopy.projectAll },
    { value: NO_PROJECT_FILTER, label: centerCopy.projectNone },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];
  const sortOptions: Option[] = [
    ...getTaskSortOptions(copy),
    { value: "updated_at", label: centerCopy.sortUpdatedAt },
  ];
  const viewLabels: Record<TaskViewMode, string> = {
    list: centerCopy.viewList,
    grid: centerCopy.viewGrid,
    table: centerCopy.viewTable,
    kanban: centerCopy.viewBoard,
  };

  const showClear = activeFilterCount > 0 || filter.search.trim().length > 0;

  return (
    <div className={filterHorizontalScrollClassName}>
      <div className={cn(filterSearchControlClassName, "lg:max-w-sm")}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          placeholder={centerCopy.controlSearchPlaceholder}
          className="h-11 min-h-11 rounded-xl pl-9"
        />
      </div>

      <QuickSelect
        value={filter.status}
        options={statusOptions}
        onChange={(v) => onFilterChange({ status: v as TaskFilterState["status"] })}
        width="w-[140px]"
      />
      <QuickSelect
        value={filter.priority}
        options={priorityOptions}
        onChange={(v) =>
          onFilterChange({ priority: v as TaskFilterState["priority"] })
        }
        width="w-[140px]"
      />
      <QuickSelect
        value={filter.project}
        options={projectOptions}
        onChange={(v) => onFilterChange({ project: v })}
        placeholder={centerCopy.quickFilterProject}
        width="w-[150px]"
      />

      <div className="flex shrink-0 items-center gap-1">
        <QuickSelect
          value={sortKey}
          options={sortOptions}
          onChange={(v) => onSortChange(v as TaskSortKey)}
          placeholder={centerCopy.sortLabel}
          width="w-[140px]"
        />
        <OSIconControl
          onClick={onToggleSortDirection}
          aria-label={centerCopy.toggleSortDirection}
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
        </OSIconControl>
      </div>

      {onOpenAdvanced && (
        <OSControl className="shrink-0" onClick={onOpenAdvanced}>
          <SlidersHorizontal className="h-4 w-4" />
          {centerCopy.advancedFilters}
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </OSControl>
      )}

      {showClear && onClearAll && (
        <OSControl className="shrink-0" onClick={onClearAll}>
          <X className="h-4 w-4" />
          {centerCopy.clearAll}
        </OSControl>
      )}

      {viewModes.length > 1 && (
        <OSSegmentedControl
          items={viewModes.map((mode) => ({
            id: mode,
            label: viewLabels[mode],
            icon: VIEW_ICONS[mode],
            ariaLabel: viewLabels[mode],
          }))}
          value={viewMode}
          onValueChange={onViewModeChange}
          ariaLabel={`${copy.pageTitle} view`}
          className="shrink-0 lg:ml-auto"
          labelMode="sr-only"
          layoutId="tasks-view-mode-pill"
        />
      )}
    </div>
  );
}
