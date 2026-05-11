/**
 * Ideas adapter — emits `idea` nodes and edges to projects (from
 * `linked_project_ids`) and to knowledge items (from
 * `linked_knowledge_item_ids`).
 */

import type { Idea } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function ideasToGraph(input: {
  rows: Idea[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const i of rows) {
    const id = nodeId("idea", i.id);
    const label = i.title?.trim() || truncate(i.content || "Untitled idea", 60);
    nodes.push({
      id,
      userId: input.userId,
      label,
      type: "idea",
      ideaId: i.id,
      description: i.content,
      tags: [...(i.ai_tags ?? []), ...(i.manual_tags ?? [])],
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      metadata: {
        status: i.status,
        capture_kind: i.capture_kind,
      },
    });

    for (const projectId of i.linked_project_ids ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", projectId),
          sourceType: "idea",
          targetType: "project",
          type: "idea_project",
          weight: 0.65,
        }),
      );
    }

    for (const knowledgeId of i.linked_knowledge_item_ids ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          // Knowledge node ids are owned by `buildConstellationData` and use
          // the raw knowledge item id — no namespace prefix.
          target: knowledgeId,
          sourceType: "idea",
          targetType: "knowledge",
          type: "idea_knowledge",
          weight: 0.55,
        }),
      );
    }
  }

  return { nodes, edges };
}
