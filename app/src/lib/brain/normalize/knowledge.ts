/**
 * Knowledge Base normalizers — produces BrainNode objects for knowledge
 * cards, smart collections, categories, and tags.
 *
 * The KB Constellation page already has its own internal graph via
 * `buildConstellationData` — the Brain reuses ITEMS but produces its own
 * collections / tag clusters because the Brain operates on a wider
 * canonical taxonomy.
 */

import type {
  KnowledgeConnection,
  KnowledgeItem,
  SmartCollection,
} from "@/types/knowledge";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, truncate } from "./_shared";

export function knowledgeItemsToBrainNodes(input: {
  items: KnowledgeItem[] | undefined;
  userId: string;
}): BrainNode[] {
  if (!input.items) return [];
  // Defense-in-depth: filter by userId even though RLS already enforces it.
  const owned = input.items.filter((i) => i.userId === input.userId);
  return owned.map((item) =>
    makeBrainNode(
      {
        sourceId: item.id,
        type: "knowledge_card",
        userId: input.userId,
        title: truncate(item.title || "Untitled", 80),
        summary: item.aiTldr ?? item.aiSummary,
        bodyText: composeBody(
          item.aiSummary,
          item.aiContentOverview,
          item.aiKeyInsights?.join(" · "),
          item.aiKeyQuotes?.join(" · "),
        ),
        tags: [...(item.aiTags ?? []), ...(item.manualTags ?? [])],
        sourceType: "knowledge_items",
        createdAt: item.dateAdded,
        updatedAt: item.dateModified,
        importance: 0.6,
        metadata: {
          contentType: item.contentType,
          sourceUrl: item.sourceUrl,
          sourceDomain: item.sourceDomain,
          provider: item.provider,
          // keep the original AI connections so the relationship engine
          // can fold them into "explicit" edges with confidence.
          aiConnections: undefined as KnowledgeConnection[] | undefined,
        },
      },
      { sourceModule: "knowledge_card" },
    ),
  );
}

export function smartCollectionsToBrainNodes(input: {
  collections: SmartCollection[] | undefined;
  userId: string;
}): BrainNode[] {
  if (!input.collections) return [];
  const owned = input.collections.filter((c) => c.userId === input.userId);
  return owned.map((c) =>
    makeBrainNode(
      {
        sourceId: c.id,
        type: "knowledge_collection",
        userId: input.userId,
        title: truncate(c.name || "Untitled collection", 60),
        summary: c.description,
        sourceType: "knowledge_smart_collections",
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        importance: 0.7,
        metadata: { itemCount: c.itemIds?.length ?? 0 },
      },
      { sourceModule: "knowledge_collection" },
    ),
  );
}
