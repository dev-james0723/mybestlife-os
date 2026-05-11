/**
 * Journal adapter — emits `journal_entry` nodes and edges from
 * `linked_project_ids` / `linked_task_ids`.
 */

import type { JournalEntry } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function journalToGraph(input: {
  rows: JournalEntry[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const j of rows) {
    const id = nodeId("journal_entry", j.id);
    const label = `Journal — ${j.entry_date}`;
    nodes.push({
      id,
      userId: input.userId,
      label,
      type: "journal_entry",
      journalEntryId: j.id,
      description: j.content
        ? truncate(j.content, 140)
        : j.ai_summary
          ? truncate(j.ai_summary, 140)
          : undefined,
      createdAt: j.created_at,
      updatedAt: j.updated_at,
      metadata: {
        entry_date: j.entry_date,
        needs: j.needs,
      },
    });

    for (const projectId of j.linked_project_ids ?? []) {
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

    for (const taskId of j.linked_task_ids ?? []) {
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
