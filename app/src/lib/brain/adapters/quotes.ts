/**
 * Quotes adapter — emits `quote` nodes and `quote_goal` edges (from
 * `quotes.linked_goal_id`).
 */

import type { Quote } from "@/types/quote";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function quotesToGraph(input: {
  rows: Quote[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const q of rows) {
    const id = nodeId("quote", q.id);
    nodes.push({
      id,
      userId: input.userId,
      label: truncate(q.quote_text, 70),
      type: "quote",
      quoteId: q.id,
      description: q.source_author ?? undefined,
      tags: q.tags ?? [],
      category: q.category ?? undefined,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
      metadata: {
        emotion_tone: q.emotion_tone,
        is_favorite: q.is_favorite,
      },
    });

    if (q.linked_goal_id) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("goal", q.linked_goal_id),
          sourceType: "quote",
          targetType: "goal",
          type: "quote_goal",
          weight: 0.7,
        }),
      );
    }
  }

  return { nodes, edges };
}
