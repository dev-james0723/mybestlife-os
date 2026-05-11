/**
 * Clock widget store — Timer + Stopwatch runtime state, tab selection.
 *
 * Design:
 *   - We store *anchor* timestamps, never mutable elapsed counters. The
 *     render layer computes "remaining" / "elapsed" from anchors on every
 *     frame, so a paused/resumed timer never loses precision and is
 *     trivially restorable from localStorage.
 *   - `tickFlag` is bumped by the panel when it needs to force a rerender
 *     (60 Hz) — Zustand doesn't push time automatically.
 *
 * Persistence: selected tab + preset + running anchors persist so the
 * widget survives panel unmount / page reload. Stopwatch laps also
 * persist.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ClockTab = "clock" | "timer" | "stopwatch";

/** Timer presets in seconds. */
export const TIMER_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: "5m", seconds: 5 * 60 },
  { label: "25m", seconds: 25 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
];

type TimerState = {
  /** Configured duration in ms. */
  durationMs: number;
  /** When set, timestamp at which the timer will reach 0. Paused ⇒ null. */
  endsAt: number | null;
  /** When paused: ms remaining at the moment of pause. */
  remainingMs: number;
  running: boolean;
  /** Has finished since last reset — used for the UI pulse. */
  finished: boolean;
};

type StopwatchState = {
  /** When running: timestamp we started counting from. */
  startedAt: number | null;
  /** When paused: accumulated ms. Resumes by setting startedAt = now - accumMs. */
  accumMs: number;
  running: boolean;
  laps: number[];
};

interface ClockWidgetState {
  tab: ClockTab;
  setTab: (t: ClockTab) => void;

  timer: TimerState;
  timerStart: () => void;
  timerPause: () => void;
  timerReset: () => void;
  timerSetPreset: (seconds: number) => void;
  timerMarkFinished: () => void;

  stopwatch: StopwatchState;
  stopwatchStart: () => void;
  stopwatchPause: () => void;
  stopwatchReset: () => void;
  stopwatchLap: () => void;
}

export const useClockWidgetStore = create<ClockWidgetState>()(
  persist(
    (set, get) => ({
      tab: "clock",
      setTab: (t) => set({ tab: t }),

      timer: {
        durationMs: TIMER_PRESETS[1].seconds * 1000, // default 25m
        endsAt: null,
        remainingMs: TIMER_PRESETS[1].seconds * 1000,
        running: false,
        finished: false,
      },
      timerSetPreset: (seconds) =>
        set(() => ({
          timer: {
            durationMs: seconds * 1000,
            endsAt: null,
            remainingMs: seconds * 1000,
            running: false,
            finished: false,
          },
        })),
      timerStart: () => {
        const { timer } = get();
        if (timer.running) return;
        const now = Date.now();
        const ms = timer.remainingMs > 0 ? timer.remainingMs : timer.durationMs;
        set({
          timer: {
            ...timer,
            endsAt: now + ms,
            remainingMs: ms,
            running: true,
            finished: false,
          },
        });
      },
      timerPause: () => {
        const { timer } = get();
        if (!timer.running || timer.endsAt == null) return;
        const remaining = Math.max(0, timer.endsAt - Date.now());
        set({
          timer: {
            ...timer,
            endsAt: null,
            remainingMs: remaining,
            running: false,
          },
        });
      },
      timerReset: () => {
        const { timer } = get();
        set({
          timer: {
            ...timer,
            endsAt: null,
            remainingMs: timer.durationMs,
            running: false,
            finished: false,
          },
        });
      },
      timerMarkFinished: () => {
        const { timer } = get();
        if (timer.finished) return;
        set({
          timer: {
            ...timer,
            endsAt: null,
            remainingMs: 0,
            running: false,
            finished: true,
          },
        });
      },

      stopwatch: {
        startedAt: null,
        accumMs: 0,
        running: false,
        laps: [],
      },
      stopwatchStart: () => {
        const { stopwatch } = get();
        if (stopwatch.running) return;
        set({
          stopwatch: {
            ...stopwatch,
            startedAt: Date.now() - stopwatch.accumMs,
            running: true,
          },
        });
      },
      stopwatchPause: () => {
        const { stopwatch } = get();
        if (!stopwatch.running || stopwatch.startedAt == null) return;
        const elapsed = Date.now() - stopwatch.startedAt;
        set({
          stopwatch: {
            ...stopwatch,
            startedAt: null,
            accumMs: elapsed,
            running: false,
          },
        });
      },
      stopwatchReset: () =>
        set({
          stopwatch: {
            startedAt: null,
            accumMs: 0,
            running: false,
            laps: [],
          },
        }),
      stopwatchLap: () => {
        const { stopwatch } = get();
        const now = Date.now();
        const elapsed = stopwatch.running
          ? stopwatch.startedAt != null
            ? now - stopwatch.startedAt
            : stopwatch.accumMs
          : stopwatch.accumMs;
        if (elapsed <= 0) return;
        set({
          stopwatch: {
            ...stopwatch,
            laps: [...stopwatch.laps, elapsed],
          },
        });
      },
    }),
    {
      name: "mylifeos.clock.widget.v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as unknown as Storage)
      ),
    }
  )
);
