import { differenceInCalendarDays, isAfter, max as maxDate } from "date-fns";

import type { DailyPlan, Project, Task } from "@/types/database";
import {
  formatShortDate,
  isDateInRange,
  parseAnyDate,
  percent,
  round,
} from "./date-range";
import type {
  AnalyticsRange,
  ProjectMomentumCard,
  ProjectMomentumMap,
  ProjectMomentumState,
} from "./types";

const PROJECT_STATE_LABELS: Record<ProjectMomentumState, string> = {
  accelerating: "Accelerating",
  steady: "Steady",
  quiet: "Quiet",
  stuck: "Stuck",
  overloaded: "Overloaded",
  ready_to_finish: "Ready to finish",
};

function countPlanMentions(projectTasks: Task[], dailyPlans: DailyPlan[]): number {
  const taskIds = new Set(projectTasks.map((task) => task.id));
  let count = 0;
  for (const plan of dailyPlans) {
    for (const planned of plan.tasks ?? []) {
      if (planned.taskId && taskIds.has(planned.taskId)) count += 1;
    }
    for (const planned of plan.free_tasks ?? []) {
      if (planned.taskId && taskIds.has(planned.taskId)) count += 1;
    }
  }
  return count;
}

function latestActivityISO(project: Project, projectTasks: Task[]): string | null {
  const candidates = [
    parseAnyDate(project.updated_at),
    ...projectTasks.flatMap((task) => [
      parseAnyDate(task.completed_at),
      parseAnyDate(task.updated_at),
      parseAnyDate(task.created_at),
    ]),
  ].filter((date): date is Date => Boolean(date));

  if (candidates.length === 0) return null;
  return maxDate(candidates).toISOString();
}

function resolveMomentumState(input: {
  project: Project;
  linkedTasksCount: number;
  completedInRange: number;
  completedPreviousRange: number;
  overdueTasks: number;
  urgentOpenTasks: number;
  openTasks: number;
  plannedMentions: number;
  lastActivityISO: string | null;
  range: AnalyticsRange;
}): ProjectMomentumState {
  const lastActivity = parseAnyDate(input.lastActivityISO);
  const daysSinceActivity = lastActivity
    ? differenceInCalendarDays(new Date(), lastActivity)
    : null;

  if (input.overdueTasks >= 3 || input.urgentOpenTasks >= 2) return "overloaded";
  if (
    input.linkedTasksCount > 0 &&
    input.openTasks <= 2 &&
    input.completedInRange > 0 &&
    input.overdueTasks === 0
  ) {
    return "ready_to_finish";
  }
  if (
    input.project.status === "active" &&
    input.openTasks > 0 &&
    input.overdueTasks > 0 &&
    (daysSinceActivity == null || daysSinceActivity > Math.min(21, input.range.days))
  ) {
    return "stuck";
  }
  if (
    input.completedInRange >= 3 &&
    input.completedInRange > input.completedPreviousRange
  ) {
    return "accelerating";
  }
  if (input.completedInRange > 0 || input.plannedMentions > 0) return "steady";
  return "quiet";
}

function projectInterpretation(card: ProjectMomentumCard): string {
  if (card.state === "accelerating") {
    return `${card.completedInRange} completions in range; momentum is increasing without needing a warning label.`;
  }
  if (card.state === "ready_to_finish") {
    return `${card.openTasks} open task${card.openTasks === 1 ? "" : "s"} remain. This is a finishing candidate.`;
  }
  if (card.state === "overloaded") {
    return `${card.overdueTasks} overdue task${card.overdueTasks === 1 ? "" : "s"} are attached. Reduce pressure before adding scope.`;
  }
  if (card.state === "stuck") {
    return "The project is active, overdue, and has not produced a recent completion.";
  }
  if (card.state === "steady") {
    return "There is visible movement, but not yet acceleration.";
  }
  return "No meaningful activity in this lens. Decide whether to restart, pause, or close it.";
}

