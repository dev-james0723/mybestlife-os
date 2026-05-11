/**
 * Future ingestion pipeline hook.
 *
 * Called whenever a knowledge item is created or updated. The function
 * is intentionally a *placeholder*: it derives the relation candidates
 * for a single item using the same logic as `backfillConstellationRelations`,
 * but does not write to a `knowledge_relations` table because that
 * table doesn't exist yet (see PHASE 20 of the spec).
 *
 * The shape is stable so the rest of the app can already wire it
 * (e.g. from `mutations.ts` after `findConnections` runs). When the
 * persistence layer lands, only the implementation needs to change.
 *
 * Every emitted relation is scoped by `userId` to prevent cross-user
 * contamination — never relax that contract.
 */

import type { KnowledgeItem, SmartCollection } from "@/types/knowledge";
import type { ConstellationRelationInput } from "./buildConstellationData";
import { isGenericTag } from "./constants";

export type AIRelationSuggestion = {
  /** Mirror of `knowledge_connections` shape but explicitly explainable. */
  sourceItemId: string;
  targetItemId: string;
  relationType: "ai_suggested_link" | "semantic_similarity";
  reason: string;
  confidence: number;
  /** Human-readable description of how the suggestion was produced. */
  method: string;
  createdAt: string;
};

/** Optional hook the caller can plug in once an embedding service exists. */
export type EmbeddingClient = {
  /** Returns AI-derived relation suggestions for the new/updated item. */
  suggestRelations(item: KnowledgeItem): Promise<AIRelationSuggestion[]>;
};

export type IngestionContext = {
  userId: string;
  /** All current knowledge items for the user (the live store / cache). */
  knowledgeItems: KnowledgeItem[];
  collections?: SmartCollection[];
  /** Pluggable embedding/AI relation engine. Optional. */
  embedding?: EmbeddingClient;
};

export type IngestionResult = {
  /** Structural relations the item has by virtue of its tags/collection/etc. */
  structuralCandidates: ConstellationRelationInput[];
  /** AI-suggested relations (always `status: "suggested"` until confirmed). */
  aiSuggestions: AIRelationSuggestion[];
  todo: string[];
};

function nowIso() {
  return new Date().toISOString();
}

/**
 * Derive the structural relations for a single new/updated item.
 *
 * This is the "fast path" of the ingestion pipeline — pure, synchronous,
 * deterministic. AI suggestions are produced separately via the optional
 * `embedding` hook because they are async and best-effort.
 */
function structuralRelationsFor(
  userId: string,
  item: KnowledgeItem,
  collections: SmartCollection[],
): ConstellationRelationInput[] {
  const stamp = nowIso();
  const out: ConstellationRelationInput[] = [];
  const seen = new Set<string>();

  function push(rel: ConstellationRelationInput) {
    const key = `${rel.type}::${rel.sourceId}::${rel.targetId}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(rel);
  }

  // tags
  const seenTags = new Set<string>();
  for (const raw of [...(item.aiTags ?? []), ...(item.manualTags ?? [])]) {
    if (!raw) continue;
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seenTags.has(key)) continue;
    if (isGenericTag(tag)) continue;
    seenTags.add(key);
    push({
      id: `live:tag:${item.id}:${key}`,
      userId,
      sourceId: item.id,
      targetId: `tag:${key}`,
      sourceType: "knowledge",
      targetType: "tag",
      type: "shared_tag",
      status: "confirmed",
      weight: 0.6,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  // collections this item belongs to
  for (const col of collections) {
    if (!col.itemIds?.includes(item.id)) continue;
    push({
      id: `live:col:${item.id}:${col.id}`,
      userId,
      sourceId: item.id,
      targetId: `col:${col.id}`,
      sourceType: "knowledge",
      targetType: "collection",
      type: "same_collection",
      status: "confirmed",
      weight: 0.7,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  // source
  const sourceKey =
    item.sourceDomain || item.provider || item.sourceType || item.contentType;
  if (sourceKey) {
    push({
      id: `live:src:${item.id}:${sourceKey}`,
      userId,
      sourceId: item.id,
      targetId: `src:${String(sourceKey).toLowerCase()}`,
      sourceType: "knowledge",
      targetType: "source",
      type: "same_source",
      status: "confirmed",
      weight: 0.4,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  return out;
}

/**
 * Public entry point. Wire this from your "knowledge item written" path
 * (e.g. after the AI processing step in `mutations.ts`).
 */
export async function onKnowledgeItemCreatedOrUpdated(
  item: KnowledgeItem,
  ctx: IngestionContext,
): Promise<IngestionResult> {
  if (item.userId !== ctx.userId) {
    // Strict userId isolation. Refuse to operate cross-user.
    throw new Error("onKnowledgeItemCreatedOrUpdated: userId mismatch");
  }

  const collections = (ctx.collections ?? []).filter(
    (c) => c.userId === ctx.userId,
  );

  const structuralCandidates = structuralRelationsFor(
    ctx.userId,
    item,
    collections,
  );

  let aiSuggestions: AIRelationSuggestion[] = [];
  if (ctx.embedding) {
    try {
      aiSuggestions = await ctx.embedding.suggestRelations(item);
      // Filter to keep only this user's items as targets.
      const knownIds = new Set(
        ctx.knowledgeItems.filter((i) => i.userId === ctx.userId).map((i) => i.id),
      );
      aiSuggestions = aiSuggestions.filter(
        (s) => knownIds.has(s.targetItemId) && s.sourceItemId === item.id,
      );
    } catch {
      // Best-effort. Empty list is a perfectly valid result.
      aiSuggestions = [];
    }
  }

  return {
    structuralCandidates,
    aiSuggestions,
    todo: [
      "PHASE 18: persist aiSuggestions into ai_relation_suggestions (status='suggested').",
      "PHASE 20: persist structuralCandidates into knowledge_relations (status='confirmed').",
      "Both writes MUST include user_id and obey RLS.",
    ],
  };
}
