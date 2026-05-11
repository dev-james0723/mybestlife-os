/**
 * Career adapter — emits `career_event` nodes from the `career_events`
 * timeline table. Cross-module links to projects/goals are deliberately not
 * derived here (the schema has no FK columns); use `brain_relations` for
 * those manual links.
 */

import type { CareerEvent } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function careerToGraph(input: {
  rows: CareerEvent[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((e): ConstellationNode => ({
    id: nodeId("career_event", e.id),
    userId: input.userId,
    label: truncate(e.title || `Career event ${e.event_type}`),
    type: "career_event",
    careerEventId: e.id,
    description: e.description ?? undefined,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
    metadata: {
      event_type: e.event_type,
      start_date: e.start_date,
      organization: e.organization,
    },
  }));
  return { nodes, edges: [] };
}
