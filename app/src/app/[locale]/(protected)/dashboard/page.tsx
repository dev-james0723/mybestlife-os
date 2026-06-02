"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import {
  differenceInCalendarDays,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { MotivationCard } from "@/components/dashboard/motivation-card";
import { DailyInspirationCard } from "@/components/dashboard/daily-inspiration-card";
import { QuoteInspirationCard } from "@/components/dashboard/quote-inspiration-card";
import { TodayBlock } from "@/components/calendar/today-block";
import { DashboardSignalsWidget } from "@/components/signals/DashboardSignalsWidget";
import { DashboardStudyRow } from "@/components/dashboard/dashboard-study-row";
import { GlassStatCard } from "@/components/dashboard/glass-stat-card";
import { GlassEntityCard } from "@/components/dashboard/glass-entity-card";
import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import {
  AlertCircle,
  Flame,
  FolderKanban,
  Gift,
  Heart,
  Plus,
} from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useGratefulThings } from "@/hooks/use-grateful-things";
import { useJapaneseStudySessions } from "@/hooks/use-japanese-study";
import { useProfile } from "@/hooks/use-settings";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { buildDashboardSummary, getDashboardCopy } from "@/lib/i18n/dashboard";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getGreeting } from "@/lib/greeting";
import { formatDateShort, isOverdue, isUpcoming } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { PROTECTED_DESKTOP_GUTTER_NEG_X } from "@/lib/layout-shell";
import type { GratefulThing, JapaneseStudySession, Task } from "@/types/database";

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function studyStreakFromDates(sessionDates: string[]): number {
  const days = [...new Set(sessionDates.map((d) => format(parseISO(d), "yyyy-MM-dd")))].sort();
  if (days.length === 0) return 0;
  const last = startOfDay(parseISO(days[days.length - 1]!));
  const today = startOfDay(new Date());
  if (differenceInCalendarDays(today, last) > 1) return 0;

  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const cur = startOfDay(parseISO(days[i]!));
    const prev = startOfDay(parseISO(days[i - 1]!));
    if (differenceInCalendarDays(cur, prev) === 1) streak++;
    else break;
  }
  return streak;
}

