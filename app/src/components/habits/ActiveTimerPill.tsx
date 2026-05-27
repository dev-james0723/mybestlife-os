"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, TimerReset, X } from "lucide-react";
import { toast } from "sonner";
import type { Habit, RoutineWithSteps, TimerSession } from "@/lib/habits/types";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import {
  useActiveTimerSession,
  useCancelTimerSession,
  useCompleteTimerSession,
  usePauseTimerSession,
  useResumeTimerSession,
  useUpsertCompletion,
} from "@/hooks/use-habits";
import { useUpsertRoutineCompletion } from "@/hooks/use-routines";
import { notifyTimerComplete } from "@/lib/habits/timer-notifications";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";

export function computeTimerElapsedSeconds(
  session: TimerSession,
  nowMs = Date.now(),
): number {
  const started = new Date(session.started_at).getTime();
  if (!Number.isFinite(started)) return 0;
  const pausedDelta =
    session.status === "paused" && session.paused_at
      ? Math.max(0, Math.floor((nowMs - new Date(session.paused_at).getTime()) / 1000))
      : 0;
  return Math.max(
    0,
    Math.floor((nowMs - started) / 1000) -
      session.total_paused_seconds -
      pausedDelta,
  );
}

function formatTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface ActiveTimerPillProps {
  habits: readonly Habit[];
  routines: readonly RoutineWithSteps[];
  today: string;
  copy: HabitsUiCopy;
}

export function ActiveTimerPill({
  habits,
  routines,
  today,
  copy,
}: ActiveTimerPillProps) {
  const active = useActiveTimerSession();
  const pause = usePauseTimerSession();
  const resume = useResumeTimerSession();
  const complete = useCompleteTimerSession();
  const cancel = useCancelTimerSession();
  const upsertCompletion = useUpsertCompletion();
  const upsertRoutineCompletion = useUpsertRoutineCompletion();
  const [now, setNow] = useState(() => Date.now());
  const notifiedSessionRef = useRef<string | null>(null);

  const session = active.data;

  useEffect(() => {
    if (!session || session.status === "paused") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session]);

  const target = useMemo(() => {
    if (!session) return null;
    if (session.habit_id) {
      const habit = habits.find((h) => h.id === session.habit_id);
      return habit ? { kind: "habit" as const, title: habit.name, habit } : null;
    }
    if (session.routine_id) {
      const routine = routines.find((r) => r.id === session.routine_id);
      return routine
        ? { kind: "routine" as const, title: routine.name, routine }
        : null;
    }
    return null;
  }, [habits, routines, session]);

  const elapsed = session ? computeTimerElapsedSeconds(session, now) : 0;
  const remaining = session
    ? Math.max(0, session.target_duration_seconds - elapsed)
    : 0;
  const isReady = Boolean(session && target && remaining === 0);

  useEffect(() => {
    if (!session || !target || !isReady || notifiedSessionRef.current === session.id) {
      return;
    }
    notifiedSessionRef.current = session.id;
    toast.message(`${target.title}: ${copy.timerReady}`);
    void notifyTimerComplete(target.title, copy.timerReady);
  }, [copy.timerReady, isReady, session, target]);

  if (!session || !target) return null;

  const handleComplete = async () => {
    const completed = await complete.mutateAsync(session.id);
    const actualSeconds = computeTimerElapsedSeconds(completed);
    if (completed.habit_id) {
      await upsertCompletion.mutateAsync({
        habit_id: completed.habit_id,
        completion_date: today,
        status: "done",
        value: actualSeconds,
        note: null,
      });
    }
    if (completed.routine_id && target.kind === "routine") {
      await upsertRoutineCompletion.mutateAsync({
        routine_id: completed.routine_id,
        completion_date: today,
        completed_step_ids: target.routine.steps.map((s) => s.id),
      });
    }
    toast.success(`${target.title}: ${copy.timerComplete}`);
  };

  return (
    <GlassPanel
      className={cn(
        "fixed bottom-4 left-3 right-3 z-40 mx-auto flex max-w-xl items-center gap-3 overflow-hidden px-3 py-2 shadow-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[28rem]",
        isReady && "ring-1 ring-primary/40",
      )}
      variant="strong"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.08] text-primary">
        <TimerReset className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{target.title}</p>
        <p className="text-xs text-muted-foreground">
          <span className="tabular-nums">{formatTimer(remaining)}</span>
          <span className="mx-1.5">/</span>
          <span className="tabular-nums">{formatTimer(session.target_duration_seconds)}</span>
          {session.status === "paused" && <span className="ml-2">{copy.timerPause}</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {session.status === "paused" ? (
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={copy.timerResume}
            onClick={() => resume.mutate(session.id)}
          >
            <Play className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            aria-label={copy.timerPause}
            onClick={() => pause.mutate(session.id)}
          >
            <Pause className="size-4" />
          </Button>
        )}
        <Button
          type="button"
          size="icon-sm"
          aria-label={copy.timerComplete}
          disabled={complete.isPending || upsertCompletion.isPending}
          onClick={() => void handleComplete()}
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={copy.timerCancel}
          onClick={() => cancel.mutate(session.id)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </GlassPanel>
  );
}
