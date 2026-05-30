"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LayoutGrid,
  List,
  Table2,
  TimerReset,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GlassPanel } from "@/components/ui/glass-panel";
import type {
  ProjectMomentumCard,
  ProjectMomentumState,
  ProjectMomentumTask,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type ProjectView = "grid" | "list" | "table";

const STATE_STYLE: Record<ProjectMomentumState, string> = {
  accelerating: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  steady: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  quiet: "bg-muted text-muted-foreground",
  stuck: "bg-amber-500/12 text-amber-800 dark:text-amber-300",
  overloaded: "bg-rose-500/12 text-rose-800 dark:text-rose-300",
  ready_to_finish: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
};

const STATE_RING: Record<ProjectMomentumState, string> = {
  accelerating: "hsl(155 70% 44%)",
  steady: "hsl(205 84% 55%)",
  quiet: "hsl(var(--muted-foreground) / 0.45)",
  stuck: "hsl(38 90% 52%)",
  overloaded: "hsl(12 80% 56%)",
  ready_to_finish: "hsl(265 75% 62%)",
};

const VIEW_OPTIONS: Array<{ value: ProjectView; label: string; icon: LucideIcon }> = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "table", label: "Table", icon: Table2 },
];

function ProgressRing({ value, state }: { value: number; state: ProjectMomentumState }) {
  return (
    <div
      className="grid size-12 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${STATE_RING[state]} ${value * 3.6}deg, hsl(var(--muted) / 0.72) 0deg)`,
      }}
      aria-label={`${value}% complete`}
    >
      <div className="grid size-9 place-items-center rounded-full bg-background/92 text-[0.68rem] font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}

