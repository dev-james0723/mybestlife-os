/**
 * Journal adapter — emits `journal_entry` nodes and edges from
 * `project_ids` / `task_ids` (camelCase in the JournalEntry TS shape).
 */

import type { JournalEntry } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, truncate } from "./_shared";

export function journalToGraph(input: {
  rows: JournalEntry[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = (input.rows ?? []).filter((r) => r.userId === input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const j of rows) {
    const id = nodeId("journal_entry", j.id);
    const label = `Journal — ${j.entryDate}`;
    const firstBullet = j.bullets?.items?.[0];
    const aiNarrative =
      j.aiOutput && typeof j.aiOutput === "object" && !Array.isArray(j.aiOutput)
        ? (j.aiOutput as { journalEntry?: string }).journalEntry
        : undefined;
    nodes.push({
      id,
      userId: input.userId,
      label,
      type: "journal_entry",
      journalEntryId: j.id,
      description: firstBullet
        ? truncate(firstBullet, 140)
        : aiNarrative
          ? truncate(aiNarrative, 140)
          : undefined,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
      metadata: {
        entry_date: j.entryDate,
        topic: j.topic,
        quadrant: j.quadrant,
        primary_emotion: j.primaryEmotion,
        intensity: j.intensity,
        needs: j.needs.items,
      },
    });

    for (const projectId of j.projectIds ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", projectId),
          sourceType: "journal_entry",
          targetType: "project",
          type: "journal_project",
          weight: 0.55,
        }),
      );
    }

    for (const taskId of j.taskIds ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("task", taskId),
          sourceType: "journal_entry",
          targetType: "task",
          type: "journal_task",
          weight: 0.5,
        }),
      );
    }
  }

  return { nodes, edges };
}
