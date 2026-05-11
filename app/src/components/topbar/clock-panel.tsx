"use client";

/**
 * Clock panel — three-tab glass widget (Clock / Timer / Stopwatch).
 *
 * All state lives in `useClockWidgetStore` (persisted via localStorage
 * under `mylifeos.clock.widget.v1`), so:
 *   - Switching tabs never resets running Timer / Stopwatch.
 *   - Closing the panel keeps counters ticking; reopening picks up the
 *     exact state because we store anchor timestamps, not mutable
 *     elapsed counters.
 *   - A full page reload also restores everything.
 *
 * Accessibility:
 *   - Tabs render with `role="tablist"` + `role="tab"`, keyboard nav
 *     (ArrowLeft / ArrowRight / Home / End).
 *   - The outer panel is labelled so screen readers announce "Clock
 *     panel" when opened.
 *
 * Performance:
 *   - The Clock tab uses 1 Hz wall-clock (`useCurrentTime`).
 *   - Timer + Stopwatch lazily switch to `useAnimationFrameTick(active)`
 *     ONLY while running, so idle panels stay cheap.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Flag,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useAnimationFrameTick } from "@/hooks/use-animation-frame";
import {
  TIMER_PRESETS,
  useClockWidgetStore,
  type ClockTab,
} from "@/stores/clock-widget-store";
import { formatHMS, formatStopwatch } from "@/lib/clock/format";

type Props = {
  onClose: () => void;
};

const TABS: Array<{ id: ClockTab; label: string }> = [
  { id: "clock", label: "Clock" },
  { id: "timer", label: "Timer" },
  { id: "stopwatch", label: "Stopwatch" },
];

/** Preset seconds for highlighting the preset pills vs Custom. */
const PRESET_SECONDS_SET = new Set(TIMER_PRESETS.map((p) => p.seconds));

const MIN_TIMER_SEC = 1;
const MAX_TIMER_SEC = 24 * 60 * 60;

function isPresetSeconds(sec: number): boolean {
  return PRESET_SECONDS_SET.has(sec);
}

export function ClockPanel({ onClose }: Props) {
  const tab = useClockWidgetStore((s) => s.tab);
  const setTab = useClockWidgetStore((s) => s.setTab);
  const tabListRef = useRef<HTMLDivElement>(null);

  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    if (idx < 0) return;
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft")
      nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[nextIdx].id);
    // move focus to the newly active tab button
    const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
      'button[role="tab"]'
    );
    buttons?.[nextIdx]?.focus();
  };

  return (
    <div
      role="dialog"
      aria-label="Clock, timer and stopwatch"
      className="topbar-clock-panel"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={tabListRef}
        role="tablist"
        aria-label="Clock widget tabs"
        className="topbar-clock-tabs"
      >
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              data-active={active ? "true" : undefined}
              onClick={() => setTab(t.id)}
              onKeyDown={onTabKey}
              className="topbar-clock-tab"
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5">
        {tab === "clock" ? <ClockTab /> : null}
        {tab === "timer" ? <TimerTab /> : null}
        {tab === "stopwatch" ? <StopwatchTab /> : null}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="sr-only"
        aria-label="Close clock panel"
      >
        Close
      </button>
    </div>
  );
}

// --- Clock tab --------------------------------------------------------
function ClockTab() {
  const now = useCurrentTime();
  const time = useMemo(
    () =>
      now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [now]
  );
  const dateStr = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
    [now]
  );
  return (
    <div role="tabpanel" className="flex flex-col items-center py-4">
      <div className="text-5xl font-semibold tabular-nums tracking-tight">
        {time}
      </div>
      <div className="mt-1.5 text-sm opacity-70">{dateStr}</div>
    </div>
  );
}

