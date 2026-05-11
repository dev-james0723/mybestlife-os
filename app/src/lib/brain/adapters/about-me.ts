/**
 * About Me adapter — emits a single `about_me` singleton node that
 * represents the user. It acts as a high-importance gravity well. Edges to
 * other modules (e.g. core_values → goal) are not auto-derived; users can
 * link them manually via `brain_relations`.
 */

import type { AboutMe } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId } from "./_shared";

export function aboutMeToGraph(input: {
  row: AboutMe | null | undefined;
  userId: string;
}): AdapterOutput {
  if (!input.row) return { nodes: [], edges: [] };
  if (input.row.user_id !== input.userId) return { nodes: [], edges: [] };
  const r = input.row;
  const node: ConstellationNode = {
    id: nodeId("about_me", r.id),
    userId: input.userId,
    label: "About Me",
    type: "about_me",
    aboutMeId: r.id,
    description: r.mission ?? r.core_values ?? r.instruction_manual ?? undefined,
    importance: 1.0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
  return { nodes: [node], edges: [] };
}
