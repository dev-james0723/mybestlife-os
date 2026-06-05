import type { SupabaseClient } from "@supabase/supabase-js";
import { createActionPreviewFromValidated } from "@/lib/life-agent/action-preview-service";
import { validateActionPreviewInput } from "@/lib/life-agent/action-validator";
import { buildRadarOpenLoops } from "@/lib/life-agent/open-loop-radar";
import type { WorkflowContextBundle } from "@/lib/life-agent/workflow-context";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type {
  ClearOpenLoopsRequest,
  ClearOpenLoopsResponse,
  OpenLoopDisposition,
  RadarOpenLoop,
} from "@/lib/life-agent/workflow-types";

function dispositionToPreview(
  loop: RadarOpenLoop,
  disposition: OpenLoopDisposition,
): ReturnType<typeof validateActionPreviewInput> | null {
  switch (disposition) {
    case "do_now":
      if (loop.kind === "relationship_follow_up" || loop.kind === "open_promise") {
        return validateActionPreviewInput(
          "update_relationship_next_action",
          `Do now: ${loop.title}`,
          loop.detail ?? "Complete this follow-up",
          {
            relationship_id: loop.sourceId,
            next_action: loop.detail ?? loop.title,
          },
        );
      }
      return validateActionPreviewInput(
        "create_task",
        loop.title,
        `Do now: ${loop.detail ?? loop.title}`,
        { title: loop.title, priority: "high" },
      );
    case "schedule":
      return validateActionPreviewInput(
        "create_task",
        `Schedule: ${loop.title}`,
        loop.detail ?? "Schedule time for this",
        { title: loop.title },
      );
    case "delegate":
      return validateActionPreviewInput(
        "create_note",
        `Delegate: ${loop.title}`,
        loop.detail ?? "Who could help with this?",
        { title: `Delegate — ${loop.title}`, content: loop.detail ?? "" },
      );
    case "clarify":
      return validateActionPreviewInput(
        "create_note",
        `Clarify: ${loop.title}`,
        "What is the actual next step?",
        { title: `Clarify — ${loop.title}`, content: loop.detail ?? "" },
      );
    case "waiting":
      return validateActionPreviewInput(
        "create_task",
        `Waiting: ${loop.title}`,
        loop.detail ?? "Park until response",
        { title: `Waiting — ${loop.title}`, priority: "low" },
      );
    case "drop":
      return validateActionPreviewInput(
        "create_note",
        `Released: ${loop.title}`,
        "Consciously choosing to drop this loop for now",
        { title: `Dropped loop — ${loop.title}`, content: loop.detail ?? "" },
      );
    default:
      return null;
  }
}

export async function buildClearOpenLoopsPreviews(
  supabase: SupabaseClient,
  userId: string,
  ctx: WorkflowContextBundle,
  request: ClearOpenLoopsRequest,
  referenceDate: Date = new Date(),
  sessionGrants: LifeAgentPermissionDomain[] = [],
): Promise<ClearOpenLoopsResponse> {
  const loops = buildRadarOpenLoops(ctx.sources, referenceDate);
  const loopById = new Map(loops.map((l) => [l.id, l]));

  const previews: LifeAgentActionPreviewCard[] = [];
  let skipped = 0;

  for (const { loopId, disposition } of request.assignments) {
    const loop = loopById.get(loopId);
    if (!loop) {
      skipped += 1;
      continue;
    }
    const validated = dispositionToPreview(loop, disposition);
    if (!validated) {
      skipped += 1;
      continue;
    }
    const result = await createActionPreviewFromValidated(supabase, userId, validated, {
      conversationId: request.conversationId ?? null,
      sessionGrants,
    });
    if (result.ok) {
      previews.push(result.preview);
    } else {
      skipped += 1;
    }
  }

  const warnings = [...ctx.warnings];
  if (skipped > 0) {
    warnings.push(`${skipped} loop(s) could not be turned into action previews.`);
  }

  return {
    actionPreviews: previews,
    skipped,
    memoryUsed: ctx.memoryUsed,
    warnings: warnings.length ? warnings : undefined,
  };
}
