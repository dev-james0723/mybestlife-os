"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { Archive, Sparkles } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { GlassPanel } from "@/components/ui/glass-panel";
import {
  TodayView,
  HabitCard,
  HabitDetailDrawer,
  RoutineRunDialog,
  CreateEditHabitDialog,
  CreateRoutineDialog,
  AiHabitBuilderDialog,
  AiRoutineComposerDialog,
  HabitsSecretaryHero,
  HabitAnalyticsPanel,
  RoutineStudio,
  CrossPageHabitSuggestions,
  ActiveTimerPill,
} from "@/components/habits";
import {
  useHabits,
  useAllCompletions,
  useAllStreakFreezes,
  useUpsertCompletion,
  useDeleteCompletionForDate,
  useUpdateHabit,
  useHabitVisuals,
  useStartTimerSession,
  useCreateHabit,
} from "@/hooks/use-habits";
import { useRoutinesWithSteps } from "@/hooks/use-routines";
import { useAIInsight } from "@/hooks/use-ai-insight";
import { habitProposalToCreateInput } from "@/lib/habits/map-proposal-to-create-input";
import type { StruggleDetectionResponse } from "@/lib/ai/schemas/habits/struggle-detection";
import type {
  CrossPageHabitSuggestion,
  CrossPageSuggestionsResponse,
  SecretaryBriefResponse,
} from "@/lib/ai/schemas/habits/secretary";
import type { Habit, HabitCompletion, RoutineWithSteps } from "@/lib/habits/types";
import { computeStreak } from "@/lib/habits/streak";
import { useAppStore } from "@/stores/app-store";
import { useHabitsStore } from "@/stores/habits-store";
import { getHabitsUiCopy } from "@/lib/i18n/habits-ui";
import { prepareTimerNotifications } from "@/lib/habits/timer-notifications";

/**
 * Habits hub: logging, streaks, heatmap, routine runs, and cached AI insights.
 */
