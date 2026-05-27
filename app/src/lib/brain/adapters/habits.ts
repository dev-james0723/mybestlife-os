/**
 * Habits adapter — emits `habit` nodes and cross-module edges derived from
 * the `habit_links` table (polymorphic FK to goal / project / task /
 * knowledge / timeline).
 */

import type { Habit, HabitLink } from "@/lib/habits/types";
import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

const LINK_KIND_TO_EDGE: Record<
  HabitLink["target_kind"],
  { edge: ConstellationEdgeType; targetType: ConstellationNodeType; nodeType: keyof typeof import("./_shared")["NODE_ID_PREFIX"] | null }
> = {
  goal: { edge: "habit_goal", targetType: "goal", nodeType: "goal" },
  project: { edge: "habit_project", targetType: "project", nodeType: "project" },
  task: { edge: "habit_task", targetType: "task", nodeType: "task" },
  knowledge: { edge: "habit_knowledge", targetType: "knowledge", nodeType: null },
  timeline: { edge: "timeline_relation", targetType: "career_event", nodeType: "career_event" },
  calendar_event: { edge: "timeline_relation", targetType: "daily_plan", nodeType: "daily_plan" },
  career_profile: { edge: "timeline_relation", targetType: "about_me", nodeType: "about_me" },
  ai_knowledge: { edge: "habit_knowledge", targetType: "ai_prompt", nodeType: "ai_prompt" },
  planner_block: { edge: "habit_task", targetType: "daily_plan", nodeType: "daily_plan" },
  health_metric: { edge: "goal_habit", targetType: "health_goal", nodeType: "health_goal" },
  journal_pattern: { edge: "timeline_relation", targetType: "journal_entry", nodeType: "journal_entry" },
};

export function habitsToGraph(input: {
  habits: Habit[] | undefined;
  links: HabitLink[] | undefined;
  userId: string;
}): AdapterOutput {
  const habits = ownedBy(input.habits, input.userId);
  const links = ownedBy(input.links, input.userId);

  const nodes: ConstellationNode[] = habits.map((h): ConstellationNode => ({
    id: nodeId("habit", h.id),
    userId: input.userId,
    label: truncate(h.name || "Untitled habit"),
    type: "habit",
    habitId: h.id,
    description: h.description ?? undefined,
    importance: h.is_active ? 0.8 : 0.5,
    createdAt: h.created_at,
    updatedAt: h.updated_at,
    metadata: {
      type: h.type,
      time_of_day: h.time_of_day,
    },
  }));

  const edges: ConstellationEdge[] = [];
  const habitIds = new Set(habits.map((h) => h.id));

  for (const link of links) {
    if (!habitIds.has(link.habit_id)) continue;
    const meta = LINK_KIND_TO_EDGE[link.target_kind];
    if (!meta) continue;
    const source = nodeId("habit", link.habit_id);
    // Knowledge nodes are owned by the KB engine; we link directly to
    // their canonical id rather than namespacing.
    const target =
      meta.nodeType === null
        ? link.target_id
        : nodeId(meta.nodeType, link.target_id);
    edges.push(
      makeEdge({
        userId: input.userId,
        source,
        target,
        sourceType: "habit",
        targetType: meta.targetType,
        type: meta.edge,
      }),
    );
  }

  return { nodes, edges };
}
