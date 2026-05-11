/**
 * Bucket List adapter — emits `bucket_item` nodes and edges to projects
 * (`linked_project_id`) and tasks (`linked_task_ids`).
 */

import type { BucketItem } from "@/types/bucket-list";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function bucketListToGraph(input: {
  rows: BucketItem[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const b of rows) {
    const id = nodeId("bucket_item", b.id);
    nodes.push({
      id,
      userId: input.userId,
      label: truncate(b.title || "Untitled bucket item"),
      type: "bucket_item",
      bucketItemId: b.id,
      description: b.description ?? b.why_this_matters ?? undefined,
      tags: b.category_tags ?? [],
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      metadata: {
        status: b.status,
        type: b.type,
        priority: b.priority,
      },
    });

    if (b.linked_project_id) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", b.linked_project_id),
          sourceType: "bucket_item",
          targetType: "project",
          type: "bucket_project",
          weight: 0.65,
        }),
      );
    }

    for (const taskId of b.linked_task_ids ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("task", taskId),
          sourceType: "bucket_item",
          targetType: "task",
          type: "bucket_task",
          weight: 0.55,
        }),
      );
    }
  }

  return { nodes, edges };
}
