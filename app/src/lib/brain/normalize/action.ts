/**
 * Normalizers for action / planning entities: projects, tasks, goals,
 * daily plans, habits, bucket-list items.
 *
 * These are the strongest hubs of the Brain — projects + goals get high
 * importance scores because a typical user organizes much of their life
 * around them, and they should look like the radial anchors in the
 * target image.
 */

import type {
  DailyPlan,
  Goal,
  Project,
  Task,
} from "@/types/database";
import type { Habit } from "@/lib/habits/types";
import type { BucketItem } from "@/types/bucket-list";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function projectsToBrainNodes(input: {
  rows: Project[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((p) =>
    makeBrainNode(
      {
        sourceId: p.id,
        type: "project",
        userId: input.userId,
        title: truncate(p.name || "Untitled project"),
        summary: p.description ?? undefined,
        bodyText: p.description ?? undefined,
        tags: p.tags ?? [],
        sourceType: "projects",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        importance: p.status === "active" ? 0.95 : 0.7,
        metadata: { status: p.status, priority: p.priority },
      },
      { sourceModule: "project" },
    ),
  );
}

export function goalsToBrainNodes(input: {
  rows: Goal[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((g) =>
    makeBrainNode(
      {
        sourceId: g.id,
        type: "goal",
        userId: input.userId,
        title: truncate(g.name || "Untitled goal"),
        summary: g.description ?? undefined,
        bodyText: g.description ?? undefined,
        tags: g.category ? [g.category] : [],
        sourceType: "goals",
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        importance: g.status === "active" ? 1.0 : 0.7,
        metadata: { status: g.status, target_date: g.target_date },
      },
      { sourceModule: "goal" },
    ),
  );
}

export function tasksToBrainNodes(input: {
  rows: Task[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((t) =>
    makeBrainNode(
      {
        sourceId: t.id,
        type: "task",
        userId: input.userId,
        title: truncate(t.title || "Untitled task"),
        summary: t.description ?? undefined,
        bodyText: t.description ?? undefined,
        tags: t.tags ?? [],
        sourceType: "tasks",
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        importance: 0.5,
        metadata: {
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          project_id: t.project_id,
        },
      },
      { sourceModule: "task" },
    ),
  );
}

export function habitsToBrainNodes(input: {
  rows: Habit[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((h) =>
    makeBrainNode(
      {
        sourceId: h.id,
        type: "habit",
        userId: input.userId,
        title: truncate(h.name || "Untitled habit"),
        summary: h.description ?? undefined,
        bodyText: h.description ?? undefined,
        sourceType: "habits",
        createdAt: h.created_at,
        updatedAt: h.updated_at,
        importance: h.is_active ? 0.7 : 0.4,
        metadata: { type: h.type, time_of_day: h.time_of_day },
      },
      { sourceModule: "habit" },
    ),
  );
}

export function dailyPlansToBrainNodes(input: {
  rows: DailyPlan[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((p) =>
    makeBrainNode(
      {
        sourceId: p.id,
        type: "daily_plan",
        userId: input.userId,
        title: `Daily Plan — ${p.plan_date}`,
        sourceType: "daily_plans",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        importance: 0.45,
        metadata: {
          plan_date: p.plan_date,
          start_time: p.start_time,
          end_time: p.end_time,
        },
      },
      { sourceModule: "daily_plan" },
    ),
  );
}

export function bucketItemsToBrainNodes(input: {
  rows: BucketItem[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((b) =>
    makeBrainNode(
      {
        sourceId: b.id,
        type: "bucket_list_item",
        userId: input.userId,
        title: truncate(b.title || "Untitled bucket item"),
        summary: b.description ?? b.why_this_matters ?? undefined,
        bodyText: composeBody(b.description, b.why_this_matters),
        tags: b.category_tags ?? [],
        sourceType: "bucket_items",
        createdAt: b.created_at,
        updatedAt: b.updated_at,
        importance: 0.55,
        metadata: {
          status: b.status,
          type: b.type,
          priority: b.priority,
          linked_project_id: b.linked_project_id,
        },
      },
      { sourceModule: "bucket_list_item" },
    ),
  );
}
