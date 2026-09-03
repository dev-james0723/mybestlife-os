/**
 * Relationships adapter — emits `person` nodes from the `relationships`
 * table and reference edges from its explicit project/goal/idea links.
 *
 * Note: KB constellation also has the concept of `person` nodes via its
 * `entities` input (not used by the Brain). The Brain owns this namespace
 * via `nodeId("person", id)` while the KB engine uses `ent:person:` —
 * different prefixes, no collision.
 */

import type { Relationship } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function relationshipsToGraph(input: {
  rows: Relationship[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const r of rows) {
    const id = nodeId("person", r.id);
    nodes.push({
      id,
      userId: input.userId,
      label: truncate(r.person_name || "Unnamed contact"),
      type: "person",
      relationshipId: r.id,
      description: r.general_notes ?? undefined,
      tags: r.tags ?? [],
      category: r.category,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      metadata: {
        relationship_strength: r.relationship_strength,
        is_favorite: r.is_favorite,
      },
    });

    const projectIds = new Set(
      r.linked_project_ids.length > 0
        ? r.linked_project_ids
        : r.linked_project_id
          ? [r.linked_project_id]
          : [],
    );
    for (const projectId of projectIds) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", projectId),
          sourceType: "person",
          targetType: "project",
          type: "person_reference",
          weight: 0.55,
        }),
      );
    }

    for (const goalId of r.linked_goal_ids) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("goal", goalId),
          sourceType: "person",
          targetType: "goal",
          type: "person_reference",
          weight: 0.6,
        }),
      );
    }

    for (const ideaId of r.linked_idea_ids) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("idea", ideaId),
          sourceType: "person",
          targetType: "idea",
          type: "person_reference",
          weight: 0.5,
        }),
      );
    }
  }

  return { nodes, edges };
}
