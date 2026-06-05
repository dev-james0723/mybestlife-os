import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import { buildRadarOpenLoops, groupOpenLoops } from "@/lib/life-agent/open-loop-radar";
import type { WorkflowContextBundle } from "@/lib/life-agent/workflow-context";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type { WeeklyReviewResponse } from "@/lib/life-agent/workflow-types";

export async function buildWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  ctx: WorkflowContextBundle,
  referenceDate: Date = new Date(),
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<WeeklyReviewResponse> {
  const loops = buildRadarOpenLoops(ctx.sources, referenceDate);
  const groups = groupOpenLoops(loops);

  const completedTasks = ctx.sources.tasks.filter((t) => t.status === "done").slice(0, 5);
  const wins = completedTasks.length
    ? completedTasks.map((t) => `Completed: ${t.title}`)
    : ["You kept showing up — even small steps count."];

  const patterns: string[] = [];
  if (ctx.sources.journalEntries.length >= 2) {
    const topics = ctx.sources.journalEntries
      .slice(0, 3)
      .map((j) => j.topic)
      .join(", ");
    patterns.push(`Journal themes lately: ${topics}`);
  }
  const activeGoals = ctx.sources.goals.filter((g) => g.status === "active");
  if (activeGoals.length) {
    patterns.push(`${activeGoals.length} active goal(s) still in motion`);
  }
  const bucketActive = ctx.sources.bucketItems.filter((b) => b.status !== "completed").length;
  if (bucketActive) {
    patterns.push(`${bucketActive} bucket-list dream(s) still alive`);
  }

  const focusForNextWeek = loops
    .filter((l) => l.category === "urgent" || l.category === "important")
    .slice(0, 4)
    .map((l) => l.title);

  if (focusForNextWeek.length === 0 && activeGoals[0]) {
    focusForNextWeek.push(`Reconnect with goal: ${activeGoals[0].name}`);
  }

  const gentleReflection =
    ctx.sources.gratefulEntries[0]?.content != null
      ? `Gratitude thread: ${ctx.sources.gratefulEntries[0].content.slice(0, 120)}`
      : undefined;

  const suggestedActions: LifeAgentSuggestedAction[] = focusForNextWeek.slice(0, 2).map(
    (title) => ({
      id: randomUUID(),
      type: "create_task",
      title: `Next week: ${title}`,
      description: "Carry this open loop into a concrete task",
      payload: { title },
      status: "preview",
    }),
  );

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
    headline: "Your week at a glance",
    wins,
    patterns,
    openLoops: loops,
    groups,
    focusForNextWeek,
    gentleReflection,
    memoryUsed: ctx.memoryUsed,
    suggestedActions,
    actionPreviews,
    warnings: warnings.length ? warnings : undefined,
  };
}
