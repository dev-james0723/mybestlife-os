"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endOfWeek,
  format,
  startOfWeek,
  subDays,
} from "date-fns";
import { LayoutList, Plus, Sparkles, Wand2 } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TodayView,
  HabitCard,
  RoutineCard,
  HeatmapPlaceholder,
  HabitDetailDrawer,
  InsightCallout,
  WeeklyReviewCard,
  RoutineRunDialog,
  CreateEditHabitDialog,
  CreateRoutineDialog,
  AiHabitBuilderDialog,
  AiRoutineComposerDialog,
} from "@/components/habits";
import {
  useHabits,
  useAllCompletions,
  useAllStreakFreezes,
  useUpsertCompletion,
  useDeleteCompletionForDate,
  useUpdateHabit,
} from "@/hooks/use-habits";
import { useRoutinesWithSteps } from "@/hooks/use-routines";
import { useAIInsight } from "@/hooks/use-ai-insight";
import type { StruggleDetectionResponse } from "@/lib/ai/schemas/habits/struggle-detection";
import type { Habit, HabitCompletion, RoutineWithSteps } from "@/lib/habits/types";
import { computeStreak } from "@/lib/habits/streak";
import { useAppStore } from "@/stores/app-store";
import { useHabitsStore } from "@/stores/habits-store";
import { getHabitsUiCopy } from "@/lib/i18n/habits-ui";
import { cn } from "@/lib/utils";

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

  const [runRoutine, setRunRoutine] = useState<RoutineWithSteps | null>(null);
  const [habitForm, setHabitForm] = useState<{ open: boolean; habit: Habit | null }>({
    open: false,
    habit: null,
  });
  const [routineOpen, setRoutineOpen] = useState(false);
  const [aiHabitOpen, setAiHabitOpen] = useState(false);
  const [aiRoutineOpen, setAiRoutineOpen] = useState(false);

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

  const habitList = useMemo(() => habits ?? [], [habits]);
  const routineList = useMemo(() => routines ?? [], [routines]);

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

  const struggleBody = struggleInsight.data?.content ? (
    <div className="space-y-3">
      <p>{struggleInsight.data.content.overallObservation}</p>
      {struggleInsight.data.content.struggling.length > 0 && (
        <ul className="space-y-2">
          {struggleInsight.data.content.struggling.map((s) => (
            <li
              key={s.habitId}
              className="rounded-lg border border-border/60 bg-card/50 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">{s.habitName}</p>
              <p className="mt-1 text-xs leading-relaxed">{s.pattern}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.suggestedAdjustment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null;

  const pageActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="default" onClick={() => setHabitForm({ open: true, habit: null })}>
        <Plus className="size-3.5" />
        {copy.actionsAddHabit}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRoutineOpen(true)}>
        <Plus className="size-3.5" />
        {copy.actionsAddRoutine}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setAiHabitOpen(true)}>
        <Wand2 className="size-3.5" />
        {copy.actionsAiHabit}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setAiRoutineOpen(true)}>
        <Wand2 className="size-3.5" />
        {copy.actionsAiRoutine}
      </Button>
    </div>
  );

  if (habitsLoading || routinesLoading) return <LoadingPage />;

  return (
    <PageShell title={copy.pageTitle} description={copy.pageDescription} actions={pageActions}>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/15">
              <CardTitle className="text-lg">{copy.todaySectionTitle}</CardTitle>
              <CardDescription>{copy.todaySectionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
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
                onStartRoutine={(r) => setRunRoutine(r)}
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/15">
              <CardTitle className="text-lg">{copy.habitsSectionTitle}</CardTitle>
              <CardDescription>{copy.habitsSectionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {habitList.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title={copy.habitsEmpty}
                  description={copy.pageDescription}
                />
              ) : (
                <>
                  <div className="space-y-2.5">
                    {activeHabits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        variant="default"
                        copy={copy}
                        currentStreak={streakByHabitId.get(habit.id)}
                        onClick={(h) => openHabitDetail(h.id)}
                      />
                    ))}
                  </div>
                  {archivedHabits.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.archivedBadge}
                      </p>
                      {archivedHabits.map((habit) => (
                        <HabitCard
                          key={habit.id}
                          habit={habit}
                          variant="default"
                          copy={copy}
                          currentStreak={streakByHabitId.get(habit.id)}
                          onClick={(h) => openHabitDetail(h.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-muted/15">
              <CardTitle className="text-lg">{copy.routinesSectionTitle}</CardTitle>
              <CardDescription>{copy.routinesSectionDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-6">
              {routineList.length === 0 ? (
                <EmptyState
                  icon={LayoutList}
                  title={copy.routinesEmpty}
                  description={copy.routinesSectionDescription}
                />
              ) : (
                routineList.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    copy={copy}
                    expanded={routine.steps.length <= 5}
                    onClick={(r) => openRoutineDetail(r.id)}
                    onStart={(r) => setRunRoutine(r)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <WeeklyReviewCard
            weekStart={weekStart}
            body={weeklyText}
            error={!!weeklyInsight.error}
            loading={weeklyInsight.isLoading}
            onGenerate={() => weeklyInsight.refresh()}
            isRefreshing={weeklyInsight.isRefreshing}
            cached={weeklyInsight.data?.cached}
            copy={copy}
          />
          <InsightCallout
            title={copy.insightStruggleTitle}
            body={
              struggleInsight.error ? (
                <span className="text-destructive">{copy.insightFailed}</span>
              ) : (
                struggleBody
              )
            }
            loading={struggleInsight.isLoading}
            fallback={copy.insightEmpty}
            onRefresh={() => struggleInsight.refresh()}
            isRefreshing={struggleInsight.isRefreshing}
            cached={struggleInsight.data?.cached}
            refreshLabel={copy.insightRefresh}
            cachedLabel={copy.insightCached}
          />
        </div>

        <Card className="border-border/80 shadow-sm xl:col-span-12">
          <CardHeader className="border-b border-border/60 bg-muted/15">
            <CardTitle className="text-lg">{copy.heatmapSectionTitle}</CardTitle>
            <CardDescription>{copy.heatmapSectionDescription}</CardDescription>
          </CardHeader>
          <CardContent className={cn("pt-6", completionsLoading && "opacity-60")}>
            <HeatmapPlaceholder
              habits={habitList}
              from={heatmapFrom}
              to={today}
              today={today}
              timeZone={timeZone}
              copy={copy}
              completions={rangeCompletions ?? []}
              freezes={streakFreezes ?? []}
            />
          </CardContent>
        </Card>
      </div>

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
