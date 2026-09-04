"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  Inbox,
  LockKeyhole,
  LockKeyholeOpen,
  Sparkles,
} from "lucide-react";

import {
  OSControl,
  OSFrostedPanel,
  OSGlassPanel,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";

export type AutoPlanState = "empty" | "ready" | "preview" | "accepted";

export type AutoPlanPriority = "must" | "should" | "could";

export interface AutoPlanScheduledItem {
  id: string;
  title: string;
  /** Display-ready, localized time text. */
  start: string;
  /** Display-ready, localized time text. */
  end: string;
  priority: AutoPlanPriority;
  locked: boolean;
}

export interface AutoPlanUnscheduledItem {
  id: string;
  title: string;
  /** Human-readable explanation produced by the scheduling layer. */
  reason: string;
}

export interface AutoPlanResult {
  scheduledItems: ReadonlyArray<AutoPlanScheduledItem>;
  unscheduledItems: ReadonlyArray<AutoPlanUnscheduledItem>;
  availableMinutes: number;
  plannedMinutes: number;
  remainingMinutes: number;
}

/**
 * Every user-facing string and formatter is injected so the parent can localize
 * Auto Plan without coupling this presentational component to an i18n module.
 */
export interface AutoPlanCopy {
  title: string;
  description: string;
  statusLabels: Record<AutoPlanState, string>;
  stateTitles: Record<AutoPlanState, string>;
  stateDescriptions: Record<AutoPlanState, string>;
  candidateCount: (count: number) => string;
  calendarBusyWindowCount: (count: number) => string;
  availableLabel: string;
  plannedLabel: string;
  remainingLabel: string;
  formatMinutes: (minutes: number) => string;
  capacityProgressLabel: string;
  capacityProgressValue: (plannedMinutes: number, availableMinutes: number) => string;
  bufferIntensityLabel: string;
  bufferIntensityDescription: string;
  formatBufferOption: (minutes: number) => string;
  scheduledTitle: string;
  scheduledCount: (count: number) => string;
  noScheduledItems: string;
  unscheduledTitle: string;
  unscheduledCount: (count: number) => string;
  allCandidatesScheduled: string;
  priorityLabels: Record<AutoPlanPriority, string>;
  formatTimeRange: (start: string, end: string) => string;
  lockItem: (title: string) => string;
  unlockItem: (title: string) => string;
  reviewNoticeTitle: string;
  reviewNoticeDescription: string;
  buildMyDay: string;
  buildingPlan: string;
  acceptPlan: string;
  acceptingPlan: string;
  replanRemaining: string;
}

export interface AutoPlanPanelProps {
  state: AutoPlanState;
  copy: AutoPlanCopy;
  candidateCount: number;
  /** Optional scheduling-context note, such as the calendars included in this run. */
  calendarNotice?: string;
  /** Count of fixed calendar windows considered by the scheduling layer. */
  busyWindowCount?: number;
  result?: AutoPlanResult | null;
  bufferMinutes: number;
  bufferOptions: ReadonlyArray<number>;
  onBuildMyDay: () => void;
  onAcceptPlan: () => void;
  onReplanRemaining: () => void;
  onToggleLock: (itemId: string) => void;
  onBufferChange: (minutes: number) => void;
  isBuilding?: boolean;
  isAccepting?: boolean;
  className?: string;
}

const PRIORITY_CLASS_NAME: Record<AutoPlanPriority, string> = {
  must: "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-200",
  should: "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-200",
  could: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-200",
};

function StateIcon({ state }: { state: AutoPlanState }) {
  const className = "size-4";

  if (state === "empty") return <Inbox aria-hidden className={className} />;
  if (state === "ready") return <Sparkles aria-hidden className={className} />;
  if (state === "preview") return <Eye aria-hidden className={className} />;
  return <CheckCircle2 aria-hidden className={className} />;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function AutoPlanPanel({
  state,
  copy,
  candidateCount,
  calendarNotice,
  busyWindowCount,
  result,
  bufferMinutes,
  bufferOptions,
  onBuildMyDay,
  onAcceptPlan,
  onReplanRemaining,
  onToggleLock,
  onBufferChange,
  isBuilding = false,
  isAccepting = false,
  className,
}: AutoPlanPanelProps) {
  const hasResult = Boolean(result) && (state === "preview" || state === "accepted");
  const availableMinutes = Math.max(0, result?.availableMinutes ?? 0);
  const plannedMinutes = Math.max(0, result?.plannedMinutes ?? 0);
  const remainingMinutes = Math.max(0, result?.remainingMinutes ?? 0);
  const capacityPercentage =
    availableMinutes > 0
      ? clampPercentage((plannedMinutes / availableMinutes) * 100)
      : 0;

  return (
    <OSGlassPanel
      as="section"
      data-auto-plan-state={state}
      aria-labelledby="auto-plan-title"
      aria-busy={isBuilding || isAccepting}
      className={cn("isolate p-4 sm:p-5", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 -z-10 size-48 rounded-full bg-lime-300/10 blur-3xl dark:bg-lime-300/8"
      />

      <div className="space-y-4">
        <header className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-lime-400/25 bg-lime-300/12 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:text-lime-200">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="auto-plan-title"
                className="font-heading text-lg font-semibold tracking-tight text-foreground"
              >
                {copy.title}
              </h2>
              <span className="inline-flex min-h-6 items-center gap-1.5 rounded-full border border-border/60 bg-background/45 px-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground backdrop-blur-sm">
                <StateIcon state={state} />
                {copy.statusLabels[state]}
              </span>
            </div>
            <p className="mt-1 text-pretty text-sm leading-5 text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </header>

        <OSFrostedPanel className="p-3.5 sm:p-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                state === "accepted"
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200"
                  : "border-violet-400/25 bg-violet-400/10 text-violet-700 dark:text-violet-200",
              )}
            >
              <StateIcon state={state} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold leading-5 text-foreground">
                  {copy.stateTitles[state]}
                </h3>
                <span className="shrink-0 rounded-full bg-foreground/[0.06] px-2 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {copy.candidateCount(candidateCount)}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.stateDescriptions[state]}
              </p>
            </div>
          </div>
        </OSFrostedPanel>

        {calendarNotice || busyWindowCount !== undefined ? (
          <div
            className="flex items-start gap-2.5 rounded-xl border border-border/55 bg-background/35 px-3 py-2.5 text-xs leading-5 text-muted-foreground backdrop-blur-sm"
            data-auto-plan-calendar-notice
          >
            <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <div className="min-w-0">
              {busyWindowCount !== undefined ? (
                <p className="font-semibold text-foreground/85">
                  {copy.calendarBusyWindowCount(busyWindowCount)}
                </p>
              ) : null}
              {calendarNotice ? <p>{calendarNotice}</p> : null}
            </div>
          </div>
        ) : null}

        <fieldset className="space-y-2.5">
          <div>
            <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Gauge aria-hidden className="size-4 text-lime-600 dark:text-lime-300" />
              {copy.bufferIntensityLabel}
            </legend>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.bufferIntensityDescription}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2" data-auto-plan-buffer-options>
            {bufferOptions.map((minutes) => {
              const active = bufferMinutes === minutes;

              return (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={active}
                  disabled={state === "empty" || isBuilding || isAccepting}
                  data-buffer-minutes={minutes}
                  onClick={() => onBufferChange(minutes)}
                  className={cn(
                    "min-h-11 min-w-0 rounded-xl border px-2 py-2 text-xs font-semibold transition-[background,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 disabled:pointer-events-none disabled:opacity-45 motion-reduce:transition-none",
                    active
                      ? "border-lime-400/45 bg-lime-300 text-slate-950 shadow-[0_8px_24px_rgba(190,242,100,0.16),inset_0_1px_0_rgba(255,255,255,0.48)]"
                      : "border-slate-300/55 bg-white/55 text-slate-700 backdrop-blur-md hover:bg-white/80 dark:border-white/12 dark:bg-white/[0.045] dark:text-white/72 dark:hover:bg-white/[0.08]",
                  )}
                >
                  <span className="block truncate">{copy.formatBufferOption(minutes)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {hasResult && result ? (
          <div className="space-y-4" data-auto-plan-result>
            <div className="grid grid-cols-3 gap-2">
              <Metric
                label={copy.availableLabel}
                value={copy.formatMinutes(availableMinutes)}
              />
              <Metric
                label={copy.plannedLabel}
                value={copy.formatMinutes(plannedMinutes)}
              />
              <Metric
                label={copy.remainingLabel}
                value={copy.formatMinutes(remainingMinutes)}
              />
            </div>

            <div
              role="progressbar"
              aria-label={copy.capacityProgressLabel}
              aria-valuemin={0}
              aria-valuemax={availableMinutes}
              aria-valuenow={Math.min(plannedMinutes, availableMinutes)}
              aria-valuetext={copy.capacityProgressValue(
                plannedMinutes,
                availableMinutes,
              )}
              className="h-2 overflow-hidden rounded-full bg-foreground/[0.08]"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-400 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${capacityPercentage}%` }}
              />
            </div>

            {state === "preview" ? (
              <div
                role="status"
                className="rounded-2xl border border-sky-400/25 bg-sky-400/[0.08] p-3.5 text-sky-950 dark:text-sky-100"
                data-auto-plan-review-notice
              >
                <div className="flex items-start gap-2.5">
                  <Eye aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{copy.reviewNoticeTitle}</p>
                    <p className="mt-1 text-xs leading-5 opacity-75">
                      {copy.reviewNoticeDescription}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <section aria-labelledby="auto-plan-scheduled-title" className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="auto-plan-scheduled-title"
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <Clock3 aria-hidden className="size-4 shrink-0 text-lime-600 dark:text-lime-300" />
                  <span className="truncate">{copy.scheduledTitle}</span>
                </h3>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {copy.scheduledCount(result.scheduledItems.length)}
                </span>
              </div>

              {result.scheduledItems.length > 0 ? (
                <ol className="space-y-2" data-auto-plan-scheduled-list>
                  {result.scheduledItems.map((item) => (
                    <li
                      key={item.id}
                      data-auto-plan-item={item.id}
                      data-locked={item.locked ? "true" : "false"}
                      className={cn(
                        "grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)_2.75rem] items-center gap-2 rounded-2xl border bg-white/48 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.54)] backdrop-blur-md dark:bg-white/[0.035]",
                        item.locked
                          ? "border-lime-400/35 ring-1 ring-lime-300/10"
                          : "border-slate-300/50 dark:border-white/10",
                      )}
                    >
                      <span className="text-[11px] font-semibold leading-4 tabular-nums text-muted-foreground">
                        {copy.formatTimeRange(item.start, item.end)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            PRIORITY_CLASS_NAME[item.priority],
                          )}
                        >
                          {copy.priorityLabels[item.priority]}
                        </span>
                      </span>
                      <OSIconControl
                        type="button"
                        osSize="none"
                        aria-label={
                          item.locked
                            ? copy.unlockItem(item.title)
                            : copy.lockItem(item.title)
                        }
                        aria-pressed={item.locked}
                        disabled={isBuilding || isAccepting}
                        onClick={() => onToggleLock(item.id)}
                        className={cn(
                          "size-11 min-h-11 rounded-xl p-0",
                          item.locked &&
                            "border-lime-400/35 bg-lime-300/15 text-lime-800 dark:text-lime-200",
                        )}
                      >
                        {item.locked ? (
                          <LockKeyhole aria-hidden className="size-4" />
                        ) : (
                          <LockKeyholeOpen aria-hidden className="size-4" />
                        )}
                      </OSIconControl>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-5 text-center text-xs text-muted-foreground">
                  {copy.noScheduledItems}
                </p>
              )}
            </section>

            <section
              aria-labelledby="auto-plan-unscheduled-title"
              className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.065] p-3.5"
              data-auto-plan-unscheduled-tray
            >
              <div className="flex items-center justify-between gap-3">
                <h3
                  id="auto-plan-unscheduled-title"
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <AlertTriangle aria-hidden className="size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                  <span className="truncate">{copy.unscheduledTitle}</span>
                </h3>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {copy.unscheduledCount(result.unscheduledItems.length)}
                </span>
              </div>

              {result.unscheduledItems.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {result.unscheduledItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl border border-amber-400/15 bg-background/45 px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {copy.allCandidatesScheduled}
                </p>
              )}
            </section>
          </div>
        ) : null}

        <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end" data-auto-plan-actions>
          {state === "empty" || state === "ready" ? (
            <OSPrimaryAction
              type="button"
              onClick={onBuildMyDay}
              disabled={
                state === "empty" ||
                candidateCount === 0 ||
                isBuilding ||
                isAccepting
              }
              className="w-full justify-center sm:w-auto"
            >
              <Sparkles aria-hidden className="size-4" />
              {isBuilding ? copy.buildingPlan : copy.buildMyDay}
            </OSPrimaryAction>
          ) : null}

          {state === "preview" ? (
            <>
              <OSControl
                type="button"
                onClick={onReplanRemaining}
                disabled={isBuilding || isAccepting}
                className="w-full justify-center sm:w-auto"
              >
                <Sparkles aria-hidden className="size-4" />
                {isBuilding ? copy.buildingPlan : copy.replanRemaining}
              </OSControl>
              <OSPrimaryAction
                type="button"
                onClick={onAcceptPlan}
                disabled={
                  !result ||
                  result.scheduledItems.length === 0 ||
                  isAccepting ||
                  isBuilding
                }
                className="w-full justify-center sm:w-auto"
                data-auto-plan-accept
              >
                <CheckCircle2 aria-hidden className="size-4" />
                {isAccepting ? copy.acceptingPlan : copy.acceptPlan}
              </OSPrimaryAction>
            </>
          ) : null}

          {state === "accepted" ? (
            <OSControl
              type="button"
              onClick={onReplanRemaining}
              disabled={isBuilding || isAccepting}
              className="w-full justify-center sm:w-auto"
            >
              <Sparkles aria-hidden className="size-4" />
              {isBuilding ? copy.buildingPlan : copy.replanRemaining}
            </OSControl>
          ) : null}
        </div>
      </div>
    </OSGlassPanel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/55 bg-background/42 px-2 py-2.5 text-center backdrop-blur-sm sm:px-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
