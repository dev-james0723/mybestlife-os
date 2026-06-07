"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeSequentialSchedule } from "@/lib/daily-planner/plan-schedule-math";
import { getSessionActualMinutes } from "@/lib/daily-planner/focus/review-metrics";
import type { DailyPlanTask, PlannerFocusSession, Task } from "@/types/database";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import { PlannerGoogleSyncDot } from "@/components/daily-planner/PlannerGoogleSyncDot";

/** One grid row = 10 minutes (one “block”), matches planner block model */
const DEFAULT_BLOCK_MINUTES = 10;
/** Tall enough for title + meta + vertical padding on single-block cards */
const ROW_HEIGHT_PX = 72;
const BLOCK_INSET_PX = 4;

const TASK_COLOR_PALETTE = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#10b981",
  "#f97316",
  "#3b82f6",
  "#ef4444",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
  "#e879f9",
  "#fb923c",
  "#34d399",
  "#60a5fa",
];

function getPlanTaskColor(index: number): string {
  const len = TASK_COLOR_PALETTE.length;
  const color = TASK_COLOR_PALETTE[index % len];
  const prev = index > 0 ? TASK_COLOR_PALETTE[(index - 1) % len] : null;
  if (color === prev) {
    return TASK_COLOR_PALETTE[(index + 1) % len];
  }
  return color;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Y-axis labels: zero-padded 24h (e.g. 06:10) like reference UI */
function formatAxisTime(totalMin: number): string {
  const wrapped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimelineViewProps {
  startTime: string;
  endTime: string;
  tasks: DailyPlanTask[];
  selectedDate: Date;
  allTasks: Task[];
  scheduleTitle: string;
  formatTime12: (totalMin: number) => string;
  fmtBlocks: (blocks: number) => string;
  untitledTask: string;
  taskCardBlockCount: (blocks: number) => string;
  onTaskClick?: (planTask: DailyPlanTask) => void;
  onStartFocus?: (planTask: DailyPlanTask) => void;
  blockMinutes?: number;
  /** When set with `plannerCopy`, shows subtle Google Calendar sync dots on task cards. */
  taskSyncStatusByPlannerId?: Record<string, string>;
  focusSessionsByPlannerTaskId?: Record<string, PlannerFocusSession[]>;
  activeFocusSessionId?: string | null;
  showActualOverlay?: boolean;
  plannerCopy?: DailyPlannerUiCopy;
  /**
   * `1` when End Time wraps past midnight, `0` otherwise. Used to size the timeline so
   * cross-day plans render as one continuous track instead of an empty grid.
   */
  endDayOffset?: number;
  /** Compact "+1 day" suffix for axis labels that fall on the next calendar day. */
  nextDayBadge?: string;
}

type TaskLayout = {
  task: DailyPlanTask;
  index: number;
  topPx: number;
  heightPx: number;
  startMin: number;
  endMin: number;
  color: string;
};

export function TimelineView({
  startTime,
  endTime,
  tasks,
  selectedDate,
  allTasks: _allTasks,
  scheduleTitle,
  formatTime12,
  fmtBlocks,
  untitledTask,
  taskCardBlockCount,
  onTaskClick,
  blockMinutes: blockMinutesProp,
  endDayOffset = 0,
  nextDayBadge,
  taskSyncStatusByPlannerId,
  plannerCopy,
  focusSessionsByPlannerTaskId,
  activeFocusSessionId,
  showActualOverlay = false,
  onStartFocus,
}: TimelineViewProps) {
  const blockMinutes = blockMinutesProp ?? DEFAULT_BLOCK_MINUTES;
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks],
  );

  const { startMinute, rowCount, trackHeightPx } = useMemo(() => {
    const sm = parseTimeToMinutes(startTime);
    const emRaw = parseTimeToMinutes(endTime) + endDayOffset * 24 * 60;
    const dur = Math.max(0, emRaw - sm);
    const slots = Math.max(1, Math.ceil(dur / blockMinutes));
    const planned = sortedTasks.reduce(
      (acc, t) => acc + Math.max(t.blocks ?? 0, 1),
      0,
    );
    const rows = Math.max(slots, planned, 1);
    return {
      startMinute: sm,
      rowCount: rows,
      trackHeightPx: rows * ROW_HEIGHT_PX,
    };
  }, [startTime, endTime, endDayOffset, sortedTasks, blockMinutes]);

  const slotStarts = useMemo(() => {
    return Array.from({ length: rowCount }, (_, i) => startMinute + i * blockMinutes);
  }, [rowCount, startMinute, blockMinutes]);

  const planDateForSchedule = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );

  const taskLayouts = useMemo((): TaskLayout[] => {
    const schedule = computeSequentialSchedule(
      planDateForSchedule,
      startTime,
      sortedTasks,
      blockMinutes,
    );
    let cumBlocks = 0;
    return schedule.map((row, index) => {
      const layoutBlocks = Math.max(
        1,
        Math.round((row.endMinFromPlanMidnight - row.startMinFromPlanMidnight) / blockMinutes),
      );
      const topPx = cumBlocks * ROW_HEIGHT_PX;
      cumBlocks += layoutBlocks;
      return {
        task: row.task,
        index,
        topPx,
        heightPx: layoutBlocks * ROW_HEIGHT_PX,
        startMin: row.startMinFromPlanMidnight,
        endMin: row.endMinFromPlanMidnight,
        color: getPlanTaskColor(index),
      };
    });
  }, [sortedTasks, startTime, blockMinutes, planDateForSchedule]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight">
          {scheduleTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="flex min-w-0 border-t border-border/60">
          {/* Time column — one label per 10-minute row */}
          <div
            className="w-[4.25rem] shrink-0 border-r border-border/60 bg-muted/20"
            style={{ height: trackHeightPx }}
          >
            {slotStarts.map((min, i) => {
              const isNextDay = min >= 24 * 60;
              return (
                <div
                  key={`${min}-${i}`}
                  className={cn(
                    "flex items-start justify-end gap-1 pr-2 pt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground",
                    isNextDay && "text-violet-600/90 dark:text-violet-300/90",
                  )}
                  style={{ height: ROW_HEIGHT_PX }}
                >
                  <span>{formatAxisTime(min)}</span>
                  {isNextDay && nextDayBadge ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">
                      {nextDayBadge}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Track: empty 10-min rows + absolutely positioned tasks */}
          <div
            className="relative min-w-0 flex-1 bg-muted/10"
            style={{ height: trackHeightPx }}
          >
            {slotStarts.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "absolute left-0 right-0 border-b border-border/40",
                  i % 2 === 0 ? "bg-background/40" : "bg-muted/5",
                )}
                style={{ top: i * ROW_HEIGHT_PX, height: ROW_HEIGHT_PX }}
              />
            ))}

            {taskLayouts.map((layout) => {
              const blocks = layout.task.blocks ?? 0;
              const isCompactBlock = blocks <= 1;
              const durLabel = fmtBlocks(blocks);
              const plannerTaskId = layout.task.plannerTaskId;
              const focusSessions =
                plannerTaskId ? focusSessionsByPlannerTaskId?.[plannerTaskId] ?? [] : [];
              const activeForTask = focusSessions.some((session) => session.id === activeFocusSessionId);
              const actualMinutes = focusSessions.reduce(
                (sum, session) => sum + getSessionActualMinutes(session),
                0,
              );
              const plannedMinutes = Math.max(1, blocks) * blockMinutes;

              return (
                <div
                  key={`${layout.task.taskName}-${layout.index}-${layout.startMin}`}
                  className={cn(
                    "absolute left-2.5 right-2.5 z-[1] flex min-h-0 min-w-0 flex-col items-center justify-center rounded-xl border text-center transition-[box-shadow,transform]",
                    isCompactBlock
                      ? "gap-1 px-3 py-3"
                      : "gap-1.5 px-4 py-3.5",
                    onTaskClick &&
                      "cursor-pointer hover:shadow-md hover:ring-1 hover:ring-ring/40 active:scale-[0.99]",
                    activeForTask && "ring-2 ring-emerald-400/70",
                  )}
                  style={{
                    top: layout.topPx + BLOCK_INSET_PX,
                    height: Math.max(
                      layout.heightPx - BLOCK_INSET_PX * 2,
                      ROW_HEIGHT_PX - BLOCK_INSET_PX * 2,
                    ),
                    borderColor: layout.color,
                    backgroundColor: `${layout.color}12`,
                    boxShadow: `0 0 0 1px ${layout.color}33`,
                  }}
                  role={onTaskClick ? "button" : undefined}
                  tabIndex={onTaskClick ? 0 : undefined}
                  onClick={() => onTaskClick?.(layout.task)}
                  onKeyDown={(event) => {
                    if (!onTaskClick) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onTaskClick(layout.task);
                    }
                  }}
                >
                  {onStartFocus ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      className="absolute right-2 top-2 h-8 min-h-8 w-8 rounded-lg bg-background/80"
                      aria-label={plannerCopy?.startFocus}
                      onClick={(event) => {
                        event.stopPropagation();
                        onStartFocus(layout.task);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                  <span className="flex w-full min-w-0 items-center justify-center gap-1.5">
                    {plannerCopy ? (
                      <PlannerGoogleSyncDot
                        plannerTaskId={layout.task.plannerTaskId}
                        syncStatus={
                          layout.task.plannerTaskId
                            ? taskSyncStatusByPlannerId?.[layout.task.plannerTaskId]
                            : undefined
                        }
                        copy={plannerCopy}
                        className="shrink-0"
                      />
                    ) : null}
                    <span className="block min-w-0 flex-1 overflow-x-hidden text-ellipsis whitespace-nowrap text-center text-sm font-semibold leading-snug text-foreground">
                      {layout.task.taskName ?? untitledTask}
                    </span>
                  </span>
                  {isCompactBlock ? (
                    <span className="w-full min-w-0 text-center text-[11px] leading-snug text-muted-foreground">
                      {taskCardBlockCount(blocks)} ·{" "}
                      {formatTime12(layout.startMin)} –{" "}
                      {formatTime12(layout.endMin)}
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {" "}
                        · {durLabel}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span className="w-full min-w-0 text-center text-[11px] text-muted-foreground">
                        {taskCardBlockCount(blocks)}
                      </span>
                      <span className="w-full min-w-0 text-center text-[11px] font-medium text-green-600 dark:text-green-400">
                        {formatTime12(layout.startMin)} –{" "}
                        {formatTime12(layout.endMin)}
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {durLabel}
                        </span>
                      </span>
                    </>
                  )}
                  {showActualOverlay && plannerCopy && actualMinutes > 0 ? (
                    <span className="mt-1 max-w-full truncate rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {plannerCopy.actualPlannedLabel(
                        plannerCopy.formatMinutes(actualMinutes),
                        plannerCopy.formatMinutes(plannedMinutes),
                      )}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
