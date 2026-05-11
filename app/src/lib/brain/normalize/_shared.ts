/**
 * Shared helpers for Brain normalizers.
 *
 * Where the old `lib/brain/adapters/_shared.ts` produces canvas-shaped
 * `ConstellationNode`/`ConstellationEdge` directly, this newer layer
 * produces canonical `BrainNode` objects that the relationship engine
 * can score and connect.
 *
 * Adapters never produce edges here — the relationship engine owns all
 * edge generation so it can reason about evidence holistically.
 */

import {
  classifyBrainNode,
  type ClassifyOptions,
} from "@/lib/brain/taxonomy";
import { makeBrainNodeId } from "@/lib/brain/compat";
import type { BrainNode, BrainNodeType } from "@/types/brain-graph";

/** Filter rows to those owned by the current user (defense in depth). */
export function ownedBy<T extends { user_id: string }>(
  rows: T[] | undefined,
  userId: string,
): T[] {
  if (!rows) return [];
  return rows.filter((r) => r.user_id === userId);
}

/** Truncate long content for use as a node title or summary. */
export function truncate(text: string, max = 80): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/**
 * Build, then classify (canonical tags, life areas, categories) a BrainNode
 * in one step. All normalizers should funnel through this so node-level
 * features stay consistent.
 */
export function makeBrainNode(
  draft: Omit<BrainNode, "id" | "userId" | "canonicalTags" | "categories" | "lifeAreas"> & {
    sourceId: string;
    type: BrainNodeType;
    userId: string;
    canonicalTags?: string[];
    categories?: string[];
    lifeAreas?: string[];
  },
  classify: ClassifyOptions = {},
): BrainNode {
  const baseDraft: BrainNode = {
    id: makeBrainNodeId(draft.type, draft.sourceId),
    userId: draft.userId,
    type: draft.type,
    title: draft.title,
    summary: draft.summary,
    bodyText: draft.bodyText,
    tags: draft.tags,
    canonicalTags: draft.canonicalTags,
    categories: draft.categories,
    lifeAreas: draft.lifeAreas,
    entities: draft.entities,
    sourceId: draft.sourceId,
    sourceType: draft.sourceType,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    importance: draft.importance,
    metadata: draft.metadata,
  };
  return classifyBrainNode(baseDraft, classify);
}

/** Compose a body-text string from optional fields (drops empties). */
export function composeBody(...parts: Array<string | null | undefined>): string {
  return parts.filter((p) => typeof p === "string" && p.trim().length > 0).join(" \n\n").trim();
}
