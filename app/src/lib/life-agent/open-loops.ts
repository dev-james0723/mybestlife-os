import { isOverdue } from "@/lib/utils/date";
import type {
  ContextOpenLoop,
  LifeAgentContextSources,
} from "@/lib/life-agent/context-types";
import { LIFE_AGENT_CONTEXT_CAPS } from "@/lib/life-agent/context-types";

const ACTION_NOTE_PATTERN =
  /\b(todo|to-do|follow up|call|email|send|schedule|buy|pay|book|finish|complete|remember)\b/i;

function parseNodeLabel(nodeId: string): string {
  const parts = nodeId.split("::");
  return parts.length > 1 ? parts.slice(1).join("::") : nodeId;
}

/**
 * First-pass open loop extraction from structured Life OS rows.
 */
export function extractOpenLoops(
  sources: LifeAgentContextSources,
  referenceDate: Date = new Date(),
): ContextOpenLoop[] {
  const loops: ContextOpenLoop[] = [];
  const refMs = referenceDate.getTime();

  for (const task of sources.tasks) {
    if (task.status === "done" || task.status === "cancelled") continue;
    const overdue = task.due_date ? isOverdue(task.due_date) : false;
    loops.push({
      id: `loop-task-${task.id}`,
      kind: overdue ? "overdue_task" : "incomplete_task",
      title: task.title,
      detail: task.due_date ? `Due ${task.due_date}` : undefined,
      sourceType: "task",
      sourceId: task.id,
      priority: overdue ? "high" : task.priority === "urgent" ? "high" : "medium",
    });
  }

  const activeProjects = sources.projects.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  const projectTaskCounts = new Map<string, number>();
  for (const task of sources.tasks) {
    if (!task.project_id || task.status === "done" || task.status === "cancelled") continue;
    projectTaskCounts.set(task.project_id, (projectTaskCounts.get(task.project_id) ?? 0) + 1);
  }
  for (const project of activeProjects) {
    if ((projectTaskCounts.get(project.id) ?? 0) > 0) continue;
    loops.push({
      id: `loop-project-${project.id}`,
      kind: "project_without_next_action",
      title: project.name,
      detail: "No open tasks linked to this project",
      sourceType: "project",
      sourceId: project.id,
      priority: "medium",
    });
  }

  for (const rel of sources.relationships) {
    if (rel.next_action?.trim()) {
      const dueSoon =
        rel.next_action_date &&
        !Number.isNaN(new Date(rel.next_action_date).getTime()) &&
        new Date(rel.next_action_date).getTime() <= refMs + 7 * 86400000;
      loops.push({
        id: `loop-rel-action-${rel.id}`,
        kind: "relationship_follow_up",
        title: `${rel.person_name}: ${rel.next_action}`,
        detail: rel.next_action_date ? `By ${rel.next_action_date}` : undefined,
        sourceType: "relationship",
        sourceId: rel.id,
        priority: dueSoon ? "high" : "medium",
      });
    }
    if (rel.commitments_made?.trim()) {
      loops.push({
        id: `loop-rel-promise-${rel.id}`,
        kind: "open_promise",
        title: rel.person_name,
        detail: rel.commitments_made,
        sourceType: "relationship",
        sourceId: rel.id,
        priority: "medium",
      });
    }
  }

  for (const doc of sources.documents) {
    if (!doc.expiration_date) continue;
    const exp = new Date(doc.expiration_date).getTime();
    if (Number.isNaN(exp)) continue;
    if (exp <= refMs + 90 * 86400000) {
      loops.push({
        id: `loop-doc-${doc.id}`,
        kind: "expiring_document",
        title: doc.name,
        detail: `Expires ${doc.expiration_date}`,
        sourceType: "document",
        sourceId: doc.id,
        priority: exp <= refMs ? "high" : "medium",
      });
    }
  }

  for (const asset of sources.assets) {
    if (!asset.document_id && !asset.notes?.trim()) {
      loops.push({
        id: `loop-asset-${asset.id}`,
        kind: "asset_missing_docs",
        title: asset.name,
        detail: "No linked documentation on file",
        sourceType: "asset",
        sourceId: asset.id,
        priority: "low",
      });
    }
  }

  const activeGoals = sources.goals.filter((g) => g.status === "active");
  const goalsWithTasks = new Set<string>();
  for (const task of sources.tasks) {
    if (task.status === "done" || task.status === "cancelled") continue;
    for (const goal of activeGoals) {
      if (task.title.toLowerCase().includes(goal.name.toLowerCase().slice(0, 12))) {
        goalsWithTasks.add(goal.id);
      }
    }
  }
  for (const goal of activeGoals) {
    if (goalsWithTasks.has(goal.id)) continue;
    loops.push({
      id: `loop-goal-${goal.id}`,
      kind: "goal_without_task",
      title: goal.name,
      detail: "No obvious active tasks reference this goal",
      sourceType: "goal",
      sourceId: goal.id,
      priority: "low",
    });
  }

  for (const note of sources.notes) {
    const blob = `${note.title} ${note.content ?? ""}`;
    if (ACTION_NOTE_PATTERN.test(blob)) {
      loops.push({
        id: `loop-note-${note.id}`,
        kind: "note_action_hint",
        title: note.title,
        detail: "Note text suggests a possible action",
        sourceType: "note",
        sourceId: note.id,
        priority: "low",
      });
    }
  }

  const priorityRank = { high: 0, medium: 1, low: 2 };
  loops.sort(
    (a, b) =>
      priorityRank[a.priority ?? "medium"] - priorityRank[b.priority ?? "medium"],
  );

  return loops.slice(0, LIFE_AGENT_CONTEXT_CAPS.maxOpenLoops);
}

export function brainNodeTitleFromId(nodeId: string): string {
  return parseNodeLabel(nodeId);
}
