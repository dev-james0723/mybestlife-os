/**
 * Compact, privacy-aware context builder for the relationship `analyze` route
 * (spec §22). We send only what helps the model reason about ONE relationship —
 * its profile, recent interactions, open promises, image metadata, and lightly
 * related projects/goals/notes (by name/tag overlap). Never the whole account.
 */

import type {
  Relationship,
  RelationshipInteraction,
  RelationshipPromise,
  RelationshipImage,
  Project,
  Goal,
  Note,
} from "@/types/database";

const MAX_INTERACTIONS = 8;
const MAX_PROMISES = 12;
const MAX_IMAGES = 8;
const MAX_LINKED = 8;
const CLIP = 240;

function clip(s: string | null | undefined, max = CLIP): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function tokens(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .split(/[^a-z0-9一-鿿]+/)
    .filter((w) => w.length >= 3);
}

/** Lightweight name/tag overlap so we only forward genuinely related items. */
function isRelated(haystack: Set<string>, name: string, desc?: string | null) {
  const t = [...tokens(name), ...tokens(desc)];
  return t.some((w) => haystack.has(w));
}

export type RelationshipInsightContext = Record<string, unknown>;

export function buildRelationshipInsightContext(input: {
  relationship: Relationship;
  interactions: readonly RelationshipInteraction[];
  promises: readonly RelationshipPromise[];
  images: readonly RelationshipImage[];
  projects: readonly Project[];
  goals?: readonly Goal[];
  notes?: readonly Note[];
}): RelationshipInsightContext {
  const r = input.relationship;

  // Build a relevance vocabulary from the relationship's own text + tags.
  const vocab = new Set<string>([
    ...tokens(r.person_name),
    ...tokens(r.general_notes),
    ...tokens(r.preferences_and_details),
    ...tokens(r.last_interaction_notes),
    ...r.tags.flatMap((t) => tokens(t)),
  ]);

  const linkedProject = r.linked_project_id
    ? input.projects.find((p) => p.id === r.linked_project_id)
    : undefined;

  const relatedProjects = input.projects
    .filter(
      (p) =>
        p.id === r.linked_project_id ||
        isRelated(vocab, p.name, p.description),
    )
    .slice(0, MAX_LINKED)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: clip(p.description),
      linked: p.id === r.linked_project_id,
    }));

  const relatedGoals = (input.goals ?? [])
    .filter((g) => isRelated(vocab, g.name, g.description))
    .slice(0, MAX_LINKED)
    .map((g) => ({ id: g.id, name: g.name, description: clip(g.description) }));

  const relatedNotes = (input.notes ?? [])
    .filter((n) => isRelated(vocab, n.title, n.content))
    .slice(0, MAX_LINKED)
    .map((n) => ({ id: n.id, title: n.title, excerpt: clip(n.content) }));

  return {
    relationship: {
      person_name: r.person_name,
      category: r.category,
      relationship_strength: r.relationship_strength,
      last_contact_date: r.last_contact_date,
      last_interaction_notes: clip(r.last_interaction_notes, 800),
      next_action: r.next_action,
      next_action_date: r.next_action_date,
      commitments_made: clip(r.commitments_made, 800),
      preferences_and_details: clip(r.preferences_and_details, 800),
      general_notes: clip(r.general_notes, 800),
      tags: r.tags,
      has_photo: Boolean(r.photo_url),
      linked_project: linkedProject ? linkedProject.name : null,
    },
    interactions: input.interactions.slice(0, MAX_INTERACTIONS).map((i) => ({
      date: i.interaction_date,
      type: i.interaction_type,
      summary: clip(i.summary, 400),
    })),
    promises: input.promises.slice(0, MAX_PROMISES).map((p) => ({
      text: clip(p.promise_text, 200),
      status: p.status,
      due_date: p.due_date,
    })),
    images: input.images.slice(0, MAX_IMAGES).map((img) => ({
      type: img.image_type,
      caption: clip(img.caption ?? img.ai_caption, 200),
      event_date: img.event_date,
      location: img.location,
    })),
    related_projects: relatedProjects,
    related_goals: relatedGoals,
    related_notes: relatedNotes,
  };
}
