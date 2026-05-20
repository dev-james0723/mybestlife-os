import { stripHtml } from "@/lib/utils/html";
import type { Idea } from "@/types/database";
import { IDEA_CATEGORIES, type IdeaCategorySlug } from "./constants";

export { normalizeIdea, normalizeIdea as normalizeIdeaRow } from "./normalize-idea";

export function displayCategory(category: string | null | undefined): IdeaCategorySlug {
  const c = category?.trim().toLowerCase() ?? "";
  if (IDEA_CATEGORIES.includes(c as IdeaCategorySlug)) return c as IdeaCategorySlug;
  return "random";
}

export function previewIdeaTitle(idea: Idea, max = 100): string {
  const head = idea.title?.trim();
  if (head) {
    return head.length <= max ? head : `${head.slice(0, max)}…`;
  }
  const line = stripHtml(idea.content).split("\n")[0]?.trim() ?? "";
  if (line.length <= max) return line || "Untitled idea";
  return `${line.slice(0, max)}…`;
}

export function previewIdeaBody(idea: Idea, max = 140): string {
  const plain = stripHtml(idea.content).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max)}…`;
}

export function ideaAiSummary(idea: Idea): string | null {
  const raw = idea.ai_suggestions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = (raw as Record<string, unknown>).summary;
  return typeof s === "string" && s.trim() ? s.trim() : null;
}

export function ideaRelatedResourceCount(idea: Idea): number {
  const attachmentCount = Array.isArray(idea.attachments) ? idea.attachments.length : 0;
  return (
    (idea.linked_project_ids?.length ?? 0) +
    (idea.linked_task_ids?.length ?? 0) +
    (idea.linked_knowledge_item_ids?.length ?? 0) +
    (idea.linked_node_ids?.length ?? 0) +
    attachmentCount
  );
}

export function ideaHasAnyLinks(idea: Idea): boolean {
  return ideaRelatedResourceCount(idea) > 0;
}
