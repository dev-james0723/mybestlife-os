"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageShell } from "@/components/shared/page-shell";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingPage } from "@/components/shared/loading-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useGoals } from "@/hooks/use-goals";
import { useJournalEntries } from "@/hooks/use-journal";
import { useJapaneseStudySessions } from "@/hooks/use-japanese-study";
import { CheckCircle2, FolderKanban, BookOpen, NotebookPen } from "lucide-react";
import type { Project } from "@/types/database";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 48%)",
  "hsl(0 72% 51%)",
];

export default function AnalyticsPage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).analytics;
  const { data: tasks, isLoading: tasksLoading } = useTasks();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: goals, isLoading: goalsLoading } = useGoals();
  const { data: journalEntries, isLoading: journalLoading } = useJournalEntries();
  const { data: studySessions, isLoading: studyLoading } = useJapaneseStudySessions();

  const taskStatusChart = useMemo(() => {
    const counts = { todo: 0, "in-progress": 0, done: 0, cancelled: 0 };
    for (const t of tasks ?? []) {
      counts[t.status] += 1;
    }
    return [
      { status: ui.taskStatusTodo, count: counts.todo },
      { status: ui.taskStatusInProgress, count: counts["in-progress"] },
      { status: ui.taskStatusDone, count: counts.done },
      { status: ui.taskStatusCancelled, count: counts.cancelled },
    ];
  }, [tasks, ui.taskStatusCancelled, ui.taskStatusDone, ui.taskStatusInProgress, ui.taskStatusTodo]);

  const projectPieData = useMemo(() => {
    const projectStatusLabel: Record<Project["status"], string> = {
      planning: ui.projectStatusPlanning,
      active: ui.projectStatusActive,
      paused: ui.projectStatusPaused,
      completed: ui.projectStatusCompleted,
      cancelled: ui.projectStatusCancelled,
    };
    const byStatus = new Map<string, number>();
    for (const p of projects ?? []) {
      byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
    }
    return [...byStatus.entries()].map(([status, value]) => ({
      name: projectStatusLabel[status as Project["status"]] ?? status,
      value,
    }));
  }, [
    projects,
    ui.projectStatusActive,
    ui.projectStatusCancelled,
    ui.projectStatusCompleted,
    ui.projectStatusPaused,
    ui.projectStatusPlanning,
  ]);

  const completedTasks = useMemo(
    () => (tasks ?? []).filter((t) => t.status === "done").length,
    [tasks]
  );

  const activeProjects = useMemo(
    () => (projects ?? []).filter((p) => p.status === "active").length,
    [projects]
  );

  const studyHoursTotal = useMemo(() => {
    const minutes = (studySessions ?? []).reduce((sum, s) => sum + s.duration_minutes, 0);
    return Math.round((minutes / 60) * 10) / 10;
  }, [studySessions]);

  const activeGoalsCount = useMemo(
    () => (goals ?? []).filter((g) => g.status === "active").length,
    [goals]
  );

  const pageDescription = useMemo(() => {
    return ui.pageDescription(activeGoalsCount);
  }, [activeGoalsCount, ui]);

  const isLoading =
    tasksLoading || projectsLoading || goalsLoading || journalLoading || studyLoading;

  if (isLoading) return <LoadingPage />;

  return (
    <PageShell title={ui.pageTitle} description={pageDescription}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          title={ui.tasksCompletedTitle}
          value={completedTasks}
          icon={CheckCircle2}
          description={ui.tasksCompletedDescription}
        />
        <StatCard
          title={ui.activeProjectsTitle}
          value={activeProjects}
          icon={FolderKanban}
          description={ui.activeProjectsDescription}
        />
        <StatCard
          title={ui.studyHoursTitle}
          value={studyHoursTotal}
          icon={BookOpen}
          description={ui.studyHoursDescription}
        />
        <StatCard
          title={ui.journalEntriesTitle}
          value={journalEntries?.length ?? 0}
          icon={NotebookPen}
          description={ui.journalEntriesDescription}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{ui.tasksByStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ui.projectsByStatusTitle}</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            {projectPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">{ui.noProjectsYet}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {projectPieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
