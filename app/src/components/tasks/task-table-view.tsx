"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Columns3,
  Folder,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { OSControl } from "@/components/ui/os-primitives";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date";
import type { Task } from "@/types/database";
import {
  getTaskPriorityOptions,
  getTaskStatusOptions,
  taskPriorityLabel,
  taskStatusLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import { toTaskViewModel } from "@/lib/tasks/task-view-model";
import { NO_PROJECT_FILTER, type TaskLinkFlags } from "@/lib/tasks/task-filters";
import type { SortDirection, TaskSortKey } from "@/lib/tasks/task-sort";

const COLUMNS_STORAGE_KEY = "tasks:tableColumns";

type ColumnKey =
  | "project"
  | "category"
  | "priority"
  | "status"
  | "deadline"
  | "created"
  | "updated"
  | "tags";

const TOGGLEABLE_COLUMNS: ColumnKey[] = [
  "project",
  "category",
  "priority",
  "status",
  "deadline",
  "created",
  "updated",
  "tags",
];

const SORT_KEY_BY_COLUMN: Partial<Record<ColumnKey | "name", TaskSortKey>> = {
  name: "title",
  priority: "priority",
  status: "status",
  deadline: "due_date",
  created: "created_at",
  updated: "updated_at",
};

type TaskFieldPatch = Record<string, unknown>;

interface TaskTableViewProps {
  tasks: Task[];
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  now: Date;
  projects: { id: string; name: string }[] | undefined;
  sortKey: TaskSortKey;
  sortDirection: SortDirection;
  onColumnSort: (key: TaskSortKey) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTask: (id: string, data: TaskFieldPatch) => void;
  onBulkUpdate: (ids: string[], data: TaskFieldPatch) => void;
  onBulkDelete: (ids: string[]) => void;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
}

function defaultVisibility(): Record<ColumnKey, boolean> {
  return {
    project: true,
    category: true,
    priority: true,
    status: true,
    deadline: true,
    created: true,
    updated: false,
    tags: false,
  };
}

function readStoredVisibility(): Record<ColumnKey, boolean> {
  const fallback = defaultVisibility();
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function columnLabel(key: ColumnKey, centerCopy: TasksCenterUiCopy): string {
  switch (key) {
    case "project":
      return centerCopy.colProject;
    case "category":
      return centerCopy.colCategory;
    case "priority":
      return centerCopy.colPriority;
    case "status":
      return centerCopy.colStatus;
    case "deadline":
      return centerCopy.colDeadline;
    case "created":
      return centerCopy.colCreated;
    case "updated":
      return centerCopy.colUpdated;
    case "tags":
      return centerCopy.colTags;
  }
}

function SortHeader({
  label,
  columnKey,
  sortKey,
  sortDirection,
  onColumnSort,
  className,
}: {
  label: string;
  columnKey: ColumnKey | "name";
  sortKey: TaskSortKey;
  sortDirection: SortDirection;
  onColumnSort: (key: TaskSortKey) => void;
  className?: string;
}) {
  const mapped = SORT_KEY_BY_COLUMN[columnKey];
  if (!mapped) {
    return <span className={className}>{label}</span>;
  }
  const active = sortKey === mapped;
  return (
    <button
      type="button"
      onClick={() => onColumnSort(mapped)}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 rounded-lg transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60",
        active && "text-foreground",
        className,
      )}
    >
      {label}
      {active ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

/** Compact inline select used for in-row status / priority edits. */
function InlineSelect({
  value,
  options,
  onChange,
  renderValue,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  renderValue: (value: string) => ReactNode;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v !== null && v !== value) onChange(String(v));
      }}
      itemToStringLabel={(v) =>
        options.find((o) => o.value === v)?.label ?? String(v)
      }
    >
      <SelectTrigger
        className="h-11 min-h-11 rounded-xl border-0 bg-transparent px-2 shadow-none hover:bg-muted/60 focus:ring-0 [&>svg]:opacity-0 hover:[&>svg]:opacity-60"
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue>
          {(v: string | null) => renderValue((v as string) ?? value)}
        </SelectValue>
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

export function TaskTableView({
  tasks,
  copy,
  centerCopy,
  now,
  projects,
  sortKey,
  sortDirection,
  onColumnSort,
  onOpenTask,
  onUpdateTask,
  onBulkUpdate,
  onBulkDelete,
  getLinkFlags,
}: TaskTableViewProps) {
  void getLinkFlags;
  const [visible, setVisible] = useState<Record<ColumnKey, boolean>>(
    readStoredVisibility,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const toggleColumn = (key: ColumnKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const statusOptions = useMemo(() => getTaskStatusOptions(copy), [copy]);
  const priorityOptions = useMemo(() => getTaskPriorityOptions(copy), [copy]);
  const projectOptions = useMemo(
    () => [
      { value: NO_PROJECT_FILTER, label: centerCopy.projectNone },
      ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [projects, centerCopy.projectNone],
  );

  const taskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const activeSelected = useMemo(
    () => new Set([...selected].filter((id) => taskIds.has(id))),
    [selected, taskIds],
  );
  const allSelected = tasks.length > 0 && activeSelected.size === tasks.length;
  const someSelected = activeSelected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const applyBulk = (patch: TaskFieldPatch) => {
    if (activeSelected.size === 0) return;
    onBulkUpdate([...activeSelected], patch);
  };

  const handleBulkDelete = () => {
    onBulkDelete([...activeSelected]);
    clearSelection();
  };

  const startEditTitle = (task: Task) => {
    setEditingId(task.id);
    setDraftTitle(task.title);
  };

  const commitTitle = (task: Task) => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask(task.id, { title: trimmed });
    }
    setEditingId(null);
  };

  const colSpan = 2 + TOGGLEABLE_COLUMNS.filter((c) => visible[c]).length + 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {activeSelected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {centerCopy.bulkSelected(activeSelected.size)}
            </span>
            <BulkMenu
              label={centerCopy.bulkSetStatus}
              options={statusOptions}
              onSelect={(v) => applyBulk({ status: v })}
            />
            <BulkMenu
              label={centerCopy.bulkSetPriority}
              options={priorityOptions}
              onSelect={(v) => applyBulk({ priority: v })}
            />
            <BulkMenu
              label={centerCopy.bulkSetProject}
              options={projectOptions}
              onSelect={(v) =>
                applyBulk({ project_id: v === NO_PROJECT_FILTER ? null : v })
              }
            />
            <OSControl
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4" />
              {centerCopy.bulkDelete}
            </OSControl>
            <OSControl variant="ghost" onClick={clearSelection}>
              <X className="h-4 w-4" />
              {centerCopy.bulkClear}
            </OSControl>
          </div>
        ) : (
          <span />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<OSControl variant="outline" />}
            aria-label={centerCopy.columns}
          >
            <Columns3 className="h-4 w-4" />
            {centerCopy.columns}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{centerCopy.columns}</DropdownMenuLabel>
            {TOGGLEABLE_COLUMNS.map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={visible[key]}
                onCheckedChange={() => toggleColumn(key)}
                onSelect={(e) => e.preventDefault()}
              >
                {columnLabel(key, centerCopy)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <GlassPanel variant="strong" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={toggleAll}
                    aria-label={centerCopy.selectAll}
                  />
                </th>
                <th className="px-3 py-2.5 font-semibold">
                  <SortHeader
                    label={centerCopy.colName}
                    columnKey="name"
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onColumnSort={onColumnSort}
                  />
                </th>
                {visible.project && (
                  <th className="px-3 py-2.5 font-semibold">
                    {columnLabel("project", centerCopy)}
                  </th>
                )}
                {visible.category && (
                  <th className="px-3 py-2.5 font-semibold">
                    {columnLabel("category", centerCopy)}
                  </th>
                )}
                {visible.priority && (
                  <th className="px-3 py-2.5 font-semibold">
                    <SortHeader
                      label={columnLabel("priority", centerCopy)}
                      columnKey="priority"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onColumnSort={onColumnSort}
                    />
                  </th>
                )}
                {visible.status && (
                  <th className="px-3 py-2.5 font-semibold">
                    <SortHeader
                      label={columnLabel("status", centerCopy)}
                      columnKey="status"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onColumnSort={onColumnSort}
                    />
                  </th>
                )}
                {visible.deadline && (
                  <th className="px-3 py-2.5 font-semibold">
                    <SortHeader
                      label={columnLabel("deadline", centerCopy)}
                      columnKey="deadline"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onColumnSort={onColumnSort}
                    />
                  </th>
                )}
                {visible.created && (
                  <th className="px-3 py-2.5 font-semibold">
                    <SortHeader
                      label={columnLabel("created", centerCopy)}
                      columnKey="created"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onColumnSort={onColumnSort}
                    />
                  </th>
                )}
                {visible.updated && (
                  <th className="px-3 py-2.5 font-semibold">
                    <SortHeader
                      label={columnLabel("updated", centerCopy)}
                      columnKey="updated"
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onColumnSort={onColumnSort}
                    />
                  </th>
                )}
                {visible.tags && (
                  <th className="px-3 py-2.5 font-semibold">
                    {columnLabel("tags", centerCopy)}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const vm = toTaskViewModel(task, now);
                const isSelected = activeSelected.has(task.id);
                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "cursor-pointer border-b border-border/30 align-middle transition-colors last:border-b-0 hover:bg-muted/30",
                      isSelected && "bg-primary/5",
                    )}
                    onClick={() => onOpenTask(task)}
                  >
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(task.id)}
                        aria-label={task.title}
                      />
                    </td>
                    <td className="max-w-[320px] px-3 py-2">
                      {editingId === task.id ? (
                        <Input
                          value={draftTitle}
                          autoFocus
                          className="h-11 min-h-11 rounded-xl"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onBlur={() => commitTitle(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitTitle(task);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          aria-label={centerCopy.inlineEditTitleAria}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="line-clamp-2 text-left font-medium text-foreground hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTitle(task);
                            }}
                          >
                            {task.title}
                          </button>
                          {vm.isAiGenerated && (
                            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                          )}
                        </div>
                      )}
                    </td>
                    {visible.project && (
                      <td className="max-w-[160px] px-3 py-2 text-muted-foreground">
                        {vm.hasProject ? (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <Folder className="h-3 w-3 shrink-0" />
                            <span className="truncate">{task.project?.name}</span>
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground/60">
                            {centerCopy.projectNone}
                          </span>
                        )}
                      </td>
                    )}
                    {visible.category && (
                      <td className="px-3 py-2">
                        {vm.category ? (
                          <Badge variant="outline" className="text-[11px]">
                            {taskCategoryLabel(centerCopy, vm.category)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    )}
                    {visible.priority && (
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <InlineSelect
                          value={task.priority}
                          options={priorityOptions}
                          onChange={(v) => onUpdateTask(task.id, { priority: v })}
                          renderValue={(v) => (
                            <StatusBadge
                              variant="priority"
                              value={v}
                              label={taskPriorityLabel(copy, v as Task["priority"])}
                            />
                          )}
                        />
                      </td>
                    )}
                    {visible.status && (
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <InlineSelect
                          value={task.status}
                          options={statusOptions}
                          onChange={(v) => onUpdateTask(task.id, { status: v })}
                          renderValue={(v) => (
                            <StatusBadge
                              variant="status"
                              value={v}
                              label={taskStatusLabel(copy, v as Task["status"])}
                            />
                          )}
                        />
                      </td>
                    )}
                    {visible.deadline && (
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {task.due_date ? (
                          <span
                            className={cn(
                              vm.isOverdue && "font-medium text-destructive",
                            )}
                          >
                            {formatDateShort(task.due_date)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    )}
                    {visible.created && (
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatDateShort(task.created_at)}
                      </td>
                    )}
                    {visible.updated && (
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {formatDateShort(task.updated_at)}
                      </td>
                    )}
                    {visible.tags && (
                      <td className="max-w-[160px] px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {(task.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-3 py-10 text-center text-sm text-muted-foreground"
                  >
                    {centerCopy.emptyColumnTask}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}

function BulkMenu({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<OSControl variant="outline" />}>
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onSelect={() => onSelect(o.value)}>
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
