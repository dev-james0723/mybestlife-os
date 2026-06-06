import { clampIdeaTitle } from "@/lib/ideas/clamp-idea-title";
import { isSuggestionTooSimilar } from "@/lib/ideas/idea-suggestion-guard";
import { stripHtml } from "@/lib/utils/html";
import type { Idea } from "@/types/database";
import type {
  IdeaAiSuggestions,
  IdeaCardVisual,
  IdeaRelatedResource,
  IdeaRelatedScope,
  IdeaResourceKind,
} from "@/types/idea";
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
    const clamped = clampIdeaTitle(head);
    return clamped.length <= max ? clamped : `${clamped.slice(0, max)}…`;
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

export function ideaTags(idea: Pick<Idea, "manual_tags" | "ai_tags">): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...(idea.manual_tags ?? []), ...(idea.ai_tags ?? [])]) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function isScope(value: unknown): value is IdeaRelatedScope {
  return (
    value === "idea" ||
    value === "project" ||
    value === "goal" ||
    value === "resource" ||
    value === "task" ||
    value === "knowledge" ||
    value === "bucket" ||
    value === "career"
  );
}

function isResourceKind(value: unknown): value is IdeaResourceKind {
  return (
    value === "project_resource" ||
    value === "asset" ||
    value === "document" ||
    value === "software_vault"
  );
}

function clampPercentage(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function coerceRelatedResource(value: unknown): IdeaRelatedResource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const scope = o.scope;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const title = typeof o.title === "string" ? o.title.trim() : "";
  if (!isScope(scope) || !id || !title) return null;

  const out: IdeaRelatedResource = {
    scope,
    id,
    title,
    percentage: clampPercentage(o.percentage),
    explanation:
      typeof o.explanation === "string" && o.explanation.trim()
        ? o.explanation.trim().slice(0, 360)
        : "",
  };
  if (typeof o.subtitle === "string" && o.subtitle.trim()) out.subtitle = o.subtitle.trim().slice(0, 160);
  if (typeof o.url === "string" && o.url.trim()) out.url = o.url.trim();
  if (isResourceKind(o.resourceKind)) out.resourceKind = o.resourceKind;
  if (typeof o.source === "string" && o.source.trim()) out.source = o.source.trim().slice(0, 80);
  return out;
}

function coerceCardVisual(value: unknown): IdeaCardVisual | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const o = value as Record<string, unknown>;
  const out: IdeaCardVisual = {};
  if (typeof o.imageUrl === "string" && o.imageUrl.trim()) out.imageUrl = o.imageUrl.trim();
  if (typeof o.storagePath === "string" && o.storagePath.trim()) out.storagePath = o.storagePath.trim();
  if (typeof o.prompt === "string" && o.prompt.trim()) out.prompt = o.prompt.trim().slice(0, 2000);
  if (typeof o.model === "string" && o.model.trim()) out.model = o.model.trim().slice(0, 100);
  if (typeof o.fallbackSeed === "string" && o.fallbackSeed.trim()) out.fallbackSeed = o.fallbackSeed.trim().slice(0, 120);
  if (typeof o.generatedAt === "string" && o.generatedAt.trim()) out.generatedAt = o.generatedAt.trim();
  if (typeof o.error === "string" && o.error.trim()) out.error = o.error.trim().slice(0, 200);
  if (typeof o.styleVersion === "string" && o.styleVersion.trim()) {
    out.styleVersion = o.styleVersion.trim().slice(0, 40);
  }
  if (Array.isArray(o.palette)) {
    const palette = o.palette
      .filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c.trim()))
      .map((c) => c.trim())
      .slice(0, 6);
    if (palette.length > 0) out.palette = palette;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function ideaAiSuggestions(idea: Idea): IdeaAiSuggestions {
  const raw = idea.ai_suggestions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: IdeaAiSuggestions = {};
  if (typeof o.summary === "string" && o.summary.trim()) out.summary = o.summary.trim();
  const str = (v: unknown, max = 280): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
  const coreInsight = str(o.coreInsight);
  if (coreInsight) out.coreInsight = coreInsight;
  const suggestedNextStep = str(o.suggestedNextStep);
  if (suggestedNextStep) out.suggestedNextStep = suggestedNextStep;
  const possibleUse = str(o.possibleUse);
  if (possibleUse) out.possibleUse = possibleUse;
  const clarifyingQuestion = str(o.clarifyingQuestion);
  if (clarifyingQuestion) out.clarifyingQuestion = clarifyingQuestion;
  if (Array.isArray(o.ai_tags)) {
    const tags = o.ai_tags
      .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
      .map((t) => t.trim());
    if (tags.length > 0) out.ai_tags = tags;
  }
  if (Array.isArray(o.relatedResources)) {
    const related = o.relatedResources
      .map(coerceRelatedResource)
      .filter((r): r is IdeaRelatedResource => Boolean(r));
    if (related.length > 0) out.relatedResources = related;
  }
  const cardVisual = coerceCardVisual(o.cardVisual);
  if (cardVisual) out.cardVisual = cardVisual;
  if (typeof o.generatedAt === "string" && o.generatedAt.trim()) out.generatedAt = o.generatedAt.trim();
  if (typeof o.model === "string" && o.model.trim()) out.model = o.model.trim();
  return out;
}

