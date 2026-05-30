"use client";

import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Clock,
  Flame,
  FolderOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskOverviewMetrics } from "@/lib/tasks/task-analytics";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";

export type OverviewMetricKey =
  | "total"
  | "active"
  | "in-progress"
  | "due-today"
  | "overdue"
  | "completed-week"
  | "no-project"
  | "high-priority";

type Cell = {
  key: OverviewMetricKey;
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success" | "accent";
};

const toneClasses: Record<NonNullable<Cell["tone"]>, string> = {
  default: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  success: "text-green-600 dark:text-green-400",
  accent: "text-primary",
};

interface TaskOverviewStripProps {
  metrics: TaskOverviewMetrics;
  copy: TasksCenterUiCopy;
  activeMetric?: OverviewMetricKey | null;
  onSelectMetric?: (key: OverviewMetricKey) => void;
}

export function TaskOverviewStrip({
  metrics,
  copy,
  activeMetric,
  onSelectMetric,
}: TaskOverviewStripProps) {
  const cells: Cell[] = [
    { key: "total", label: copy.overviewTotal, value: metrics.total, icon: Layers },
    { key: "active", label: copy.overviewActive, value: metrics.active, icon: Activity },
    {
      key: "in-progress",
      label: copy.overviewInProgress,
      value: metrics.inProgress,
      icon: Clock,
      tone: "accent",
    },
    {
      key: "due-today",
      label: copy.overviewDueToday,
      value: metrics.dueToday,
      icon: CalendarClock,
      tone: "warning",
    },
    {
      key: "overdue",
      label: copy.overviewOverdue,
      value: metrics.overdue,
      icon: AlertTriangle,
      tone: "danger",
    },
    {
      key: "high-priority",
      label: copy.overviewHighPriority,
      value: metrics.highPriority,
      icon: Flame,
      tone: "warning",
    },
    {
      key: "completed-week",
      label: copy.overviewCompletedWeek,
      value: metrics.completedThisWeek,
      icon: CheckCircle,
      tone: "success",
    },
    {
      key: "no-project",
      label: copy.overviewNoProject,
      value: metrics.noProject,
      icon: FolderOpen,
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-8">
      {cells.map((cell) => {
        const Icon = cell.icon;
        const isActive = activeMetric === cell.key;
        const clickable = Boolean(onSelectMetric);
        return (
          <button
            key={cell.key}
            type="button"
            disabled={!clickable}
            onClick={() => onSelectMetric?.(cell.key)}
            className={cn(
              "flex min-w-[104px] shrink-0 flex-col gap-1 rounded-xl border bg-card px-3 py-2.5 text-left transition-all sm:min-w-0",
              clickable && "hover:border-primary/40 hover:shadow-sm",
              clickable && "cursor-pointer",
              isActive && "border-primary ring-1 ring-primary/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl font-bold tabular-nums tracking-tight">
                {cell.value}
              </span>
              <Icon className={cn("h-4 w-4", toneClasses[cell.tone ?? "default"])} />
            </div>
            <span className="truncate text-xs text-muted-foreground">{cell.label}</span>
          </button>
        );
      })}
    </div>
  );
}
