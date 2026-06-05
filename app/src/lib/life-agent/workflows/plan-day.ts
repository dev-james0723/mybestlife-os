import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import { buildRadarOpenLoops } from "@/lib/life-agent/open-loop-radar";
import type { WorkflowContextBundle } from "@/lib/life-agent/workflow-context";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type { EnergyLevel, PlanMyDayResponse } from "@/lib/life-agent/workflow-types";

const ENERGY_LIMITS: Record<
  EnergyLevel,
  { blocks: number; stretch: boolean; label: string }
> = {
  low: { blocks: 2, stretch: false, label: "Low energy — protect your capacity" },
  normal: { blocks: 4, stretch: true, label: "Normal energy — balanced day" },
  high_focus: { blocks: 5, stretch: true, label: "High focus — use deep work windows" },
  scattered: { blocks: 3, stretch: false, label: "Scattered — fewer context switches" },
  emotionally_tired: { blocks: 2, stretch: false, label: "Emotionally tired — gentler pace" },
};

function scoreTask(
  t: { priority: string; due_date: string | null; title: string },
  referenceDate: Date,
): number {
  let s = 0;
  if (t.due_date) {
    const due = new Date(t.due_date);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
    const refDay = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
    ).getTime();
    s += dueDay < refDay ? 50 : 15;
  }
  if (t.priority === "urgent") s += 40;
  if (t.priority === "high") s += 25;
  return s;
}

export async function buildPlanMyDay(
  supabase: SupabaseClient,
  userId: string,
  ctx: WorkflowContextBundle,
  energyLevel: EnergyLevel,
  referenceDate: Date = new Date(),
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<PlanMyDayResponse> {
  const limits = ENERGY_LIMITS[energyLevel];
  const openTasks = ctx.sources.tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({ t, score: scoreTask(t, referenceDate) }))
    .sort((a, b) => b.score - a.score)
    .map(({ t }) => t);

  const loops = buildRadarOpenLoops(ctx.sources, referenceDate);
  const urgentLoops = loops.filter((l) => l.category === "urgent").slice(0, 2);

  const pick = (count: number) => openTasks.slice(0, count).map((t) => {
    const proj = t.project?.name ? ` (${t.project.name})` : "";
    const due = t.due_date ? ` — due ${t.due_date}` : "";
    return `${t.title}${proj}${due}`;
  });

  const morning = pick(Math.min(2, limits.blocks));
  const afternoon = pick(Math.min(limits.blocks, openTasks.length)).slice(
    morning.length ? 1 : 0,
    Math.min(2, limits.blocks),
  );
  const evening = pick(limits.blocks).slice(-1);

  const minimumViableDay: string[] = [];
  if (openTasks[0]) minimumViableDay.push(`One priority: ${openTasks[0].title}`);
  if (urgentLoops[0]) minimumViableDay.push(`Touch one loop: ${urgentLoops[0].title}`);
  if (minimumViableDay.length === 0) {
    minimumViableDay.push("Rest, one small admin task, or intentional recovery.");
  }

  const optionalStretch: string[] = [];
  if (limits.stretch && openTasks[limits.blocks]) {
    optionalStretch.push(openTasks[limits.blocks].title);
  }
  for (const h of ctx.sources.habits.filter((h) => h.is_active).slice(0, 1)) {
    optionalStretch.push(`Habit: ${h.name}`);
  }

  const suggestedActions: LifeAgentSuggestedAction[] = openTasks.slice(0, 2).map((t) => ({
    id: randomUUID(),
    type: "create_task",
    title: `Block time: ${t.title}`,
    description: `Schedule focused time for this task today (${limits.label})`,
    payload: { title: t.title, due_date: referenceDate.toISOString().slice(0, 10) },
    status: "preview",
  }));

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
  if (invalidCount > 0) warnings.push(`${invalidCount} action(s) could not be structured.`);

  return {
    energyLevel,
    morning: morning.length ? morning : ["Gentle start — no urgent tasks surfaced"],
    afternoon: afternoon.length ? afternoon : ["Open block for follow-through"],
    evening: evening.length ? evening : ["Light wrap-up and tomorrow preview"],
    minimumViableDay,
    optionalStretch,
    memoryUsed: ctx.memoryUsed,
    suggestedActions,
    actionPreviews,
    warnings: warnings.length ? warnings : undefined,
  };
}
