"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { OSPageHeader } from "@/components/ui/os-primitives";
import { MotivationCard } from "@/components/dashboard/motivation-card";
import { TodaysKnowledgePickCard } from "@/components/dashboard/todays-knowledge-pick-card";
import { TodayBlockView } from "@/components/calendar/today-block";
import { DashboardWeatherWidget } from "@/components/calendar/dashboard-weather-widget";
import { GlassStatCard } from "@/components/dashboard/glass-stat-card";
import { GlassEntityCard } from "@/components/dashboard/glass-entity-card";
import { GlassTintPanel } from "@/components/dashboard/glass-tint-panel";
import {
  AlertCircle,
  FolderKanban,
  Heart,
  Plus,
} from "lucide-react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useGratefulThings } from "@/hooks/use-grateful-things";
import { useTodayContext, type TodayContextState } from "@/hooks/use-today-context";
import { useProfile } from "@/hooks/use-settings";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { buildDashboardSummary, getDashboardCopy } from "@/lib/i18n/dashboard";
import { getKnowledgePickDayKey } from "@/lib/dashboard/daily-knowledge-pick";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getGreeting } from "@/lib/greeting";
import { formatDateShort, isOverdue, isUpcoming } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { PROTECTED_DESKTOP_GUTTER_NEG_X } from "@/lib/layout-shell";
import type { GratefulThing, Task } from "@/types/database";

const DashboardSignalsWidget = dynamic(
  () =>
    import("@/components/signals/DashboardSignalsWidget").then(
      (mod) => mod.DashboardSignalsWidget,
    ),
  { ssr: false, loading: () => <DashboardPanelFallback className="min-h-72" /> },
);

const QuoteInspirationCard = dynamic(
  () =>
    import("@/components/dashboard/quote-inspiration-card").then(
      (mod) => mod.QuoteInspirationCard,
    ),
  { ssr: false, loading: () => <DashboardPanelFallback className="min-h-72" /> },
);

const DailyInspirationCard = dynamic(
  () =>
    import("@/components/dashboard/daily-inspiration-card").then(
      (mod) => mod.DailyInspirationCard,
    ),
  { ssr: false, loading: () => <DashboardPanelFallback className="min-h-72" /> },
);

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function DashboardPanelFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/45 shadow-sm",
        className,
      )}
      aria-busy="true"
    />
  );
}

function DashboardSectionHeader({
  title,
  actionHref,
  actionLabel,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function DashboardWeatherSlot({ today }: { today: TodayContextState }) {
  const load = today.context?.load ?? "Balanced";
  const hasOutdoorEvents =
    today.context?.items.some((item) => item.source_type === "external" && !!item.location) ??
    false;

  return <DashboardWeatherWidget load={load} hasOutdoorEvents={hasOutdoorEvents} />;
}

export default function DashboardPage() {
  const { language } = useAppStore();
  const hrefGrateful = useLocalizedPath("/grateful-things");
  const hrefTasks = useLocalizedPath("/tasks");
  const queryClient = useQueryClient();
  const { data: profile, isPending: profilePending } = useProfile();
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: gratefulThings, isLoading: gratefulLoading } = useGratefulThings();
  const today = useTodayContext();

  const [clock, setClock] = useState(() => new Date());
  const [refreshSpin, setRefreshSpin] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const locale = getDateFnsLocale(language);
  const knowledgePickDayKey = getKnowledgePickDayKey(clock, profile?.timezone);

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

  const summaryText = useMemo(() => {
    const urgentTitles = urgentTasks.slice(0, 2).map((t) => t.title);
    return buildDashboardSummary(language, {
      urgentTitles,
      urgentCount: urgentTasks.length,
      activeProjects: activeProjectsCount,
    });
  }, [urgentTasks, activeProjectsCount, language]);

  const invalidateDashboard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["grateful-things"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard", "knowledge-pick"] });
  }, [queryClient]);

  const handleSummaryRefresh = () => {
    setRefreshSpin(true);
    invalidateDashboard();
    window.setTimeout(() => setRefreshSpin(false), 600);
  };

  const isLoading = tasksLoading || projectsLoading || gratefulLoading;

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
          data-motion-reveal
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

      <div data-motion-reveal>
        <OSPageHeader
          title={getGreeting(language, profile?.greeting_tone ?? "friendly", profile?.full_name)}
          description={profile?.motto ?? undefined}
          actions={
            <p className="text-sm text-muted-foreground sm:text-right">
              <span className="font-medium text-foreground/90">
                {format(clock, "EEEE, MMMM d, yyyy", { locale })}
              </span>
              <span className="mx-2 text-muted-foreground/80">•</span>
              <span className="tabular-nums">{format(clock, "HH:mm:ss")}</span>
            </p>
          }
        />
      </div>

      <div data-motion-reveal>
        <TodayBlockView today={today} showWeatherWidget={false} />
      </div>

      <section
        aria-label={copy.title}
        className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]"
        data-motion-reveal
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
            className="p-5"
          />
          <GlassStatCard
            iconTone="dashboard"
            title={copy.statUrgent}
            value={urgentTasks.length}
            icon={AlertCircle}
            className="p-5"
          />
        </div>
      </section>

      <div data-motion-reveal>
        <TodaysKnowledgePickCard
          dayKey={knowledgePickDayKey}
          userId={profile?.id}
          isUserLoading={profilePending}
        />
      </div>

      <div
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]"
        data-motion-reveal
      >
        <main className="min-w-0 space-y-6">
          <DashboardWeatherSlot today={today} />

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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Heart className="h-5 w-5" />
              </div>
              <h2 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{copy.gratefulTitle}</h2>
              <Link
                href={hrefGrateful}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-11 min-h-11 shrink-0 rounded-xl px-3 font-medium"
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
                      className="flex min-h-11 items-start gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-primary/10 md:max-xl:px-3 xl:px-2"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className={cn(!entry && "text-muted-foreground")}>
                        {entry?.content ?? copy.gratefulSlotEmpty(i)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </GlassTintPanel>
        </aside>
      </div>

      <div
        className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        data-motion-reveal
        data-stagger
      >
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
    </div>
  );
}