export default function HabitsPage() {
  const language = useAppStore((s) => s.language);
  const copy = getHabitsUiCopy(language);

  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: routines, isLoading: routinesLoading } = useRoutinesWithSteps();

  const detailTarget = useHabitsStore((s) => s.detailTarget);
  const closeDetail = useHabitsStore((s) => s.closeDetail);
  const openHabitDetail = useHabitsStore((s) => s.openHabitDetail);
  const openRoutineDetail = useHabitsStore((s) => s.openRoutineDetail);

  const today = format(new Date(), "yyyy-MM-dd");
  const heatmapFrom = format(subDays(new Date(), 119), "yyyy-MM-dd");
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const weekEnd = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );

  const { data: rangeCompletions, isLoading: completionsLoading } =
    useAllCompletions({ from: heatmapFrom, to: today });

  const { data: streakFreezes } = useAllStreakFreezes({
    from: heatmapFrom,
    to: today,
  });

  const upsertCompletion = useUpsertCompletion();
  const deleteCompletion = useDeleteCompletionForDate();
  const updateHabit = useUpdateHabit();
  const startTimer = useStartTimerSession();
  const createHabit = useCreateHabit();

  const [runRoutine, setRunRoutine] = useState<RoutineWithSteps | null>(null);
  const [habitForm, setHabitForm] = useState<{ open: boolean; habit: Habit | null }>({
    open: false,
    habit: null,
  });
  const [routineOpen, setRoutineOpen] = useState(false);
  const [aiHabitOpen, setAiHabitOpen] = useState(false);
  const [aiRoutineOpen, setAiRoutineOpen] = useState(false);
  const analyticsRef = useRef<HTMLDivElement | null>(null);

  const weeklyInsight = useAIInsight<{ text: string }>(
    "weekly_review",
    { weekStart, weekEnd, timeZone },
    { enabled: !habitsLoading && !routinesLoading },
  );

  const struggleInsight = useAIInsight<StruggleDetectionResponse>(
    "struggle_detection",
    { windowDays: 14, timeZone },
    { enabled: !habitsLoading && !routinesLoading },
  );

  const secretaryBrief = useAIInsight<SecretaryBriefResponse>(
    "secretary_brief",
    { today, timeZone },
    { enabled: !habitsLoading && !routinesLoading },
  );

  const crossPageSuggestions = useAIInsight<CrossPageSuggestionsResponse>(
    "cross_page_suggestions",
    { today, timeZone },
    { enabled: !habitsLoading && !routinesLoading },
  );

  const habitList = useMemo(() => habits ?? [], [habits]);
  const routineList = useMemo(() => routines ?? [], [routines]);
  const habitIds = useMemo(() => habitList.map((h) => h.id), [habitList]);
  const { data: habitVisuals } = useHabitVisuals(habitIds);

  const visualByHabitId = useMemo(() => {
    const m = new Map<string, string>();
    for (const visual of habitVisuals ?? []) {
      if (visual.habit_id && visual.image_url) m.set(visual.habit_id, visual.image_url);
    }
    return m;
  }, [habitVisuals]);

  const completionByHabitId = useMemo(() => {
    const m = new Map<string, { status: "done" | "skipped" }>();
    for (const c of rangeCompletions ?? []) {
      if (c.completion_date !== today) continue;
      m.set(c.habit_id, { status: c.status });
    }
    return m;
  }, [rangeCompletions, today]);

  const todayCompletionByHabitId = useMemo(() => {
    const m = new Map<string, HabitCompletion>();
    for (const c of rangeCompletions ?? []) {
      if (c.completion_date !== today) continue;
      m.set(c.habit_id, c);
    }
    return m;
  }, [rangeCompletions, today]);

  const streakByHabitId = useMemo(() => {
    const now = new Date();
    const m = new Map<string, number>();
    for (const h of habitList) {
      const comps = (rangeCompletions ?? []).filter((c) => c.habit_id === h.id);
      const fr = (streakFreezes ?? []).filter((f) => f.habit_id === h.id);
      m.set(
        h.id,
        computeStreak({
          habit: h,
          completions: comps,
          freezes: fr,
          timeZone,
          now,
        }).currentStreak,
      );
    }
    return m;
  }, [habitList, rangeCompletions, streakFreezes, timeZone]);

  const selectedHabit =
    detailTarget?.kind === "habit"
      ? (habitList.find((h) => h.id === detailTarget.id) ?? null)
      : null;
  const selectedRoutine =
    detailTarget?.kind === "routine"
      ? (routineList.find((r) => r.id === detailTarget.id) ?? null)
      : null;

  const detailOpen =
    detailTarget !== null && (selectedHabit !== null || selectedRoutine !== null);

  useEffect(() => {
    if (!detailTarget || habitsLoading || routinesLoading) return;
    if (
      detailTarget.kind === "habit" &&
      !habitList.some((h) => h.id === detailTarget.id)
    ) {
      closeDetail();
    }
    if (
      detailTarget.kind === "routine" &&
      !routineList.some((r) => r.id === detailTarget.id)
    ) {
      closeDetail();
    }
  }, [detailTarget, habitList, routineList, habitsLoading, routinesLoading, closeDetail]);

  const handleSaveTodayNumeric = useCallback(
    (habit: Habit, value: number) => {
      const prev = todayCompletionByHabitId.get(habit.id);
      upsertCompletion.mutate({
        habit_id: habit.id,
        completion_date: today,
        status: "done",
        value,
        note: prev?.note ?? null,
      });
    },
    [today, upsertCompletion, todayCompletionByHabitId],
  );

  const handleToggleHabit = useCallback(
    (habit: Habit) => {
      if (
        (habit.type !== "checkbox" && habit.type !== "negative") ||
        !habit.is_active ||
        habit.archived_at
      )
        return;
      const row = completionByHabitId.get(habit.id);
      if (row?.status === "done") {
        deleteCompletion.mutate({ habitId: habit.id, date: today });
      } else {
        upsertCompletion.mutate({
          habit_id: habit.id,
          completion_date: today,
          status: "done",
          value: null,
          note: null,
        });
      }
    },
    [completionByHabitId, deleteCompletion, today, upsertCompletion],
  );

  const handleStartHabitTimer = useCallback(
    (habit: Habit) => {
      const duration =
        habit.type === "duration" && habit.target_value
          ? Math.max(60, Math.round(habit.target_value))
          : 5 * 60;
      void prepareTimerNotifications();
      startTimer.mutate({
        habit_id: habit.id,
        target_duration_seconds: duration,
      });
    },
    [startTimer],
  );

  const handleStartRoutine = useCallback(
    (routine: RoutineWithSteps) => {
      const totalSeconds = routine.steps.reduce(
        (sum, step) => sum + (step.duration_seconds ?? 0),
        0,
      );
      void prepareTimerNotifications();
      startTimer.mutate({
        routine_id: routine.id,
        target_duration_seconds: totalSeconds > 0 ? totalSeconds : 15 * 60,
      });
      setRunRoutine(routine);
    },
    [startTimer],
  );

  const handleCreateSuggestion = useCallback(
    (suggestion: CrossPageHabitSuggestion) => {
      createHabit.mutate(habitProposalToCreateInput(suggestion));
    },
    [createHabit],
  );

  const { activeHabits, archivedHabits } = useMemo(() => {
    const active: typeof habitList = [];
    const archived: typeof habitList = [];
    for (const h of habitList) {
      if (h.archived_at) archived.push(h);
      else active.push(h);
    }
    active.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    archived.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    return { activeHabits: active, archivedHabits: archived };
  }, [habitList]);

  const weeklyText =
    weeklyInsight.data?.content &&
    typeof weeklyInsight.data.content === "object" &&
    "text" in weeklyInsight.data.content
      ? String((weeklyInsight.data.content as { text: string }).text)
      : "";

  const struggleText =
    struggleInsight.data?.content?.overallObservation ??
    struggleInsight.data?.content?.struggling?.[0]?.suggestedAdjustment ??
    "";

  if (habitsLoading || routinesLoading) return <LoadingPage />;

  const completedToday = [...completionByHabitId.values()].filter(
    (c) => c.status === "done",
  ).length;
  const todayTotal =
    habitList.filter((h) => h.is_active && !h.archived_at).length +
    routineList.filter((r) => r.is_active && !r.archived_at).length;
  const analyticsNarrative = weeklyText || struggleText;

  return (
    <PageShell title={copy.pageTitle} description={copy.pageDescription}>
      <div className="space-y-6 pb-20">
        <HabitsSecretaryHero
          copy={copy}
          habits={habitList}
          routines={routineList}
          completedToday={completedToday}
          totalToday={todayTotal}
          brief={secretaryBrief.data?.content ?? null}
          loading={secretaryBrief.isLoading}
          onPlan={() => setAiHabitOpen(true)}
          onManual={() => setHabitForm({ open: true, habit: null })}
          onReview={() => analyticsRef.current?.scrollIntoView({ behavior: "smooth" })}
        />

        <div className="grid gap-6 xl:grid-cols-12" data-stagger>
          <GlassPanel className="space-y-4 p-4 sm:p-5 xl:col-span-8" variant="strong">
            <div>
              <h2 className="text-lg font-semibold">{copy.todaySectionTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.todaySectionDescription}
              </p>
            </div>
            <TodayView
              habits={habitList}
              routines={routineList}
              date={today}
              copy={copy}
              completionByHabitId={completionByHabitId}
              todayCompletionByHabitId={todayCompletionByHabitId}
              onToggleHabit={handleToggleHabit}
              onOpenHabit={(h) => openHabitDetail(h.id)}
              onOpenRoutine={(r) => openRoutineDetail(r.id)}
              onSaveTodayNote={(input) => upsertCompletion.mutate(input)}
              saveNotePending={upsertCompletion.isPending}
              onSaveTodayNumeric={handleSaveTodayNumeric}
              saveValuePending={upsertCompletion.isPending}
              onStartRoutine={handleStartRoutine}
              onStartHabitTimer={handleStartHabitTimer}
              visualByHabitId={visualByHabitId}
            />
          </GlassPanel>

          <div className="space-y-6 xl:col-span-4">
            <CrossPageHabitSuggestions
              copy={copy}
              data={crossPageSuggestions.data?.content ?? null}
              loading={crossPageSuggestions.isLoading}
              error={!!crossPageSuggestions.error}
              refreshing={crossPageSuggestions.isRefreshing}
              onRefresh={() => void crossPageSuggestions.refresh()}
              onCreate={handleCreateSuggestion}
              creating={createHabit.isPending}
            />
            <RoutineStudio
              routines={routineList}
              copy={copy}
              onCreate={() => setRoutineOpen(true)}
              onOpen={(r) => openRoutineDetail(r.id)}
              onStart={handleStartRoutine}
            />
          </div>

          <div ref={analyticsRef} className="xl:col-span-12">
            <HabitAnalyticsPanel
              habits={habitList}
              completions={rangeCompletions ?? []}
              freezes={streakFreezes ?? []}
              from={heatmapFrom}
              to={today}
              today={today}
              timeZone={timeZone}
              copy={copy}
              aiNarrative={analyticsNarrative}
              loading={
                completionsLoading ||
                weeklyInsight.isLoading ||
                struggleInsight.isLoading
              }
            />
          </div>

          <GlassPanel className="space-y-4 p-4 sm:p-5 xl:col-span-12" variant="strong">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                <Archive className="size-4 text-primary" />
                {copy.maintenanceTitle}
              </summary>
              <div className="mt-4">
                {habitList.length === 0 ? (
                  <EmptyState
                    icon={Sparkles}
                    title={copy.habitsEmpty}
                    description={copy.pageDescription}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[...activeHabits, ...archivedHabits].map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        variant="default"
                        copy={copy}
                        currentStreak={streakByHabitId.get(habit.id)}
                        visualUrl={visualByHabitId.get(habit.id)}
                        onClick={(h) => openHabitDetail(h.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </details>
          </GlassPanel>
        </div>
      </div>

      <ActiveTimerPill
        habits={habitList}
        routines={routineList}
        today={today}
        copy={copy}
      />

      <HabitDetailDrawer
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
        habit={selectedHabit}
        routine={selectedRoutine}
        copy={copy}
        timeZone={timeZone}
        onEditHabit={(h) => {
          closeDetail();
          setHabitForm({ open: true, habit: h });
        }}
        onArchiveHabit={(h) => {
          updateHabit.mutate({
            id: h.id,
            data: { archived_at: new Date().toISOString() },
          });
          closeDetail();
        }}
      />

      <CreateEditHabitDialog
        key={habitForm.open ? (habitForm.habit?.id ?? "create") : "habit-form-closed"}
        open={habitForm.open}
        habit={habitForm.habit}
        copy={copy}
        onOpenChange={(open) => {
          if (!open) setHabitForm({ open: false, habit: null });
        }}
      />
      <CreateRoutineDialog
        key={routineOpen ? "routine-open" : "routine-closed"}
        open={routineOpen}
        copy={copy}
        onOpenChange={setRoutineOpen}
      />
      <AiHabitBuilderDialog open={aiHabitOpen} copy={copy} onOpenChange={setAiHabitOpen} />
      <AiRoutineComposerDialog
        open={aiRoutineOpen}
        copy={copy}
        onOpenChange={setAiRoutineOpen}
      />

      <RoutineRunDialog
        open={runRoutine !== null}
        onOpenChange={(open) => {
          if (!open) setRunRoutine(null);
        }}
        routine={runRoutine}
        completionDate={today}
        copy={copy}
      />
    </PageShell>
  );
}