function ViewSwitch({
  value,
  onChange,
}: {
  value: ProjectView;
  onChange: (view: ProjectView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border/60 bg-background/35 p-1 backdrop-blur">
      {VIEW_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={active}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TaskIcon({ task }: { task: ProjectMomentumTask }) {
  if (task.completedInRange) return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />;
  if (task.isOverdue) return <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />;
  return <Clock3 className="size-3.5 shrink-0 text-muted-foreground" />;
}

function TaskPill({
  task,
  onClick,
  compact = false,
}: {
  task: ProjectMomentumTask;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/task flex min-w-0 items-center gap-2 rounded-lg border border-border/55 bg-background/42 px-2.5 py-2 text-left text-xs transition hover:border-primary/35 hover:bg-primary/8",
        compact && "py-1.5",
        task.isOverdue && "border-amber-500/25 bg-amber-500/8",
        task.completedInRange && "border-emerald-500/25 bg-emerald-500/8",
      )}
    >
      <TaskIcon task={task} />
      <span className="min-w-0 flex-1 truncate text-foreground/86 group-hover/task:text-foreground">
        {task.title}
      </span>
      {!compact ? (
        <span className="hidden shrink-0 text-muted-foreground sm:inline">
          {task.dueDateLabel}
        </span>
      ) : null}
    </button>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "watch" | "good";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/45 bg-background/35 p-3",
        tone === "watch" && "border-amber-500/25 bg-amber-500/8",
        tone === "good" && "border-emerald-500/25 bg-emerald-500/8",
      )}
    >
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  onTaskClick,
  list = false,
}: {
  project: ProjectMomentumCard;
  index: number;
  onTaskClick: (task: ProjectMomentumTask) => void;
  list?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      className={cn(
        "relative h-full overflow-hidden rounded-xl border border-border/60 bg-background/38 p-4 backdrop-blur-md",
        project.state === "accelerating" &&
          "shadow-[0_0_0_1px_hsl(155_70%_44%_/_0.08),0_18px_46px_-34px_hsl(155_70%_44%_/_0.7)]",
        project.state === "overloaded" &&
          "shadow-[0_0_0_1px_hsl(12_80%_52%_/_0.08),0_18px_46px_-34px_hsl(12_80%_52%_/_0.62)]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-4 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${STATE_RING[project.state]}, transparent)`,
        }}
      />
      <div className={cn("grid gap-4", list && "lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center")}>
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <ProgressRing value={project.progressPercent} state={project.state} />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold">{project.name}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge className={STATE_STYLE[project.state]}>{project.stateLabel}</Badge>
                <Badge variant="outline">{project.priority}</Badge>
                <Badge variant="outline">{project.status}</Badge>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span className="truncate">Last activity: {project.lastMeaningfulActivityLabel}</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {project.interpretation}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {project.tasks.length > 0 ? (
              project.tasks.slice(0, list ? 4 : 3).map((task) => (
                <TaskPill
                  key={task.id}
                  task={task}
                  compact={list}
                  onClick={() => onTaskClick(task)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                Link tasks to expose project movement.
              </div>
            )}
          </div>
        </div>
        <div className={cn("grid grid-cols-3 gap-2 text-center", list && "lg:grid-cols-1 lg:text-left")}>
          <MetricTile label={list ? "linked tasks" : "done"} value={list ? project.linkedTasksCount : project.completedInRange} tone={!list ? "good" : undefined} />
          <MetricTile label={list ? "done in lens" : "overdue"} value={list ? project.completedInRange : project.overdueTasks} tone={list ? "good" : project.overdueTasks > 0 ? "watch" : undefined} />
          <MetricTile label={list ? "overdue" : "planned"} value={list ? project.overdueTasks : project.plannedMentions} tone={list && project.overdueTasks > 0 ? "watch" : undefined} />
        </div>
      </div>
    </motion.article>
  );
}

function ProjectsTable({
  projects,
  onTaskClick,
}: {
  projects: ProjectMomentumCard[];
  onTaskClick: (project: ProjectMomentumCard, task: ProjectMomentumTask) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/30">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border/60 bg-muted/22 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Project</th>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Tasks</th>
            <th className="px-4 py-3 font-medium">Pressure</th>
            <th className="px-4 py-3 font-medium">Focus task</th>
            <th className="px-4 py-3 font-medium">Last activity</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const focusTask =
              project.tasks.find((task) => task.isOverdue) ??
              project.tasks.find((task) => task.status === "in-progress") ??
              project.tasks[0];
            return (
              <tr key={project.id} className="border-b border-border/45 last:border-b-0">
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate font-medium">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {project.status} · {project.priority}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATE_STYLE[project.state]}>{project.stateLabel}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${project.progressPercent}%`,
                          backgroundColor: STATE_RING[project.state],
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums">{project.progressPercent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {project.completedInRange}/{project.linkedTasksCount}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs",
                      project.overdueTasks > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-muted-foreground",
                    )}
                  >
                    <TimerReset className="size-3.5" />
                    {project.overdueTasks} overdue
                  </span>
                </td>
                <td className="max-w-[240px] px-4 py-3">
                  {focusTask ? (
                    <TaskPill
                      task={focusTask}
                      compact
                      onClick={() => onTaskClick(project, focusTask)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No linked tasks</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {project.lastMeaningfulActivityLabel}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProjectDetailDialog({
  project,
  selectedTaskId,
  onOpenChange,
}: {
  project: ProjectMomentumCard | null;
  selectedTaskId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const selectedTask = useMemo(
    () => project?.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [project, selectedTaskId],
  );

  return (
    <Dialog open={project != null} onOpenChange={onOpenChange}>
      <DialogContent size="3xl" className="max-h-[88vh] overflow-y-auto p-0">
        {project ? (
          <div>
            <div className="border-b border-border/60 bg-background/45 p-5">
              <DialogHeader className="pr-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-xl">{project.name}</DialogTitle>
                    <DialogDescription className="mt-2">
                      {project.interpretation}
                    </DialogDescription>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={STATE_STYLE[project.state]}>
                        {project.stateLabel}
                      </Badge>
                      <Badge variant="outline">{project.status}</Badge>
                      <Badge variant="outline">{project.priority} priority</Badge>
                    </div>
                  </div>
                  <ProgressRing value={project.progressPercent} state={project.state} />
                </div>
              </DialogHeader>
            </div>

            <div className="grid gap-4 p-5 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile label="linked tasks" value={project.linkedTasksCount} />
                  <MetricTile label="open tasks" value={project.openTasks} />
                  <MetricTile label="done in lens" value={project.completedInRange} tone="good" />
                  <MetricTile label="overdue" value={project.overdueTasks} tone={project.overdueTasks > 0 ? "watch" : undefined} />
                </div>
                <div className="rounded-xl border border-border/55 bg-background/35 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="size-4" />
                    Last meaningful activity
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.lastMeaningfulActivityLabel}
                  </p>
                </div>
                {selectedTask ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/8 p-4">
                    <p className="mb-2 text-sm font-medium">Selected task</p>
                    <p className="text-sm">{selectedTask.title}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{selectedTask.status}</Badge>
                      <Badge variant="outline">{selectedTask.priority}</Badge>
                      {selectedTask.isOverdue ? (
                        <Badge className="bg-amber-500/12 text-amber-800 dark:text-amber-300">
                          overdue
                        </Badge>
                      ) : null}
                      {selectedTask.completedInRange ? (
                        <Badge className="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                          completed
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
                  Linked task surface
                </p>
                {project.tasks.length > 0 ? (
                  project.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-xl border border-border/55 bg-background/35 p-3",
                        task.id === selectedTaskId && "border-primary/35 bg-primary/8",
                      )}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{task.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.status} · {task.priority}
                            {task.dueDate ? ` · due ${task.dueDateLabel}` : ""}
                          </p>
                        </div>
                        <TaskIcon task={task} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/15 p-4 text-sm text-muted-foreground">
                    Link tasks to this project to inspect movement from the map.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function ProjectMomentumMap({
  projects,
  interpretation,
}: {
  projects: ProjectMomentumCard[];
  interpretation: string;
}) {
  const [view, setView] = useState<ProjectView>("grid");
  const [selection, setSelection] = useState<{
    project: ProjectMomentumCard;
    taskId: string | null;
  } | null>(null);
  const visibleProjects = projects.slice(0, 12);

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">Project Momentum Map</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
        {projects.length > 0 ? <ViewSwitch value={view} onChange={setView} /> : null}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
          Link tasks to projects to see which projects are accelerating, quiet, stuck, or ready to finish.
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {visibleProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onTaskClick={(task) => setSelection({ project, taskId: task.id })}
            />
          ))}
        </div>
      ) : view === "list" ? (
        <div className="space-y-3">
          {visibleProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              list
              onTaskClick={(task) => setSelection({ project, taskId: task.id })}
            />
          ))}
        </div>
      ) : (
        <ProjectsTable
          projects={visibleProjects}
          onTaskClick={(project, task) => setSelection({ project, taskId: task.id })}
        />
      )}

      <ProjectDetailDialog
        project={selection?.project ?? null}
        selectedTaskId={selection?.taskId ?? null}
        onOpenChange={(open) => {
          if (!open) setSelection(null);
        }}
      />
    </GlassPanel>
  );
}
