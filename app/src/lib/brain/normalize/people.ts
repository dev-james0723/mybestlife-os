/**
 * People-domain normalizers.
 *
 * In the target Brain visualization, "Relationships" is one of the central
 * hubs. We import:
 *   - `relationships` rows as `relationship_person`
 *   - `role_models` rows as `role_model`
 *   - `career_network_nodes` whose `node_type === "person"` or `"organization"`
 *
 * Career network nodes whose type is `project` / `opportunity` are imported
 * as career_project nodes.
 */

import type {
  CareerNetworkNode,
  Relationship,
  RoleModel,
} from "@/types/database";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function relationshipsToBrainNodes(input: {
  rows: Relationship[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((r) =>
    makeBrainNode(
      {
        sourceId: r.id,
        type: "relationship_person",
        userId: input.userId,
        title: truncate(r.person_name || "Unnamed person"),
        summary: r.general_notes ?? undefined,
        bodyText: composeBody(
          r.general_notes,
          r.last_interaction_notes,
          r.preferences_and_details,
          r.commitments_made,
        ),
        tags: r.tags ?? [],
        categories: r.category ? [r.category] : undefined,
        sourceType: "relationships",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        importance: r.is_favorite ? 0.7 : 0.55,
        metadata: {
          relationship_strength: r.relationship_strength,
          is_favorite: r.is_favorite,
          linked_project_id: r.linked_project_id,
          linked_project_ids: r.linked_project_ids,
          linked_goal_ids: r.linked_goal_ids,
          linked_note_ids: r.linked_note_ids,
          linked_idea_ids: r.linked_idea_ids,
        },
      },
      { sourceModule: "relationship" },
    ),
  );
}

export function roleModelsToBrainNodes(input: {
  rows: RoleModel[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((r) =>
    makeBrainNode(
      {
        sourceId: r.id,
        type: "role_model",
        userId: input.userId,
        title: truncate(r.name || "Unnamed role model"),
        summary: r.bio ?? r.description ?? r.admiration_blurb ?? undefined,
        bodyText: composeBody(
          r.bio,
          r.description,
          r.admiration_blurb,
          r.notes,
          r.key_lessons?.map((k) => k.title).join(" · "),
          r.quotes?.map((q) => q.text).join(" · "),
        ),
        tags: r.tags ?? [],
        categories: r.category ? [r.category] : undefined,
        sourceType: "role_models",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        importance: 0.65,
        metadata: {
          is_favorite: r.is_favorite,
          linked_goal_ids: r.linked_goal_ids,
          linked_project_ids: r.linked_project_ids,
        },
      },
      { sourceModule: "role_model" },
    ),
  );
}

/**
 * Career network nodes contain a mix of people, organizations, projects,
 * and opportunities. We split them by `node_type` so each becomes the
 * right BrainNodeType.
 */
export function careerNetworkToBrainNodes(input: {
  rows: CareerNetworkNode[] | undefined;
  userId: string;
}): BrainNode[] {
  if (!input.rows) return [];
  const owned = input.rows.filter((r) => r.user_id === input.userId);
  return owned.map((n) => {
    const brainType =
      n.node_type === "person"
        ? "relationship_person"
        : n.node_type === "organization"
          ? "organization"
          : n.node_type === "project"
            ? "career_project"
            : "career_event";
    return makeBrainNode(
      {
        sourceId: n.id,
        type: brainType,
        userId: input.userId,
        title: truncate(n.name || "Career contact"),
        summary: n.subtitle ?? n.description ?? undefined,
        bodyText: composeBody(n.description, n.notes),
        tags: n.tags ?? [],
        categories: n.industry ? [n.industry] : undefined,
        sourceType: "career_network_nodes",
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        importance: 0.55,
        metadata: {
          node_type: n.node_type,
          opportunity_id: n.opportunity_id,
          industry: n.industry,
          last_interaction_date: n.last_interaction_date,
        },
      },
      { sourceModule: "relationship" },
    );
  });
}
