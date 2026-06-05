import { randomUUID } from "crypto";
import type { WorkflowContextBundle } from "@/lib/life-agent/workflow-context";
import { buildRadarOpenLoops, groupOpenLoops } from "@/lib/life-agent/open-loop-radar";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type {
  LifeAgentPeopleFollowUp,
  LifeAgentProjectBottleneck,
  LifeBriefResponse,
} from "@/lib/life-agent/workflow-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import { isOverdue } from "@/lib/utils/date";

function timeGreeting(referenceDate: Date): string {
  const h = referenceDate.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function buildFocusSuggestions(
  ctx: WorkflowContextBundle,
  loops: ReturnType<typeof buildRadarOpenLoops>,
): string[] {
  const suggestions: string[] = [];
  const urgent = loops.filter((l) => l.category === "urgent").slice(0, 2);
  for (const loop of urgent) {
    suggestions.push(loop.title + (loop.detail ? ` — ${loop.detail}` : ""));
  }

  const rel = loops.filter((l) => l.category === "relationship").slice(0, 2);
  for (const loop of rel) {
    suggestions.push(loop.title);
  }

  const projects = ctx.sources.projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  const taskCounts = new Map<string, number>();
  for (const t of ctx.sources.tasks) {
    if (t.status === "done" || t.status === "cancelled" || !t.project_id) continue;
    taskCounts.set(t.project_id, (taskCounts.get(t.project_id) ?? 0) + 1);
  }
  const clustered = projects.filter((p) => (taskCounts.get(p.id) ?? 0) >= 3).slice(0, 1);
  for (const p of clustered) {
    suggestions.push(`${p.name} has several open tasks clustering again`);
  }

  const stalled = loops.filter((l) => l.kind === "project_without_next_action").slice(0, 1);
  for (const loop of stalled) {
    suggestions.push(`${loop.title} has no clear next action`);
  }

  if (suggestions.length === 0 && ctx.sources.tasks.length === 0) {
    suggestions.push("Your slate looks relatively open — a good moment to choose one meaningful focus.");
  }

  return suggestions.slice(0, 5);
}

function buildPeopleFollowUp(ctx: WorkflowContextBundle): LifeAgentPeopleFollowUp[] {
  return ctx.sources.relationships
    .filter((r) => r.next_action?.trim())
    .slice(0, 6)
    .map((r) => ({
      id: r.id,
      name: r.person_name,
      nextAction: r.next_action!,
      nextActionDate: r.next_action_date,
    }));
}

function buildProjectBottlenecks(ctx: WorkflowContextBundle): LifeAgentProjectBottleneck[] {
  const active = ctx.sources.projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  const openTasksByProject = new Map<string, number>();
  for (const t of ctx.sources.tasks) {
    if (!t.project_id || t.status === "done" || t.status === "cancelled") continue;
    openTasksByProject.set(t.project_id, (openTasksByProject.get(t.project_id) ?? 0) + 1);
  }

  const bottlenecks: LifeAgentProjectBottleneck[] = [];
  for (const p of active) {
    const count = openTasksByProject.get(p.id) ?? 0;
    if (count === 0) {
      bottlenecks.push({ id: p.id, name: p.name, reason: "No open tasks linked" });
    } else if (count >= 4) {
      bottlenecks.push({
        id: p.id,
        name: p.name,
        reason: `${count} open tasks — may need triage`,
      });
    }
  }
  return bottlenecks.slice(0, 5);
}

function buildGentleReflection(ctx: WorkflowContextBundle): string | undefined {
  const recent = ctx.sources.journalEntries[0];
  if (recent) {
    return `Your recent journal touched on “${recent.topic}” (${recent.primaryEmotion}).`;
  }
  const grateful = ctx.sources.gratefulEntries[0];
  if (grateful) {
    return "You recently noted something you're grateful for — worth carrying that tone into today.";
  }
  return undefined;
}

function buildSuggestedActions(
  loops: ReturnType<typeof buildRadarOpenLoops>,
  people: LifeAgentPeopleFollowUp[],
): LifeAgentSuggestedAction[] {
  const actions: LifeAgentSuggestedAction[] = [];
  for (const loop of loops.filter((l) => l.category === "urgent" || l.category === "important").slice(0, 2)) {
    if (loop.kind === "incomplete_task" || loop.kind === "overdue_task") {
      actions.push({
        id: randomUUID(),
        type: "create_task",
        title: `Follow up: ${loop.title}`,
        description: loop.detail ?? "Address this open loop",
        payload: { title: loop.title },
        status: "preview",
      });
    }
  }
  for (const person of people.slice(0, 1)) {
    actions.push({
      id: randomUUID(),
      type: "update_relationship",
      title: `Follow up with ${person.name}`,
      description: person.nextAction,
      payload: {
        relationship_id: person.id,
        next_action: person.nextAction,
        next_action_date: person.nextActionDate,
      },
      status: "preview",
    });
  }
  return actions.slice(0, 4);
}

export async function buildDailyBrief(
  supabase: SupabaseClient,
  userId: string,
  ctx: WorkflowContextBundle,
  displayName: string | null,
  referenceDate: Date = new Date(),
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<LifeBriefResponse> {
  const loops = buildRadarOpenLoops(ctx.sources, referenceDate);
  const groups = groupOpenLoops(loops);
  const people = buildPeopleFollowUp(ctx);
  const bottlenecks = buildProjectBottlenecks(ctx);
  const focusSuggestions = buildFocusSuggestions(ctx, loops);
  const name = displayName?.trim() || "there";
  const greeting = `${timeGreeting(referenceDate)}, ${name}.`;
  const gentleReflection = buildGentleReflection(ctx);
  const suggestedActions = buildSuggestedActions(loops, people);

  const { previews: actionPreviews, invalidCount } = await createPreviewsFromModelSuggestions(
    supabase,
    userId,
    suggestedActions.map((a) => ({
      type: a.type,
      title: a.title,
      description: a.description,
      payload: a.payload,
    })),
    null,
    sessionGrants,
  );

  const warnings = [...ctx.warnings];
  if (invalidCount > 0) {
    warnings.push(`${invalidCount} suggested action(s) could not be structured.`);
  }

  const overdueCount = ctx.sources.tasks.filter(
    (t) => t.due_date && isOverdue(t.due_date) && t.status !== "done",
  ).length;

  let closingQuestion =
    "Would you like me to help you plan today gently, or clear open loops first?";
  if (overdueCount > 0) {
    closingQuestion =
      "Would you like to plan today realistically, or tackle a few open loops first?";
  }

  return {
    greeting,
    focusSuggestions,
    openLoops: loops,
    openLoopGroups: groups,
    peopleToFollowUp: people,
    projectBottlenecks: bottlenecks,
    gentleReflection,
    closingQuestion,
    suggestedActions,
    actionPreviews,
    memoryUsed: ctx.memoryUsed,
    warnings: warnings.length ? warnings : undefined,
  };
}
