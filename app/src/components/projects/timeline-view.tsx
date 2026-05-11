"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { CalendarDays, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { getProjectOneSentenceSummary } from "@/lib/projects/card-format";
import {
  formatProjectDate,
  getProjectDateRangeLabelLocalized,
  getProjectStatusLabel,
  parseProjectDate,
} from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

const PRIORITY_BAR: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-slate-500",
};

const BAR_HEIGHT = 52;
const LANE_GAP = 8;
const ROW_PADDING = 10;
const HEADER_HEIGHT = 44;
const DAY_WIDTH_FALLBACK: Record<number, number> = {
  7: 72,
  30: 26,
  90: 10,
};

const ZOOM_PRESETS = [7, 30, 90] as const;

type ZoomPreset = (typeof ZOOM_PRESETS)[number];

function isMobileTimelineViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function getTimelineDayHeaderLabel(
  date: Date,
  index: number,
  zoomPreset: ZoomPreset,
  language: AppLocale,
): string {
  if (zoomPreset === 30 || zoomPreset === 90) {
    const d = date.getDate();
    if (d !== 1 && d !== 10 && d !== 30) return "";
    return formatProjectDate(date, language, "short");
  }
  const showFull =
    index === 0 || date.getDate() === 1 || date.getDay() === 1;
  return showFull
    ? formatProjectDate(date, language, "short")
    : formatProjectDate(date, language, "day");
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function resolveProjectRange(project: Project, fallback: Date): {
  start: Date;
  end: Date;
} {
  const start =
    startOfDay(parseProjectDate(project.start_date) ?? parseProjectDate(project.created_at) ?? fallback);
  const fallbackEnd = addDays(start, 30);
  const parsedEnd = startOfDay(parseProjectDate(project.end_date) ?? fallbackEnd);
  const end = parsedEnd < start ? start : parsedEnd;
  return { start, end };
}

interface TimelineViewProps {
  projects: ProjectWithMeta[];
  onSelectProject: (project: Project) => void;
  ui: ProjectsUiCopy;
}

export function ProjectTimelineView({
  projects,
  onSelectProject,
  ui,
}: TimelineViewProps) {
  const language = useAppStore((s) => s.language);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>(30);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const update = () => setViewportWidth(node.clientWidth);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { minDate, rows, totalDays } = useMemo(() => {
    const today = startOfDay(new Date());
    let min = today;
    let max = today;

    for (const { project } of projects) {
      const { start, end } = resolveProjectRange(project, today);
      if (start < min) min = start;
      if (end > max) max = end;
    }

    const paddedMin = addDays(min, -7);
    const paddedMax = addDays(max, 14);
    const total = Math.max(14, differenceInCalendarDays(paddedMax, paddedMin) + 1);
    const statusOrder: Project["status"][] = [
      "active",
      "planning",
      "paused",
      "completed",
      "cancelled",
    ];

    const rowsOut = statusOrder
      .map((status) => {
        const items = projects
          .filter((item) => item.project.status === status)
          .map((item) => {
            const { start, end } = resolveProjectRange(item.project, today);
            return {
              project: item.project,
              startOffset: differenceInCalendarDays(start, paddedMin),
              endOffset: differenceInCalendarDays(end, paddedMin),
              summary: getProjectOneSentenceSummary(item.project.description),
            };
          })
          .sort((a, b) => a.startOffset - b.startOffset);

        if (items.length === 0) return null;

        const laneEnds: number[] = [];
        const laneItems = items.map((item) => {
          let lane = laneEnds.findIndex((laneEnd) => laneEnd < item.startOffset);
          if (lane === -1) lane = laneEnds.length;
          laneEnds[lane] = item.endOffset;
          return { ...item, lane };
        });

        return {
          status,
          label: getProjectStatusLabel(status, ui),
          laneCount: Math.max(1, laneEnds.length),
          items: laneItems,
        };
      })
      .filter(Boolean) as Array<{
      status: Project["status"];
      label: string;
      laneCount: number;
      items: Array<{
        project: Project;
        startOffset: number;
        endOffset: number;
        summary: string;
        lane: number;
      }>;
    }>;

    return {
      minDate: paddedMin,
      totalDays: total,
      rows: rowsOut,
    };
  }, [projects, ui]);

  const dayWidth = useMemo(() => {
    if (!viewportWidth) return DAY_WIDTH_FALLBACK[zoomPreset];
    const computed = viewportWidth / zoomPreset;
    return Math.max(8, Math.min(80, computed));
  }, [viewportWidth, zoomPreset]);

  const trackWidth = totalDays * dayWidth;
  const todayOffset = Math.max(
    0,
    differenceInCalendarDays(startOfDay(new Date()), minDate),
  );
  const todayLeft = todayOffset * dayWidth + dayWidth / 2;
  const days = useMemo(
    () =>
      Array.from({ length: totalDays }, (_, index) => {
        const date = addDays(minDate, index);
        return {
          index,
          date,
          label: getTimelineDayHeaderLabel(date, index, zoomPreset, language),
        };
      }),
    [language, minDate, totalDays, zoomPreset],
  );

  const exitTimelineExpanded = useCallback(() => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    try {
      screen.orientation?.unlock?.();
    } catch {
      /* iOS / unsupported */
    }
    setTimelineExpanded(false);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (document.fullscreenElement) return;
      setTimelineExpanded((prev) => {
        if (!prev) return prev;
        try {
          screen.orientation?.unlock?.();
        } catch {
          /* noop */
        }
        return false;
      });
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!timelineExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [timelineExpanded]);

  useEffect(() => {
    if (!timelineExpanded) return;
    const el = shellRef.current;
    const run = async () => {
      const mobile = isMobileTimelineViewport();
      if (mobile) {
        try {
          const orientationCtl = screen.orientation as
            | { lock?: (type: string) => Promise<void> }
            | undefined;
          await orientationCtl?.lock?.("landscape");
        } catch {
          /* lock often unsupported or denied */
        }
      }
      if (el?.requestFullscreen) {
        try {
          await el.requestFullscreen();
        } catch {
          /* iOS / user gesture edge cases — overlay still usable */
        }
      }
    };
    void run();
  }, [timelineExpanded]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const target = Math.max(0, todayLeft - viewport.clientWidth / 3);
    viewport.scrollTo({ left: target, behavior: "auto" });
    // Re-center after zoom changes so the visible range still anchors around today.
  }, [dayWidth, todayLeft]);

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative space-y-4",
        timelineExpanded &&
          "fixed inset-0 z-[100] min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-4",
      )}
    >
      {timelineExpanded && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute z-[110] gap-1 shadow-md top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] sm:top-[max(1rem,env(safe-area-inset-top))] sm:right-[max(1rem,env(safe-area-inset-right))]"
          onClick={exitTimelineExpanded}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {ui.timelineFullscreenClose}
        </Button>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3",
          timelineExpanded && "pr-14 sm:pr-16",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted/20 p-1">
            {ZOOM_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={zoomPreset === preset ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-[11px] font-medium tabular-nums"
                onClick={() => setZoomPreset(preset)}
              >
                {preset}D
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTimelineExpanded(true)}
          >
            <Maximize2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {ui.timelineFullscreen}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const viewport = viewportRef.current;
              if (!viewport) return;
              const target = Math.max(0, todayLeft - viewport.clientWidth / 3);
              viewport.scrollTo({ left: target, behavior: "smooth" });
            }}
          >
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {ui.scrollToToday}
          </Button>
        </div>
      </div>

      <div ref={viewportRef} className="overflow-x-auto rounded-xl border bg-card">
        <div
          className="relative"
          style={{ width: `${Math.max(trackWidth, viewportWidth || 0)}px` }}
        >
          <div
            className="pointer-events-none absolute z-30"
            style={{
              left: `${todayLeft}px`,
              top: 0,
              bottom: 0,
            }}
          >
            <div className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow-sm">
              {ui.todayLabel}
            </div>
            <div className="absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-primary/90" />
          </div>

          <div
            className="sticky top-0 z-20 flex border-b bg-card/95 backdrop-blur supports-backdrop-filter:backdrop-blur"
            style={{ height: `${HEADER_HEIGHT}px` }}
          >
            {days.map((day) => (
              <div
                key={day.index}
                className="shrink-0 border-r border-border/40 px-0.5 pb-1 pt-5 text-center text-muted-foreground"
                style={{ width: `${dayWidth}px` }}
              >
                <span
                  className={cn(
                    "block leading-none",
                    day.label ? "truncate" : "min-h-[1em]",
                    dayWidth < 12
                      ? "text-[8px]"
                      : dayWidth < 18
                        ? "text-[9px]"
                        : "text-[10px]",
                  )}
                >
                  {day.label || "\u00a0"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-6 p-3">
            {rows.map((row) => {
              const rowHeight =
                ROW_PADDING * 2 + row.laneCount * BAR_HEIGHT + (row.laneCount - 1) * LANE_GAP;

              return (
                <div key={row.status} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      variant="status"
                      value={row.status}
                      label={row.label}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {row.items.length}
                    </span>
                  </div>

                  <div
                    className="relative rounded-lg bg-muted/20"
                    style={{ width: `${trackWidth}px`, height: `${rowHeight}px` }}
                  >
                    {days.map((day) => (
                      <div
                        key={day.index}
                        className={cn(
                          "pointer-events-none absolute top-0 bottom-0 border-r border-border/30",
                          (day.date.getDay() === 0 || day.date.getDay() === 6) &&
                            "bg-muted/15",
                        )}
                        style={{
                          left: `${day.index * dayWidth}px`,
                          width: `${dayWidth}px`,
                        }}
                      />
                    ))}

                    {row.items.map((item) => {
                      const width = Math.max(dayWidth, (item.endOffset - item.startOffset + 1) * dayWidth - 2);
                      const left = item.startOffset * dayWidth + 1;
                      const top = ROW_PADDING + item.lane * (BAR_HEIGHT + LANE_GAP);
                      const showSummary = width >= 180;
                      const showDate = width >= 120;

                      return (
                        <button
                          key={item.project.id}
                          type="button"
                          className={cn(
                            "absolute overflow-hidden rounded-md border border-white/10 px-2 py-1 text-left text-xs text-white shadow-sm transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                            PRIORITY_BAR[item.project.priority] ?? "bg-primary",
                          )}
                          style={{
                            left: `${left}px`,
                            top: `${top}px`,
                            width: `${width}px`,
                            height: `${BAR_HEIGHT}px`,
                          }}
                          onClick={() => onSelectProject(item.project)}
                          title={item.project.name}
                          aria-label={`${item.project.name} ${getProjectDateRangeLabelLocalized(
                            item.project,
                            language,
                          )}`}
                        >
                          <span className="block line-clamp-1 font-medium">
                            {item.project.name}
                          </span>
                          {showSummary && item.summary && (
                            <span className="mt-0.5 block line-clamp-1 text-[10px] text-white/85">
                              {item.summary}
                            </span>
                          )}
                          {showDate && (
                            <span className="mt-0.5 block line-clamp-1 text-[10px] tabular-nums text-white/85">
                              {getProjectDateRangeLabelLocalized(item.project, language)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{ui.timelineFootnote}</p>
    </div>
  );
}
