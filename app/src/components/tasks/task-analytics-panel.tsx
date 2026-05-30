"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { TaskAnalytics } from "@/lib/tasks/task-analytics";
import { UNCATEGORIZED_KEY } from "@/lib/tasks/task-analytics";
import {
  taskPriorityLabel,
  taskStatusLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  deadlineColumnLabel,
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import type { Task } from "@/types/database";

interface TaskAnalyticsPanelProps {
  analytics: TaskAnalytics;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
}

type Row = { label: string; count: number };

function BarGroup({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const visible = rows.filter((r) => r.count > 0);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      <div className="space-y-1">
        {visible.map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs" title={r.label}>
              {r.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs tabular-nums">
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TaskAnalyticsPanel({
  analytics,
  copy,
  centerCopy,
}: TaskAnalyticsPanelProps) {
  const pct = Math.round(analytics.completionRate * 100);

  const statusRows: Row[] = useMemo(
    () =>
      (["todo", "in-progress", "done", "cancelled"] as Task["status"][]).map(
        (s) => ({ label: taskStatusLabel(copy, s), count: analytics.byStatus[s] }),
      ),
    [analytics.byStatus, copy],
  );

  const priorityRows: Row[] = useMemo(
    () =>
      (["urgent", "high", "medium", "low"] as Task["priority"][]).map((p) => ({
        label: taskPriorityLabel(copy, p),
        count: analytics.byPriority[p],
      })),
    [analytics.byPriority, copy],
  );

  const deadlineRows: Row[] = useMemo(
    () =>
      (["overdue", "today", "this-week", "later", "none"] as const).map((d) => ({
        label: deadlineColumnLabel(centerCopy, d),
        count: analytics.byDeadline[d],
      })),
    [analytics.byDeadline, centerCopy],
  );

  const categoryRows: Row[] = useMemo(
    () =>
      analytics.byCategory.slice(0, 6).map((c) => ({
        label:
          c.key === UNCATEGORIZED_KEY
            ? centerCopy.categoryNone
            : taskCategoryLabel(centerCopy, c.key),
        count: c.count,
      })),
    [analytics.byCategory, centerCopy],
  );

  const projectRows: Row[] = useMemo(
    () =>
      analytics.projectWorkload.map((p) => ({
        label: p.projectId ? p.name || copy.labelProject : copy.noProject,
        count: p.total,
      })),
    [analytics.projectWorkload, copy],
  );

  const hasTrend = analytics.completionTrend.some((p) => p.completed > 0);

  return (
    <div className="space-y-4">
      {/* Completion rate */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {centerCopy.analyticsCompletionRate}
          </p>
          <p className="text-lg font-semibold tabular-nums">{pct}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500/70"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Completion trend */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">
          {centerCopy.analyticsCompletionTrend}
        </p>
        {hasTrend ? (
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics.completionTrend}
                margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
              >
                <defs>
                  <linearGradient id="taskTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-popover)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#taskTrendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-3 text-center text-xs text-muted-foreground">
            {centerCopy.analyticsEmpty}
          </p>
        )}
      </div>

      <BarGroup title={centerCopy.analyticsByStatus} rows={statusRows} />
      <BarGroup title={centerCopy.analyticsByPriority} rows={priorityRows} />
      <BarGroup title={centerCopy.analyticsByDeadline} rows={deadlineRows} />
      <BarGroup title={centerCopy.analyticsByCategory} rows={categoryRows} />
      <BarGroup title={centerCopy.analyticsProjectWorkload} rows={projectRows} />
    </div>
  );
}
