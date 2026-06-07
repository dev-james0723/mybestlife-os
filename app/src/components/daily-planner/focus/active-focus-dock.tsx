"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SquareCheckBig, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { focusSessionTypeLabel } from "@/components/daily-planner/focus/focus-session-labels";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { PlannerFocusSession } from "@/types/database";

function elapsedSeconds(session: PlannerFocusSession): number {
  if (!session.actual_start_at) return 0;
  const start = new Date(session.actual_start_at).getTime();
  const end = session.actual_end_at ? new Date(session.actual_end_at).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.floor((end - start) / 1000);
}

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ActiveFocusDock({
  copy,
  session,
  className,
  onPause,
  onResume,
  onFinish,
  onDistracted,
}: {
  copy: DailyPlannerUiCopy;
  session: PlannerFocusSession;
  className?: string;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDistracted: () => void;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (session.status !== "running") return;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [session.status]);

  const timer = useMemo(() => formatTimer(elapsedSeconds(session)), [session, tick]);
  const paused = session.status === "paused";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/8 p-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
            {copy.activeFocus}
          </Badge>
          <span
            className="font-mono text-sm font-semibold tabular-nums text-foreground"
            aria-label={copy.runningTimerLabel}
          >
            {timer}
          </span>
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            {focusSessionTypeLabel(copy, session.session_type)}
          </span>
        </div>
        <p className="truncate text-sm font-semibold">{session.task_title}</p>
        {session.win_condition ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {session.win_condition}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 min-h-11 gap-1.5 rounded-xl"
          onClick={paused ? onResume : onPause}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? copy.resume : copy.pause}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 min-h-11 gap-1.5 rounded-xl"
          onClick={onDistracted}
        >
          <TriangleAlert className="h-3.5 w-3.5" />
          {copy.distracted}
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-11 min-h-11 gap-1.5 rounded-xl"
          onClick={onFinish}
        >
          <SquareCheckBig className="h-3.5 w-3.5" />
          {copy.finishFocus}
        </Button>
      </div>
    </div>
  );
}
