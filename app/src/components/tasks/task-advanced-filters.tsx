"use client";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { cn } from "@/lib/utils";
import {
  formatAllFilterLabel,
  getTaskPriorityOptions,
  getTaskStatusOptions,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import {
  NO_PROJECT_FILTER,
  type LinkedEntityFlag,
  type TaskFilterState,
} from "@/lib/tasks/task-filters";
import type {
  DatePresetValue,
  DateRange,
  DeadlineFilterValue,
} from "@/lib/tasks/task-dates";

interface TaskAdvancedFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  filter: TaskFilterState;
  onChange: (patch: Partial<TaskFilterState>) => void;
  onReset: () => void;
  projects: { id: string; name: string }[] | undefined;
  categories: string[];
  tags: string[];
}

type Pill = { value: string; label: string };

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function PillRow({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: Pill[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  const isActive = (value: string) =>
    multi
      ? Array.isArray(selected) && selected.includes(value)
      : selected === value;

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            isActive(opt.value)
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const DEADLINE_VALUES: DeadlineFilterValue[] = [
  "all",
  "today",
  "tomorrow",
  "this-week",
  "next-week",
  "this-month",
  "overdue",
  "none",
  "custom",
];

const DATE_PRESET_VALUES: DatePresetValue[] = [
  "all",
  "today",
  "this-week",
  "this-month",
  "recent",
  "custom",
];

const LINK_FLAGS: LinkedEntityFlag[] = [
  "ai-generated",
  "linked-goal",
  "linked-habit",
  "linked-planner",
  "linked-calendar",
  "linked-knowledge",
  "linked-idea",
];

function deadlineLabel(centerCopy: TasksCenterUiCopy, v: DeadlineFilterValue): string {
  const map: Record<DeadlineFilterValue, string> = {
    all: centerCopy.deadlineAll,
    today: centerCopy.deadlineToday,
    tomorrow: centerCopy.deadlineTomorrow,
    "this-week": centerCopy.deadlineThisWeek,
    "next-week": centerCopy.deadlineNextWeek,
    "this-month": centerCopy.deadlineThisMonth,
    overdue: centerCopy.deadlineOverdue,
    none: centerCopy.deadlineNone,
    custom: centerCopy.deadlineCustom,
  };
  return map[v];
}

function datePresetLabel(centerCopy: TasksCenterUiCopy, v: DatePresetValue): string {
  const map: Record<DatePresetValue, string> = {
    all: centerCopy.dateAll,
    today: centerCopy.dateToday,
    "this-week": centerCopy.dateThisWeek,
    "this-month": centerCopy.dateThisMonth,
    recent: centerCopy.dateRecent,
    custom: centerCopy.dateCustom,
  };
  return map[v];
}

function linkFlagLabel(centerCopy: TasksCenterUiCopy, flag: LinkedEntityFlag): string {
  switch (flag) {
    case "ai-generated":
      return centerCopy.linkedAi;
    case "linked-goal":
      return centerCopy.linkedGoal;
    case "linked-habit":
      return centerCopy.linkedHabit;
    case "linked-planner":
      return centerCopy.linkedPlanner;
    case "linked-calendar":
      return centerCopy.linkedCalendar;
    case "linked-knowledge":
      return centerCopy.linkedKnowledge;
    case "linked-idea":
      return centerCopy.linkedIdea;
    default:
      return flag;
  }
}

function CustomRange({
  range,
  onChange,
  copy,
}: {
  range: DateRange | undefined;
  onChange: (range: DateRange) => void;
  copy: TasksCenterUiCopy;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <span className="mb-1 block text-[11px] text-muted-foreground">
          {copy.customStart}
        </span>
        <DatePickerInput
          value={range?.start ?? ""}
          onChange={(v) => onChange({ ...range, start: v })}
        />
      </div>
      <div className="flex-1">
        <span className="mb-1 block text-[11px] text-muted-foreground">
          {copy.customEnd}
        </span>
        <DatePickerInput
          value={range?.end ?? ""}
          onChange={(v) => onChange({ ...range, end: v })}
        />
      </div>
    </div>
  );
}

export function TaskAdvancedFilters({
  open,
  onOpenChange,
  copy,
  centerCopy,
  filter,
  onChange,
  onReset,
  projects,
  categories,
  tags,
}: TaskAdvancedFiltersProps) {
  const statusOptions: Pill[] = [
    { value: "all", label: formatAllFilterLabel(copy, copy.filterStatus) },
    ...getTaskStatusOptions(copy),
  ];
  const priorityOptions: Pill[] = [
    { value: "all", label: formatAllFilterLabel(copy, copy.filterPriority) },
    ...getTaskPriorityOptions(copy),
  ];
  const projectOptions: Pill[] = [
    { value: "all", label: centerCopy.projectAll },
    { value: NO_PROJECT_FILTER, label: centerCopy.projectNone },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];
  const categoryOptions: Pill[] = [
    { value: "all", label: centerCopy.categoryAll },
    ...categories.map((c) => ({ value: c, label: taskCategoryLabel(centerCopy, c) })),
  ];

  const toggleLinked = (flag: string) => {
    const f = flag as LinkedEntityFlag;
    const has = filter.linked.includes(f);
    onChange({
      linked: has
        ? filter.linked.filter((x) => x !== f)
        : [...filter.linked, f],
    });
  };

  const toggleTag = (tag: string) => {
    const has = filter.tags.includes(tag);
    onChange({
      tags: has ? filter.tags.filter((t) => t !== tag) : [...filter.tags, tag],
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{centerCopy.filtersTitle}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4">
          <FilterSection label={copy.filterStatus}>
            <PillRow
              options={statusOptions}
              selected={filter.status}
              onSelect={(v) => onChange({ status: v as TaskFilterState["status"] })}
            />
          </FilterSection>

          <FilterSection label={copy.filterPriority}>
            <PillRow
              options={priorityOptions}
              selected={filter.priority}
              onSelect={(v) =>
                onChange({ priority: v as TaskFilterState["priority"] })
              }
            />
          </FilterSection>

          <FilterSection label={centerCopy.quickFilterProject}>
            <PillRow
              options={projectOptions}
              selected={filter.project}
              onSelect={(v) => onChange({ project: v })}
            />
          </FilterSection>

          {categories.length > 0 && (
            <FilterSection label={centerCopy.filterCategory}>
              <PillRow
                options={categoryOptions}
                selected={filter.category}
                onSelect={(v) => onChange({ category: v })}
              />
            </FilterSection>
          )}

          <FilterSection label={centerCopy.filterDeadline}>
            <PillRow
              options={DEADLINE_VALUES.map((v) => ({
                value: v,
                label: deadlineLabel(centerCopy, v),
              }))}
              selected={filter.deadline}
              onSelect={(v) =>
                onChange({ deadline: v as DeadlineFilterValue })
              }
            />
            {filter.deadline === "custom" && (
              <CustomRange
                range={filter.deadlineRange}
                onChange={(r) => onChange({ deadlineRange: r })}
                copy={centerCopy}
              />
            )}
          </FilterSection>

          <FilterSection label={centerCopy.filterCreated}>
            <PillRow
              options={DATE_PRESET_VALUES.map((v) => ({
                value: v,
                label: datePresetLabel(centerCopy, v),
              }))}
              selected={filter.created}
              onSelect={(v) => onChange({ created: v as DatePresetValue })}
            />
            {filter.created === "custom" && (
              <CustomRange
                range={filter.createdRange}
                onChange={(r) => onChange({ createdRange: r })}
                copy={centerCopy}
              />
            )}
          </FilterSection>

          <FilterSection label={centerCopy.filterUpdated}>
            <PillRow
              options={DATE_PRESET_VALUES.map((v) => ({
                value: v,
                label: datePresetLabel(centerCopy, v),
              }))}
              selected={filter.updated}
              onSelect={(v) => onChange({ updated: v as DatePresetValue })}
            />
            {filter.updated === "custom" && (
              <CustomRange
                range={filter.updatedRange}
                onChange={(r) => onChange({ updatedRange: r })}
                copy={centerCopy}
              />
            )}
          </FilterSection>

          <FilterSection label={centerCopy.filterLinked}>
            <PillRow
              options={LINK_FLAGS.map((f) => ({
                value: f,
                label: linkFlagLabel(centerCopy, f),
              }))}
              selected={filter.linked}
              onSelect={toggleLinked}
              multi
            />
          </FilterSection>

          <FilterSection label={centerCopy.filterTags}>
            {tags.length > 0 ? (
              <PillRow
                options={tags.map((t) => ({ value: t, label: `#${t}` }))}
                selected={filter.tags}
                onSelect={toggleTag}
                multi
              />
            ) : (
              <p className="text-xs text-muted-foreground">{centerCopy.noTags}</p>
            )}
          </FilterSection>
        </div>

        <SheetFooter className="flex-row justify-between gap-2">
          <Button variant="ghost" onClick={onReset}>
            {centerCopy.reset}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{centerCopy.apply}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
