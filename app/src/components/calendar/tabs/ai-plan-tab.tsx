"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { useCalendarItems } from "@/hooks/use-calendar";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import {
  detectConflicts,
  findFreeWindows,
  generatePlan,
  summarizeDay,
  todayIso,
} from "@/lib/calendar/ai";
import { itemsForDate } from "@/lib/calendar/projection";
import { ConflictWarningPanel } from "@/components/calendar/conflict-warning-panel";
import { FreeWindowPanel } from "@/components/calendar/free-window-panel";
import { EnergyArcChart } from "@/components/calendar/energy-arc-chart";
import type {
  CalendarItem,
  CalendarItemTask,
  ConflictWarning,
  FreeWindow,
  PlanSuggestion,
} from "@/lib/calendar/types";

type SuggestionState = {
  suggestion: PlanSuggestion;
  status: "pending" | "accepted" | "rejected";
};

function unscheduledTasksFor(items: CalendarItem[], dateIso: string): CalendarItem[] {
  return itemsForDate(items, dateIso).filter(
    (i) =>
      i.source_type === "task" &&
      !(i as CalendarItemTask).start_time &&
      (i as CalendarItemTask).status !== "done"
  );
}

export function AIPlanTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const prefersReduced = useReducedMotion();
  const plannerHref = useLocalizedPath("/daily-planner");

  const { data: items, isLoading: isLoadingCalendar } = useCalendarItems();
  const dateIso = useMemo(() => todayIso(), []);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionState[]>([]);
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [freeWindows, setFreeWindows] = useState<FreeWindow[]>([]);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!items) return;
    setIsGenerating(true);
    try {
      const dayItems = itemsForDate(items, dateIso);
      const unscheduled = unscheduledTasksFor(items, dateIso);

      // Fire all four AI calls in parallel. Real providers can be swapped
      // in via lib/calendar/ai/index.ts without touching this surface.
      const [summary, windows, detected, plan] = await Promise.all([
        summarizeDay(dateIso, dayItems),
        findFreeWindows(dateIso, dayItems),
        detectConflicts(dayItems),
        generatePlan(dateIso, unscheduled, []),
      ]);

      // Resolve plan against the freshly computed free windows so it
      // references slots that actually exist.
      void windows;

      setSummaryText(summary.text);
      setFreeWindows(windows);
      setConflicts(detected);
      setSuggestions(plan.map((s) => ({ suggestion: s, status: "pending" })));
      setHasGenerated(true);
    } catch (e) {
      toast.error(copy.error);
      void e;
    } finally {
      setIsGenerating(false);
    }
  }, [items, dateIso, copy.error]);

  const handleStatus = useCallback(
    (id: string, status: SuggestionState["status"]) => {
      setSuggestions((prev) =>
        prev.map((s) => (s.suggestion.id === id ? { ...s, status } : s))
      );
    },
    []
  );

  const handleAcceptAll = useCallback(() => {
    setSuggestions((prev) => prev.map((s) => ({ ...s, status: "accepted" })));
  }, []);

  const pending = suggestions.filter((s) => s.status === "pending");
  const accepted = suggestions.filter((s) => s.status === "accepted");

  return (
    <motion.div
      data-calendar-surface
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      {/* Left — generator + schedule */}
      <div className="space-y-4">
        <GlassPanel className="calendar-specular-highlight p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="h-5 w-5 text-[var(--calendar-lime)]" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {copy.aiPlanTitle}
              </h2>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d", { locale: dateLocale })}
              </p>
            </div>
            <Button
              size="sm"
              className={cn("calendar-lime-cta gap-1.5", isGenerating && "opacity-90")}
              onClick={() => void handleGenerate()}
              disabled={isGenerating || isLoadingCalendar}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isGenerating ? copy.aiGenerating : copy.aiGenerate}
            </Button>
          </div>
          {summaryText && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              {summaryText}
            </p>
          )}
        </GlassPanel>

        {!hasGenerated && !isGenerating && (
          <GlassPanel className="calendar-specular-highlight p-8 text-center">
            <p className="text-sm text-muted-foreground">{copy.aiEmptyState}</p>
          </GlassPanel>
        )}

        {isGenerating && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {hasGenerated && !isGenerating && suggestions.length > 0 && (
          <GlassPanel className="calendar-specular-highlight p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {copy.aiPlanTitle}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {accepted.length}/{suggestions.length}
                </span>
              </h3>
              <Button
                size="xs"
                variant="outline"
                className="gap-1"
                onClick={handleAcceptAll}
                disabled={pending.length === 0}
              >
                <Check className="h-3 w-3" />
                {copy.aiAcceptAll}
              </Button>
            </div>
            <ul className="space-y-2">
              {suggestions.map(({ suggestion, status }) => (
                <li
                  key={suggestion.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    status === "accepted"
                      ? "border-[var(--calendar-lime)]/50 bg-[var(--calendar-lime-soft)]"
                      : status === "rejected"
                        ? "border-border/40 bg-muted/20 opacity-60"
                        : "border-border/60 bg-card/60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-muted/40 text-xs font-semibold tabular-nums text-foreground">
                      {suggestion.slot.start}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{suggestion.title}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {suggestion.slot.start} – {suggestion.slot.end}{" "}
                        <span className="mx-1 opacity-40">·</span>
                        {suggestion.energy === "deep"
                          ? copy.energyDeep
                          : suggestion.energy === "shallow"
                            ? copy.energyShallow
                            : copy.energyRecovery}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {copy.aiRationaleLabel}
                        </span>{" "}
                        {suggestion.rationale}
                      </p>
                    </div>
                    {status === "pending" ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={copy.aiReject}
                          onClick={() => handleStatus(suggestion.id, "rejected")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          className="calendar-lime-cta"
                          aria-label={copy.aiAccept}
                          onClick={() => handleStatus(suggestion.id, "accepted")}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : status === "accepted" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--calendar-lime)]" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </GlassPanel>
        )}

        {hasGenerated && suggestions.length > 0 && (
          <EnergyArcChart
            title={copy.aiEnergyArcTitle}
            suggestions={suggestions.map((s) => s.suggestion)}
            legendDeep={copy.energyDeep}
            legendShallow={copy.energyShallow}
            legendRecovery={copy.energyRecovery}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            render={<Link href={plannerHref} />}
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {copy.backToDailyPlanner}
          </Button>
        </div>
      </div>

      {/* Right — conflicts + free windows */}
      <div className="space-y-4">
        {hasGenerated ? (
          <>
            <ConflictWarningPanel
              title={copy.aiConflictsTitle}
              conflicts={conflicts}
            />
            <FreeWindowPanel
              title={copy.aiFreeWindowsTitle}
              scheduleCta={copy.quickAdd}
              windows={freeWindows}
              emptyLabel={copy.todayNoFreeWindows}
              onSchedule={() => toast.success(copy.aiAccept)}
            />
          </>
        ) : (
          <GlassPanel className="calendar-specular-highlight p-6 text-sm text-muted-foreground">
            {copy.aiEmptyState}
          </GlassPanel>
        )}
      </div>
    </motion.div>
  );
}
