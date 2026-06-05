import type { IntelligenceContextBundle } from "@/lib/life-agent/intelligence-context";
import type { LifeCoherenceResponse } from "@/lib/life-agent/intelligence-types";
import { buildGentleAccountability } from "@/lib/life-agent/intelligence/gentle-accountability";
import { isOverdue } from "@/lib/utils/date";

const ADMIN_PATTERN = /\b(admin|tax|invoice|email|schedule|logistics|paperwork|filing)\b/i;
const CREATIVE_PATTERN =
  /\b(music|art|creative|compose|festival|practice|perform|write|design|product)\b/i;

export function buildLifeCoherence(ctx: IntelligenceContextBundle): LifeCoherenceResponse {
  const alignedAreas: string[] = [];
  const frictionAreas: string[] = [];
  const suggestedAdjustments: string[] = [];

  const activeGoals = ctx.sources.goals.filter(
    (g) => g.status !== "completed" && g.status !== "cancelled",
  );
  const activeProjects = ctx.sources.projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  const openTasks = ctx.sources.tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  );

  const creativeGoals = activeGoals.filter((g) => CREATIVE_PATTERN.test(g.name));
  const adminTasks = openTasks.filter((t) => ADMIN_PATTERN.test(t.title));
  const creativeTasks = openTasks.filter((t) => CREATIVE_PATTERN.test(t.title));

  for (const goal of creativeGoals.slice(0, 3)) {
    const hasProject = activeProjects.some(
      (p) =>
        CREATIVE_PATTERN.test(p.name) ||
        p.name.toLowerCase().includes(goal.name.toLowerCase().slice(0, 8)),
    );
    if (hasProject || creativeTasks.some((t) => t.title.toLowerCase().includes(goal.name.toLowerCase().slice(0, 6)))) {
      alignedAreas.push(`“${goal.name}” has active work in your system.`);
    }
  }

  if (ctx.sources.relationships.some((r) => r.next_action?.trim())) {
    alignedAreas.push("Some relationships have clear next actions recorded.");
  }

  if (ctx.packet.identityContext?.coreValues?.length) {
    alignedAreas.push(
      `Your stated values (${ctx.packet.identityContext.coreValues.slice(0, 3).join(", ")}) are available as a compass.`,
    );
  }

  if (creativeGoals.length > 0 && adminTasks.length > creativeTasks.length + 2) {
    frictionAreas.push(
      "Creative ambitions appear in your goals, while open tasks lean toward admin and logistics.",
    );
    suggestedAdjustments.push(
      "Consider one protected block this week for deep creative work — even 90 minutes.",
    );
  }

  const overdue = openTasks.filter((t) => t.due_date && isOverdue(t.due_date));
  if (overdue.length >= 3) {
    frictionAreas.push(
      `${overdue.length} tasks are past due — urgency may be crowding slower, nourishing work.`,
    );
    suggestedAdjustments.push("Pick one overdue item to close or reschedule, and one to drop guilt-free.");
  }

  const journalTired = ctx.sources.journalEntries.filter((j) =>
    /\b(tired|exhaust|burnout|overwhelm)\b/i.test(`${j.topic} ${j.primaryEmotion}`),
  );
  if (journalTired.length >= 1 && openTasks.length >= 8) {
    frictionAreas.push(
      "Recent journal entries mention fatigue, while your task list is still fairly full.",
    );
    suggestedAdjustments.push("A minimum viable day might serve you better than adding more tasks.");
  }

  if (alignedAreas.length === 0 && activeGoals.length > 0) {
    alignedAreas.push(`${activeGoals.length} active goal(s) are on your radar.`);
  }

  if (frictionAreas.length === 0 && openTasks.length === 0) {
    frictionAreas.push("Not enough data to spot friction — your slate may be open or permissions may be limited.");
  }

  let coherenceSummary: string;
  if (frictionAreas.length > 0 && creativeGoals.length > 0) {
    coherenceSummary =
      "Your creative ambitions show up in goals and projects, but your open task list may be heavier on admin than deep artistic work. This might explain feeling productive without feeling fully nourished.";
  } else if (alignedAreas.length > frictionAreas.length) {
    coherenceSummary =
      "Several areas of your Life OS look reasonably aligned — goals, projects, and relationships point in similar directions. Small frictions may still be worth a gentle look.";
  } else {
    coherenceSummary =
      "From what your permitted Life OS data shows, there are both aligned areas and places where energy and tasks may be pulling in different directions. This is a pattern snapshot, not a verdict.";
  }

  const gentleAccountability = buildGentleAccountability(ctx);

  return {
    coherenceSummary,
    alignedAreas: alignedAreas.slice(0, 6),
    frictionAreas: frictionAreas.slice(0, 5),
    suggestedAdjustments: suggestedAdjustments.slice(0, 5),
    gentleAccountability,
    memoryUsed: ctx.memoryUsed,
    warnings: ctx.warnings.length ? ctx.warnings : undefined,
  };
}
