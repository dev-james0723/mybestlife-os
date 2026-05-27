"use client";

import { ListOrdered, Play, Timer } from "lucide-react";
import type { RoutineWithSteps } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeOfDayPillClass } from "./TodayView";
import { timeOfDayLabel } from "@/lib/i18n/habits-ui";

export interface RoutineCardProps {
  routine: RoutineWithSteps;
  copy: HabitsUiCopy;
  expanded?: boolean;
  onStart?: (routine: RoutineWithSteps) => void;
  onClick?: (routine: RoutineWithSteps) => void;
}

function totalMinutes(routine: RoutineWithSteps): number {
  let sec = 0;
  for (const s of routine.steps) {
    if (s.duration_seconds != null) sec += s.duration_seconds;
  }
  return Math.round(sec / 60);
}

function formatStepDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

export function RoutineCard({
  routine,
  copy,
  expanded = false,
  onStart,
  onClick,
}: RoutineCardProps) {
  const steps = [...routine.steps].sort((a, b) => a.position - b.position);
  const archived = !!routine.archived_at;
  const totalMin = totalMinutes(routine);

  return (
    <GlassPanel
      data-testid="routine-card"
      data-routine-id={routine.id}
      className={cn(
        "overflow-hidden transition-colors",
        archived && "opacity-70",
        onClick && "cursor-pointer",
      )}
      interactive={!!onClick}
      onClick={() => onClick?.(routine)}
    >
      <div className="flex items-stretch gap-0">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-r border-white/10 bg-white/[0.05] py-3">
          <ListOrdered className="size-5 text-primary" />
          {totalMin > 0 && <Timer className="size-3.5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1 space-y-2 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-sm font-medium leading-tight">
                  {routine.name}
                </h3>
                {archived && (
                  <Badge variant="outline" className="text-[0.65rem] font-normal">
                    {copy.archivedBadge}
                  </Badge>
                )}
              </div>
              {routine.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {routine.description}
                </p>
              )}
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="default"
                size="sm"
                className="h-8 shrink-0 gap-1.5"
                disabled={!onStart}
                onClick={() => onStart?.(routine)}
              >
                <Play className="size-3.5" />
                {copy.routineStart}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={timeOfDayPillClass(routine.time_of_day)}>
              {timeOfDayLabel(routine.time_of_day, copy)}
            </span>
            <Badge variant="secondary" className="text-[0.65rem] font-normal">
              {copy.routineStepsLabel(steps.length)}
            </Badge>
            {!routine.is_active && (
              <Badge variant="outline" className="text-[0.65rem] font-normal">
                {copy.habitsPaused}
              </Badge>
            )}
            {totalMin > 0 && (
              <span className="text-[0.65rem] text-muted-foreground tabular-nums">
                {copy.formatRoutineTotalMinutes(totalMin)}
              </span>
            )}
          </div>
          {(expanded || steps.length <= 4) && steps.length > 0 && (
            <ol className="mt-1 space-y-1 border-t border-white/10 pt-2 text-xs text-muted-foreground">
              {steps.map((s, i) => (
                <li key={s.id} className="flex gap-2">
                  <span className="w-4 shrink-0 font-mono text-[0.65rem] text-muted-foreground/80">
                    {i + 1}.
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground">{s.title}</span>
                    {s.duration_seconds != null && (
                      <span className="ml-1.5 tabular-nums">
                        · {formatStepDuration(s.duration_seconds)}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