// --- Timer tab --------------------------------------------------------
function TimerTab() {
  const timer = useClockWidgetStore((s) => s.timer);
  const start = useClockWidgetStore((s) => s.timerStart);
  const pause = useClockWidgetStore((s) => s.timerPause);
  const reset = useClockWidgetStore((s) => s.timerReset);
  const setPreset = useClockWidgetStore((s) => s.timerSetPreset);
  const markFinished = useClockWidgetStore((s) => s.timerMarkFinished);

  const [customOpen, setCustomOpen] = useState(false);
  const [draftMin, setDraftMin] = useState("0");
  const [draftSec, setDraftSec] = useState("0");

  const rafNow = useAnimationFrameTick(timer.running);
  const remaining = timer.running && timer.endsAt != null
    ? Math.max(0, timer.endsAt - rafNow)
    : timer.remainingMs;

  // Finished detection — fire once when running crosses 0.
  useEffect(() => {
    if (timer.running && timer.endsAt != null && remaining <= 0) {
      markFinished();
    }
  }, [timer.running, timer.endsAt, remaining, markFinished]);

  const progress =
    timer.durationMs > 0
      ? 1 - Math.min(1, remaining / timer.durationMs)
      : 0;

  const selectedPresetSec = Math.round(timer.durationMs / 1000);
  const customDurationActive =
    !isPresetSeconds(selectedPresetSec) || customOpen;

  useEffect(() => {
    if (!customOpen) return;
    const totalSec = Math.max(
      MIN_TIMER_SEC,
      Math.min(MAX_TIMER_SEC, Math.round(timer.durationMs / 1000))
    );
    setDraftMin(String(Math.floor(totalSec / 60)));
    setDraftSec(String(totalSec % 60));
  }, [customOpen, timer.durationMs]);

  const applyCustomDuration = () => {
    let m = Math.floor(Number(draftMin)) || 0;
    let s = Math.floor(Number(draftSec)) || 0;
    s = Math.min(59, Math.max(0, s));
    m = Math.max(0, m);
    let total = m * 60 + s;
    if (total < MIN_TIMER_SEC) total = MIN_TIMER_SEC;
    if (total > MAX_TIMER_SEC) total = MAX_TIMER_SEC;
    setPreset(total);
    setCustomOpen(false);
  };

  return (
    <div role="tabpanel" className="flex flex-col items-center py-2">
      <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
        {TIMER_PRESETS.map((p) => {
          const active = p.seconds === selectedPresetSec && !customOpen;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setPreset(p.seconds);
                setCustomOpen(false);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                "border border-white/10 bg-white/[0.04] hover:bg-white/10",
                active &&
                  "border-[color:var(--primary)]/60 bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
              )}
              aria-pressed={active}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          aria-expanded={customOpen}
          aria-controls="timer-custom-duration"
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            "border border-white/10 bg-white/[0.04] hover:bg-white/10",
            customDurationActive &&
              "border-[color:var(--primary)]/60 bg-[color:var(--primary)]/15 text-[color:var(--primary)]"
          )}
          aria-pressed={customDurationActive}
        >
          <Timer className="h-3 w-3 opacity-80" aria-hidden />
          Custom
        </button>
      </div>

      {customOpen ? (
        <div
          id="timer-custom-duration"
          className="mt-2 flex w-full max-w-[280px] flex-col gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] p-2.5"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyCustomDuration();
            }
          }}
        >
          <p className="text-center text-[11px] font-medium uppercase tracking-wide text-white/50">
            Set duration
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <label htmlFor="timer-custom-min" className="sr-only">
                Minutes
              </label>
              <input
                id="timer-custom-min"
                type="number"
                inputMode="numeric"
                min={0}
                max={Math.floor(MAX_TIMER_SEC / 60)}
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
                className="w-14 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-center text-sm tabular-nums text-foreground outline-none ring-[color:var(--primary)]/40 focus:ring-2"
              />
              <span className="text-xs text-white/45">min</span>
            </div>
            <div className="flex items-center gap-1">
              <label htmlFor="timer-custom-sec" className="sr-only">
                Seconds
              </label>
              <input
                id="timer-custom-sec"
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={draftSec}
                onChange={(e) => setDraftSec(e.target.value)}
                className="w-14 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5 text-center text-sm tabular-nums text-foreground outline-none ring-[color:var(--primary)]/40 focus:ring-2"
              />
              <span className="text-xs text-white/45">sec</span>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/35">
            1 sec — 24 h
          </p>
          <div className="flex justify-center">
            <PanelButton
              type="button"
              onClick={applyCustomDuration}
              aria-label="Apply custom timer duration"
              variant="primary"
            >
              Apply
            </PanelButton>
          </div>
        </div>
      ) : null}

      <ProgressRing
        progress={progress}
        pulse={timer.finished}
        className="my-4"
      >
        <div className="text-3xl font-semibold tabular-nums tracking-tight">
          {formatHMS(remaining)}
        </div>
        {timer.finished ? (
          <div className="mt-1 text-[11px] uppercase tracking-widest text-[color:var(--primary)]">
            Time&apos;s up
          </div>
        ) : null}
      </ProgressRing>

      <div className="flex items-center gap-2">
        {timer.running ? (
          <PanelButton onClick={pause} aria-label="Pause timer">
            <Pause className="h-4 w-4" /> <span>Pause</span>
          </PanelButton>
        ) : (
          <PanelButton
            onClick={start}
            aria-label="Start timer"
            variant="primary"
            disabled={remaining <= 0 && !timer.finished}
          >
            <Play className="h-4 w-4" /> <span>Start</span>
          </PanelButton>
        )}
        <PanelButton onClick={reset} aria-label="Reset timer">
          <RotateCcw className="h-4 w-4" /> <span>Reset</span>
        </PanelButton>
      </div>
    </div>
  );
}

