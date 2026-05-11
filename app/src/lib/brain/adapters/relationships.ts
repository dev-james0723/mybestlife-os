/**
 * Relationships adapter — emits `person` nodes from the `relationships`
 * table and a project_reference edge from `linked_project_id`.
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

    if (r.linked_project_id) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", r.linked_project_id),
          sourceType: "person",
          targetType: "project",
          type: "person_reference",
          weight: 0.55,
        }),
      );
    }
  }

  return { nodes, edges };
}