function DashboardSectionHeader({
  title,
  actionHref,
  actionLabel,
  meta,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {meta && <p className="mt-1 text-xs font-medium text-muted-foreground">{meta}</p>}
      </div>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="text-sm font-semibold text-primary hover:underline">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { language } = useAppStore();
  const hrefGrateful = useLocalizedPath("/grateful-things");
  const hrefTasks = useLocalizedPath("/tasks");
  const hrefJapanese = useLocalizedPath("/japanese-study");
  const hrefAiAssistant = useLocalizedPath("/ai-assistant");
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: gratefulThings, isLoading: gratefulLoading } = useGratefulThings();
  const { data: studySessions, isLoading: studyLoading } = useJapaneseStudySessions();

  const [clock, setClock] = useState(() => new Date());
  const [refreshSpin, setRefreshSpin] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const locale = getDateFnsLocale(language);

  const copy = useMemo(() => getDashboardCopy(language), [language]);

  const activeProjectsCount = useMemo(
    () => (projects ?? []).filter((p) => p.status === "active").length,
    [projects]
  );

  const urgentTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled" && t.priority === "urgent"
    );
  }, [tasks]);

  const studyStreak = useMemo(() => {
    const dates = (studySessions ?? []).map((s) => s.session_date);
    return studyStreakFromDates(dates);
  }, [studySessions]);

  const weekStudyMinutes = useMemo(() => {
    if (!studySessions?.length) return 0;
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return studySessions
      .filter((s) =>
        isWithinInterval(parseISO(s.session_date), {
          start,
          end,
        })
      )
      .reduce((sum, s) => sum + s.duration_minutes, 0);
  }, [studySessions]);

  const gratefulToday = useMemo(() => {
    const key = todayKey();
    return (gratefulThings ?? [])
      .filter((g) => g.entry_date.slice(0, 10) === key)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, 3);
  }, [gratefulThings]);

  const upcomingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((t) => t.status !== "done" && t.status !== "cancelled")
      .filter((t) => isUpcoming(t.due_date) || isOverdue(t.due_date))
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  const recentSessions = useMemo(() => {
    return [...(studySessions ?? [])]
      .sort((a, b) => b.session_date.localeCompare(a.session_date))
      .slice(0, 5);
  }, [studySessions]);

  const summaryText = useMemo(() => {
    const urgentTitles = urgentTasks.slice(0, 2).map((t) => t.title);
    return buildDashboardSummary(language, {
      urgentTitles,
      urgentCount: urgentTasks.length,
      activeProjects: activeProjectsCount,
      studyStreak,
    });
  }, [urgentTasks, activeProjectsCount, studyStreak, language]);

  const invalidateDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["grateful-things"] });
    void queryClient.invalidateQueries({ queryKey: ["japanese-study-sessions"] });
  }, [queryClient]);

  const handleSummaryRefresh = () => {
    setRefreshSpin(true);
    invalidateDashboard();
    window.setTimeout(() => setRefreshSpin(false), 600);
  };

  const isLoading = tasksLoading || projectsLoading || gratefulLoading || studyLoading;

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="relative space-y-8 pb-24 sm:space-y-10">
      {profile?.dashboard_cover_url && (
        <div
          className={cn(
            "relative -mt-6 mb-6 h-40 overflow-hidden rounded-b-xl sm:-mt-8 sm:h-52",
            PROTECTED_DESKTOP_GUTTER_NEG_X
          )}
        >
          <Image
            src={profile.dashboard_cover_url}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            data-user-image
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 sm:space-y-2.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting(language, profile?.greeting_tone ?? "friendly", profile?.full_name)}
          </h1>
          {profile?.motto && (
            <p className="text-sm italic text-muted-foreground">{profile.motto}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground sm:text-right">
          <span className="font-medium text-foreground/90">
            {format(clock, "EEEE, MMMM d, yyyy", { locale })}
          </span>
          <span className="mx-2 text-muted-foreground/80">•</span>
          <span className="tabular-nums">{format(clock, "HH:mm:ss")}</span>
        </p>
      </header>

      <section
        aria-label={copy.title}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"
        data-stagger
      >
        <MotivationCard
          summaryText={summaryText}
          onRefresh={handleSummaryRefresh}
          refreshSpin={refreshSpin}
          copy={{ generating: copy.motivationGenerating }}
          refreshAriaLabel={copy.motivationRefreshAria}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <GlassStatCard
            iconTone="dashboard"
            title={copy.statActiveProjects}
            value={activeProjectsCount}
            icon={FolderKanban}
            className="p-5 sm:col-span-2 xl:col-span-1"
          />
          <GlassStatCard
            iconTone="dashboard"
            title={copy.statUrgent}
            value={urgentTasks.length}
            icon={AlertCircle}
            className="p-5"
          />
          <GlassStatCard
            iconTone="dashboard"
            title={copy.statStreak}
            value={copy.days(studyStreak)}
            icon={Flame}
            className="p-5"
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <main className="min-w-0 space-y-6">
          <TodayBlock />

          <DashboardSignalsWidget />

          <section className="space-y-3">
            <DashboardSectionHeader
              title={copy.upcoming}
              actionHref={hrefTasks}
              actionLabel={copy.viewAll}
            />
            {upcomingTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-14 text-center text-sm text-muted-foreground">
                {copy.noUpcoming}
              </div>
            ) : (
              <div className="space-y-3" data-stagger>
                {upcomingTasks.map((task: Task) => {
                  const overdue = isOverdue(task.due_date);
                  return (
                    <GlassEntityCard
                      key={task.id}
                      title={task.title}
                      subtitle={task.project?.name ?? undefined}
                      badges={
                        <>
                          <StatusBadge variant="priority" value={task.priority} />
                          <StatusBadge variant="status" value={task.status} />
                        </>
                      }
                      meta={
                        task.due_date && (
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              overdue && "font-medium text-destructive"
                            )}
                          >
                            {overdue && <AlertCircle className="h-3 w-3" />}
                            {formatDateShort(task.due_date)}
                          </span>
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
          <GlassTintPanel tint="pink" className="p-5 md:max-xl:p-6 xl:p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-pink-700 dark:bg-pink-400/20 dark:text-pink-200">
                <Heart className="h-5 w-5" />
              </div>
              <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{copy.gratefulTitle}</h2>
              <Link
                href={hrefGrateful}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "shrink-0 font-medium"
                )}
              >
                {copy.addGrateful}
              </Link>
            </div>
            <ul className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => {
                const entry: GratefulThing | undefined = gratefulToday[i];
                return (
                  <li key={entry?.id ?? `slot-${i}`}>
                    <Link
                      href={hrefGrateful}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-pink-500/10 dark:hover:bg-pink-400/10 md:max-xl:px-3 xl:px-2"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-pink-600 dark:text-pink-300" />
                      <span className={cn(!entry && "text-muted-foreground")}>
                        {entry?.content ?? copy.gratefulSlotEmpty(i)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GlassTintPanel>

          <section className="space-y-3">
            <DashboardSectionHeader
              title={copy.recentStudy}
              actionHref={hrefJapanese}
              actionLabel={copy.viewAll}
              meta={copy.weekMinutes(weekStudyMinutes)}
            />
            {recentSessions.length === 0 ? (
              <EmptyState icon={Flame} title={copy.noSessions} description="" />
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((session: JapaneseStudySession) => (
                  <DashboardStudyRow key={session.id} session={session} locale={locale} />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" data-stagger>
        <QuoteInspirationCard focus={summaryText} className="h-full" />

        <DailyInspirationCard
          copy={{
            title: copy.inspirationTitle,
            watchYoutube: copy.watchYoutube,
            markWatched: copy.markWatched,
            saveNotes: copy.saveNotes,
            newVideo: copy.newVideo,
          }}
        />
      </div>

      <Link
        href={hrefAiAssistant}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg",
          "bg-pink-500 text-white transition-colors hover:bg-pink-600",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
        )}
        aria-label={copy.openAiAssistantAria}
      >
        <Gift className="h-7 w-7" />
      </Link>
    </div>
  );
}
