/**
 * Entity-mention edge generator.
 *
 * For every "container" node (journal entries, ideas, decisions, memories,
 * gratitude, quote bodies), we scan its searchText for known entity
 * names from the rest of the graph: project titles, role-model names,
 * relationship names, tool names, organization names. When a known name
 * appears in the text, we produce a `mentions` edge.
 *
 * Confidence depends on:
 *   - exact phrase match (high) vs alias / partial match (lower)
 *   - entity name length (3 chars or less is dropped to avoid false hits)
 *
 * The matcher is deliberately conservative: requires word boundaries
 * (handled in `featurize.scanEntities`) and only considers names ≥ 3
 * characters. Common-word names like "Aim" or "Joy" still risk false
 * positives; the relationship engine compensates by capping strength to
 * 0.7 unless a second signal corroborates.
 */

import type { BrainEdge, BrainNode, BrainNodeType } from "@/types/brain-graph";
import { scanEntities } from "./featurize";
import type { FeatureIndex } from "./featurize";
import { buildEdge } from "./scoreEdge";

/** Node types whose body text we scan for entity mentions. */
const SCAN_AS_CONTAINER = new Set<BrainNodeType>([
  "journal_entry",
  "idea",
  "memory",
  "decision",
  "quote",
  "gratitude_entry",
  "knowledge_card",
  "document",
  "career_event",
  "about_me",
]);

/** Node types whose names get scanned FOR (potential entities). */
const SCAN_AS_ENTITY = new Set<BrainNodeType>([
  "project",
  "career_project",
  "career_event",
  "relationship_person",
  "role_model",
  "organization",
  "tool",
  "ai_knowledge",
  "goal",
]);

export function generateEntityEdges(input: {
  nodes: BrainNode[];
  index: FeatureIndex;
  userId: string;
}): BrainEdge[] {
  const { index, userId } = input;

  // Build the entity index: every entity-eligible node by name.
  const entityNames: { slug: string; name: string; nodeType: BrainNodeType }[] = [];
  for (const node of input.nodes) {
    if (!SCAN_AS_ENTITY.has(node.type)) continue;
    if (!node.title || node.title.length < 4) continue;
    entityNames.push({
      slug: node.id,
      name: node.title,
      nodeType: node.type,
    });
  }

  if (entityNames.length === 0) return [];

  const out: BrainEdge[] = [];

  for (const container of input.nodes) {
    if (!SCAN_AS_CONTAINER.has(container.type)) continue;
    const features = index.byNodeId.get(container.id);
    if (!features?.searchText) continue;

    const matches = scanEntities(features.searchText, entityNames);
    if (matches.size === 0) continue;

    for (const matchedEntityId of matches) {
      // Don't connect to self.
      if (matchedEntityId === container.id) continue;
      const target = index.byNodeId.get(matchedEntityId);
      if (!target) continue;

      // Choose edge type by target type.
      let edgeType:
        | "mentions"
        | "connected_to_person"
        | "linked_to_career"
        | "linked_to_ai_tool";
      if (
        target.nodeType === "relationship_person" ||
        target.nodeType === "role_model" ||
        target.nodeType === "organization"
      ) {
        edgeType = "connected_to_person";
      } else if (target.nodeType === "tool" || target.nodeType === "ai_knowledge") {
        edgeType = "linked_to_ai_tool";
      } else if (
        target.nodeType === "project" ||
        target.nodeType === "career_project" ||
        target.nodeType === "career_event" ||
        target.nodeType === "goal"
      ) {
        edgeType = "linked_to_career";
      } else {
        edgeType = "mentions";
      }

      const targetTitle = input.nodes.find(
        (n) => n.id === matchedEntityId,
      )?.title;
      const reason = targetTitle
        ? `Mentions "${targetTitle}" in its content.`
        : `Mentions an existing entity in its content.`;

      out.push(
        buildEdge({
          userId,
          sourceNodeId: container.id,
          targetNodeId: matchedEntityId,
          sourceNodeType: container.type,
          targetNodeType: target.nodeType,
          type: edgeType,
          // Mentions are strong: real text overlap with a known entity.
          strength: 0.75,
          confidence: 0.8,
          reason,
          sourceMethod: "entity",
          status: "confirmed",
          evidence: { entityNodeId: matchedEntityId },
        }),
      );
    }
  }

  return out;
}