export function ideaAiSummary(idea: Idea): string | null {
  return ideaAiSuggestions(idea).summary ?? null;
}

export type IdeaStructuredSuggestion = {
  label: "coreInsight" | "suggestedNextStep" | "possibleUse" | "clarifyingQuestion";
  text: string;
};

/**
 * Structured AI suggestion panel fields, with the similarity guard applied:
 * fields that merely echo the idea content (Core Insight especially) are
 * dropped so the panel always adds value instead of repeating the content.
 */
export function ideaStructuredSuggestions(idea: Idea): IdeaStructuredSuggestion[] {
  const s = ideaAiSuggestions(idea);
  const content = idea.content ?? "";
  const out: IdeaStructuredSuggestion[] = [];

  const coreInsight = s.coreInsight ?? s.summary;
  if (coreInsight && !isSuggestionTooSimilar(coreInsight, content)) {
    out.push({ label: "coreInsight", text: coreInsight });
  }
  if (s.suggestedNextStep) out.push({ label: "suggestedNextStep", text: s.suggestedNextStep });
  if (s.possibleUse) out.push({ label: "possibleUse", text: s.possibleUse });
  if (s.clarifyingQuestion) {
    out.push({ label: "clarifyingQuestion", text: s.clarifyingQuestion });
  }
  return out;
}

export function ideaRelatedResources(idea: Idea): IdeaRelatedResource[] {
  return ideaAiSuggestions(idea).relatedResources ?? [];
}

export function ideaCardVisual(idea: Idea): IdeaCardVisual | undefined {
  return ideaAiSuggestions(idea).cardVisual;
}

export function ideaRelatedResourceCount(idea: Idea): number {
  const aiRelated = ideaRelatedResources(idea);
  if (aiRelated.length > 0) return aiRelated.length;
  const attachmentCount = Array.isArray(idea.attachments) ? idea.attachments.length : 0;
  return (
    (idea.linked_project_ids?.length ?? 0) +
    (idea.linked_task_ids?.length ?? 0) +
    (idea.linked_goal_ids?.length ?? 0) +
    (idea.linked_idea_ids?.length ?? 0) +
    (idea.linked_knowledge_item_ids?.length ?? 0) +
    (idea.linked_node_ids?.length ?? 0) +
    (idea.related_resource_refs?.length ?? 0) +
    attachmentCount
  );
}

export function ideaHasAnyLinks(idea: Idea): boolean {
  return ideaRelatedResourceCount(idea) > 0;
}
