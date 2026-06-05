import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPreviewsFromModelSuggestions } from "@/lib/life-agent/action-preview-service";
import { buildRadarOpenLoops, groupOpenLoops } from "@/lib/life-agent/open-loop-radar";
import type { WorkflowContextBundle } from "@/lib/life-agent/workflow-context";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type { OpenLoopsResponse } from "@/lib/life-agent/workflow-types";

function buildSuggestedActions(
  loops: ReturnType<typeof buildRadarOpenLoops>,
): LifeAgentSuggestedAction[] {
  return loops.slice(0, 4).map((loop) => {
    if (loop.kind === "relationship_follow_up" || loop.kind === "open_promise") {
      return {
        id: randomUUID(),
        type: "update_relationship" as const,
        title: loop.title,
        description: loop.detail ?? "Relationship follow-up",
        payload: { relationshipId: loop.sourceId },
        status: "preview" as const,
      };
    }
    return {
      id: randomUUID(),
      type: "create_task" as const,
      title: loop.title,
      description: loop.detail ?? "Address this open loop",
      payload: { title: loop.title },
      status: "preview" as const,
    };
  });
}

export async function buildOpenLoopsAnalysis(
  supabase: SupabaseClient,
  userId: string,
  ctx: WorkflowContextBundle,
  referenceDate: Date = new Date(),
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<OpenLoopsResponse> {
  const loops = buildRadarOpenLoops(ctx.sources, referenceDate);
  const groups = groupOpenLoops(loops);

  const total = loops.length;
  const summary =
    total === 0
      ? "I did not find quiet loops right now — your visible slate looks relatively clear."
      : total <= 3
        ? `I found a few quiet loops (${total}), not emergencies — just things that may appreciate attention when you have space.`
        : `I found ${total} open loops across your Life OS. None of this is alarmist — they are simply unfinished threads worth noticing.`;

  const suggestedActions = buildSuggestedActions(loops);
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
    summary,
    openLoops: loops,
    groups,
    memoryUsed: ctx.memoryUsed,
    suggestedActions,
    actionPreviews,
    warnings: warnings.length ? warnings : undefined,
  };
}
