/**
 * Habit-link edges.
 *
 * `habit_links` is a polymorphic FK table: each row connects one habit to
 * a goal, project, task, knowledge item, or timeline event. We translate
 * it into explicit edges so the relationship engine and the canvas treat
 * it like any other FK link.
 */

import type { HabitLink } from "@/lib/habits/types";
import type { BrainEdge, BrainNodeType } from "@/types/brain-graph";
import { makeBrainNodeId } from "@/lib/brain/compat";
import { buildEdge } from "./scoreEdge";

const KIND_TO_TARGET: Record<
  HabitLink["target_kind"],
  { nodeType: BrainNodeType; reasonVerb: string }
> = {
  goal: { nodeType: "goal", reasonVerb: "supports" },
  project: { nodeType: "project", reasonVerb: "supports" },
  task: { nodeType: "task", reasonVerb: "supports" },
  knowledge: { nodeType: "knowledge_card", reasonVerb: "informs" },
  timeline: { nodeType: "career_event", reasonVerb: "marks" },
};

export function generateHabitLinkEdges(input: {
  rows: HabitLink[] | undefined;
  userId: string;
  knownNodeIds: ReadonlySet<string>;
}): BrainEdge[] {
  if (!input.rows) return [];
  const out: BrainEdge[] = [];
  for (const link of input.rows) {
    if (link.user_id !== input.userId) continue;
    const targetMeta = KIND_TO_TARGET[link.target_kind];
    if (!targetMeta) continue;
    const sourceNodeId = makeBrainNodeId("habit", link.habit_id);
    const targetNodeId = makeBrainNodeId(targetMeta.nodeType, link.target_id);
    if (!input.knownNodeIds.has(sourceNodeId)) continue;
    if (!input.knownNodeIds.has(targetNodeId)) continue;

    out.push(
      buildEdge({
        userId: input.userId,
        sourceNodeId,
        targetNodeId,
        sourceNodeType: "habit",
        targetNodeType: targetMeta.nodeType,
        type:
          link.target_kind === "goal"
            ? "supports_goal"
            : link.target_kind === "task"
              ? "linked_to_task"
              : link.target_kind === "project"
                ? "linked_to_career"
                : "explicit_link",
        strength: 0.9,
        confidence: 0.95,
        reason: `Habit ${targetMeta.reasonVerb} this ${link.target_kind}.`,
        sourceMethod: "explicit",
        status: "confirmed",
        evidence: { habitLinkKind: link.target_kind },
      }),
    );
  }
  return out;
}