export function computeProjectMomentumMap(params: {
  range: AnalyticsRange;
  projects: Project[];
  tasks: Task[];
  dailyPlans: DailyPlan[];
}): ProjectMomentumMap {
  const now = new Date();
  const visibleProjects = params.projects.filter(
    (project) => project.status !== "cancelled" && project.status !== "completed",
  );

  const cards = visibleProjects.map<ProjectMomentumCard>((project) => {
    const projectTasks = params.tasks.filter((task) => task.project_id === project.id);
    const completedInRange = projectTasks.filter(
      (task) =>
        task.status === "done" &&
        isDateInRange(task.completed_at, params.range.start, params.range.end),
    ).length;
    const completedPreviousRange = projectTasks.filter(
      (task) =>
        task.status === "done" &&
        isDateInRange(
          task.completed_at,
          params.range.previousStart,
          params.range.previousEnd,
        ),
    ).length;
    const overdueTasks = projectTasks.filter((task) => {
      const due = parseAnyDate(task.due_date);
      return (
        task.status !== "done" &&
        task.status !== "cancelled" &&
        due != null &&
        !isAfter(due, now)
      );
    }).length;
    const openTasks = projectTasks.filter(
      (task) => task.status !== "done" && task.status !== "cancelled",
    ).length;
    const urgentOpenTasks = projectTasks.filter(
      (task) =>
        task.status !== "done" &&
        task.status !== "cancelled" &&
        (task.priority === "urgent" || task.priority === "high"),
    ).length;
    const plannedMentions = countPlanMentions(projectTasks, params.dailyPlans);
    const lastMeaningfulActivity = latestActivityISO(project, projectTasks);
    const progressPercent = round(
      percent(projectTasks.length - openTasks, Math.max(1, projectTasks.length)),
    );
    const state = resolveMomentumState({
      project,
      linkedTasksCount: projectTasks.length,
      completedInRange,
      completedPreviousRange,
      overdueTasks,
      urgentOpenTasks,
      openTasks,
      plannedMentions,
      lastActivityISO: lastMeaningfulActivity,
      range: params.range,
    });
    const card: ProjectMomentumCard = {
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      linkedTasksCount: projectTasks.length,
      completedInRange,
      overdueTasks,
      openTasks,
      plannedMentions,
      progressPercent,
      lastMeaningfulActivity,
      lastMeaningfulActivityLabel: formatShortDate(lastMeaningfulActivity),
      state,
      stateLabel: PROJECT_STATE_LABELS[state],
      interpretation: "",
    };
    return { ...card, interpretation: projectInterpretation(card) };
  });

  cards.sort((a, b) => {
    const rank: Record<ProjectMomentumState, number> = {
      overloaded: 0,
      stuck: 1,
      accelerating: 2,
      ready_to_finish: 3,
      steady: 4,
      quiet: 5,
    };
    return rank[a.state] - rank[b.state] || b.completedInRange - a.completedInRange;
  });

  const stateCounts = cards.reduce(
    (acc, project) => {
      acc[project.state] += 1;
      return acc;
    },
    {
      accelerating: 0,
      steady: 0,
      quiet: 0,
      stuck: 0,
      overloaded: 0,
      ready_to_finish: 0,
    } satisfies Record<ProjectMomentumState, number>,
  );

  const moving =
    stateCounts.accelerating + stateCounts.steady + stateCounts.ready_to_finish;
  const blocked = stateCounts.stuck + stateCounts.overloaded;
  const interpretation =
    cards.length === 0
      ? "No active projects yet. Add projects and link tasks to see momentum instead of isolated activity."
      : blocked > 0
        ? `${blocked} project${blocked === 1 ? " is" : "s are"} stuck or overloaded. Treat that as structural pressure, not personal failure.`
        : moving > 0
          ? `${moving} project${moving === 1 ? " is" : "s are"} visibly moving in this lens.`
          : "Projects are quiet in this range. This may be recovery, or it may be drift if the projects are still important.";

  return {
    projects: cards,
    stateCounts,
    interpretation,
  };
}
