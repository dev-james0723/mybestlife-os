/**
 * Normalizers for capture / reflection entities: journal entries, quotes,
 * gratitude entries, ideas, notes (treated as memory), and decisions.
 */

import type {
  GratefulThing,
  Idea,
  JournalEntry,
  Note,
} from "@/types/database";
import type { CareerDecision } from "@/types/database";
import type { Quote } from "@/types/quote";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function journalEntriesToBrainNodes(input: {
  rows: JournalEntry[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((j) =>
    makeBrainNode(
      {
        sourceId: j.id,
        type: "journal_entry",
        userId: input.userId,
        title: `Journal — ${j.entry_date}`,
        summary: j.ai_summary ?? (j.content ? truncate(j.content, 140) : undefined),
        bodyText: composeBody(j.content, j.ai_summary, j.needs?.join(" · ")),
        tags: j.needs ?? [],
        sourceType: "journal_entries",
        createdAt: j.created_at,
        updatedAt: j.updated_at,
        importance: 0.5,
        metadata: {
          entry_date: j.entry_date,
          needs: j.needs,
          linked_project_ids: j.linked_project_ids,
          linked_task_ids: j.linked_task_ids,
        },
      },
      { sourceModule: "journal_entry" },
    ),
  );
}

export function quotesToBrainNodes(input: {
  rows: Quote[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((q) =>
    makeBrainNode(
      {
        sourceId: q.id,
        type: "quote",
        userId: input.userId,
        title: truncate(q.quote_text, 70),
        summary: q.source_author ?? undefined,
        bodyText: composeBody(q.quote_text, q.source_context, q.personal_note),
        tags: q.tags ?? [],
        categories: q.category ? [q.category] : undefined,
        sourceType: "quotes",
        createdAt: q.created_at,
        updatedAt: q.updated_at,
        importance: q.is_favorite ? 0.7 : 0.5,
        metadata: {
          emotion_tone: q.emotion_tone,
          is_favorite: q.is_favorite,
          linked_goal_id: q.linked_goal_id,
        },
      },
      { sourceModule: "quote" },
    ),
  );
}

export function gratitudeToBrainNodes(input: {
  rows: GratefulThing[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((g) =>
    makeBrainNode(
      {
        sourceId: g.id,
        type: "gratitude_entry",
        userId: input.userId,
        title: truncate(g.content || "Gratitude entry", 70),
        bodyText: g.content ?? undefined,
        tags: g.category ? [g.category] : [],
        sourceType: "grateful_things",
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        importance: 0.4,
        metadata: { entry_date: g.entry_date, is_favorite: g.is_favorite },
      },
      { sourceModule: "gratitude" },
    ),
  );
}

export function ideasToBrainNodes(input: {
  rows: Idea[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((i) =>
    makeBrainNode(
      {
        sourceId: i.id,
        type: "idea",
        userId: input.userId,
        title: truncate(i.title?.trim() || i.content || "Untitled idea", 70),
        summary: i.content,
        bodyText: i.content,
        tags: [...(i.ai_tags ?? []), ...(i.manual_tags ?? [])],
        sourceType: "ideas",
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        importance: 0.5,
        metadata: {
          status: i.status,
          capture_kind: i.capture_kind,
          linked_project_ids: i.linked_project_ids,
          linked_task_ids: i.linked_task_ids,
          linked_knowledge_item_ids: i.linked_knowledge_item_ids,
        },
      },
      { sourceModule: "idea" },
    ),
  );
}

/**
 * Notes are imported as `memory` nodes — they tend to capture personal
 * reflection / context rather than action items. The `project_id` link is
 * preserved in metadata so the relationship engine can use it.
 */
export function notesToBrainNodes(input: {
  rows: Note[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((n) =>
    makeBrainNode(
      {
        sourceId: n.id,
        type: "memory",
        userId: input.userId,
        title: truncate(n.title || "Untitled note"),
        summary: n.content ? truncate(n.content, 140) : undefined,
        bodyText: n.content ?? undefined,
        tags: n.tags ?? [],
        categories: n.category ? [n.category] : undefined,
        sourceType: "notes",
        createdAt: n.created_at,
        updatedAt: n.updated_at,
        importance: 0.45,
        metadata: { project_id: n.project_id, is_favorite: n.is_favorite },
      },
      { sourceModule: "memory" },
    ),
  );
}

export function careerDecisionsToBrainNodes(input: {
  rows: CareerDecision[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((d) =>
    makeBrainNode(
      {
        sourceId: d.id,
        type: "decision",
        userId: input.userId,
        title: truncate(d.title || "Decision"),
        summary: d.context ?? d.decision ?? undefined,
        bodyText: composeBody(
          d.context,
          d.decision,
          d.expected_outcome,
          d.lessons_learned,
        ),
        tags: d.decision_type ? [d.decision_type] : [],
        sourceType: "career_decisions",
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        importance: 0.6,
        metadata: {
          framework: d.framework,
          decided_at: d.decided_at,
          decision_quality_score: d.decision_quality_score,
        },
      },
      { sourceModule: "decision" },
    ),
  );
}