// --- Stopwatch tab ----------------------------------------------------
function StopwatchTab() {
  const sw = useClockWidgetStore((s) => s.stopwatch);
  const start = useClockWidgetStore((s) => s.stopwatchStart);
  const pause = useClockWidgetStore((s) => s.stopwatchPause);
  const reset = useClockWidgetStore((s) => s.stopwatchReset);
  const lap = useClockWidgetStore((s) => s.stopwatchLap);

  const rafNow = useAnimationFrameTick(sw.running);
  const elapsed =
    sw.running && sw.startedAt != null ? rafNow - sw.startedAt : sw.accumMs;

  const { fastestIdx, slowestIdx } = useMemo(() => {
    if (sw.laps.length < 2) return { fastestIdx: -1, slowestIdx: -1 };
    let fi = 0;
    let si = 0;
    for (let i = 1; i < sw.laps.length; i++) {
      if (sw.laps[i] < sw.laps[fi]) fi = i;
      if (sw.laps[i] > sw.laps[si]) si = i;
    }
    return { fastestIdx: fi, slowestIdx: si };
  }, [sw.laps]);

  return (
    <div role="tabpanel" className="flex flex-col items-center py-2">
      <div className="my-3 text-4xl font-semibold tabular-nums tracking-tight">
        {formatStopwatch(elapsed)}
      </div>

      <div className="flex items-center gap-2">
        {sw.running ? (
          <PanelButton onClick={pause} aria-label="Pause stopwatch">
            <Pause className="h-4 w-4" /> <span>Pause</span>
          </PanelButton>
        ) : (
          <PanelButton
            onClick={start}
            aria-label="Start stopwatch"
            variant="primary"
          >
            <Play className="h-4 w-4" /> <span>Start</span>
          </PanelButton>
        )}
        <PanelButton
          onClick={lap}
          aria-label="Record lap"
          disabled={!sw.running && elapsed === 0}
        >
          <Flag className="h-4 w-4" /> <span>Lap</span>
        </PanelButton>
        <PanelButton
          onClick={reset}
          aria-label="Reset stopwatch"
          disabled={sw.running ? false : elapsed === 0 && sw.laps.length === 0}
        >
          <RotateCcw className="h-4 w-4" /> <span>Reset</span>
        </PanelButton>
      </div>

      {sw.laps.length > 0 ? (
        <ul
          className="mt-3 max-h-[140px] w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-white/[0.04] p-1.5 text-xs"
          aria-label="Lap times"
        >
          {sw.laps
            .map((t, i) => ({ t, i }))
            .reverse()
            .map(({ t, i }) => {
              const isFast = i === fastestIdx && sw.laps.length > 1;
              const isSlow = i === slowestIdx && sw.laps.length > 1;
              return (
                <li
                  key={i}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1 tabular-nums",
                    isFast && "text-emerald-400",
                    isSlow && "text-rose-400"
                  )}
                >
                  <span className="opacity-70">Lap {i + 1}</span>
                  <span className="font-medium">{formatStopwatch(t)}</span>
                </li>
              );
            })}
        </ul>
      ) : null}
    </div>
  );
}

// --- Panel button -----------------------------------------------------
type PanelButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "primary";
  type?: "button" | "submit";
  "aria-label"?: string;
};
function PanelButton({
  onClick,
  children,
  disabled,
  variant = "default",
  type = "button",
  ...rest
}: PanelButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary"
          ? "border-[color:var(--primary)]/55 bg-[color:var(--primary)]/20 text-[color:var(--primary)] hover:bg-[color:var(--primary)]/30"
          : "border-white/10 bg-white/[0.06] hover:bg-white/[0.14]"
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// --- Progress ring ----------------------------------------------------
type RingProps = {
  progress: number;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
};
function ProgressRing({ progress, pulse, children, className }: RingProps) {
  const size = 152;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        pulse && "animate-pulse",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.12}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 160ms linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
