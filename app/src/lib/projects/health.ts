import type { Project, Task } from "@/types/database";

export type HealthLevel = "good" | "warning" | "critical";

export interface ProjectHealth {
  score: number;
  level: HealthLevel;
  reasons: string[];
}

export interface ProjectMomentum {
  score: number;
  recentUpdates: number;
  taskVelocity: number;
}

const MS_PER_DAY = 86_400_000;

function daysSince(dateStr: string): number {
  return Math.max(0, (Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
}

function daysUntil(dateStr: string): number {
  return (new Date(dateStr).getTime() - Date.now()) / MS_PER_DAY;
}

export function computeProjectHealth(
  project: Project,
  projectTasks: Task[],
): ProjectHealth {
  let score = 100;
  const reasons: string[] = [];

  const daysSinceUpdate = daysSince(project.updated_at);
  if (daysSinceUpdate > 30) {
    score -= 40;
    reasons.push(`Last touched ${Math.round(daysSinceUpdate)} days ago`);
  } else if (daysSinceUpdate > 14) {
    score -= 25;
    reasons.push(`Last touched ${Math.round(daysSinceUpdate)} days ago`);
  } else if (daysSinceUpdate > 7) {
    score -= 10;
  }

  if (projectTasks.length > 0) {
    const overdueTasks = projectTasks.filter(
      (t) =>
        t.due_date &&
        t.status !== "done" &&
        t.status !== "cancelled" &&
        daysUntil(t.due_date) < 0,
    );
    if (overdueTasks.length > 0) {
      score -= Math.min(30, overdueTasks.length * 10);
      reasons.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""}`);
    }

    const completedRatio =
      projectTasks.filter((t) => t.status === "done").length /
      projectTasks.length;

    if (project.end_date) {
      const totalDays = Math.max(
        1,
        (new Date(project.end_date).getTime() -
          new Date(project.start_date ?? project.created_at).getTime()) /
          MS_PER_DAY,
      );
      const elapsed = daysSince(project.start_date ?? project.created_at);
      const timeRatio = Math.min(1, elapsed / totalDays);

      if (timeRatio > 0.5 && completedRatio < timeRatio * 0.5) {
        score -= 20;
        reasons.push("Progress lagging behind timeline");
      }
    }
  }

  if (
    (project.priority === "high" || project.priority === "urgent") &&
    score < 70
  ) {
    score -= 10;
    reasons.push(`High priority but ${score < 50 ? "critical" : "lagging"}`);
  }

  score = Math.max(0, Math.min(100, score));

  const level: HealthLevel =
    score >= 70 ? "good" : score >= 40 ? "warning" : "critical";

  return { score, level, reasons };
}

export function computeMomentumScore(
  project: Project,
  projectTasks: Task[],
): ProjectMomentum {
  const sevenDaysAgo = Date.now() - 7 * MS_PER_DAY;

  const recentUpdates =
    new Date(project.updated_at).getTime() > sevenDaysAgo ? 1 : 0;

  const recentlyCompletedTasks = projectTasks.filter(
    (t) =>
      t.status === "done" &&
      t.completed_at &&
      new Date(t.completed_at).getTime() > sevenDaysAgo,
  ).length;

  const recentlyCreatedTasks = projectTasks.filter(
    (t) => new Date(t.created_at).getTime() > sevenDaysAgo,
  ).length;

  const taskVelocity = recentlyCompletedTasks + recentlyCreatedTasks * 0.5;
  const score = Math.min(
    100,
    Math.round((recentUpdates * 20 + taskVelocity * 15) * 1.2),
  );

  return { score, recentUpdates, taskVelocity };
}

export function isProjectStale(project: Project): boolean {
  if (project.status === "completed" || project.status === "cancelled")
    return false;
  return daysSince(project.updated_at) >= 14;
}

export function staleDays(project: Project): number {
  return Math.round(daysSince(project.updated_at));
}

export function isDueThisWeek(project: Project): boolean {
  if (!project.end_date) return false;
  const d = daysUntil(project.end_date);
  return d >= 0 && d <= 7;
}

export function isAtRisk(project: Project, tasks: Task[]): boolean {
  if (!project.end_date) return false;
  const d = daysUntil(project.end_date);
  if (d > 3) return false;
  if (tasks.length === 0) return d <= 3;
  const doneRatio = tasks.filter((t) => t.status === "done").length / tasks.length;
  return doneRatio < 0.5;
}
