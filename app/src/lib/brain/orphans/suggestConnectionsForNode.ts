/**
 * Per-node connection suggester.
 *
 * Given an orphan (or any node), generate the top 3-8 candidate edges
 * the user could confirm. We reuse the same scorers used by the central
 * relationship engine, then sort by combined strength × confidence.
 *
 * The suggester is deterministic and explainable: every returned
 * suggestion carries a `reason` and an `evidence` object. No black-box.
 */

import type {
  BrainEdge,
  BrainNode,
} from "@/types/brain-graph";
import { matchValuesInText, getLifeArea } from "@/lib/brain/taxonomy";
import { buildEdge } from "@/lib/brain/relationship-engine/scoreEdge";
import {
  buildFeatureIndex,
  featurizeAll,
  scanEntities,
} from "@/lib/brain/relationship-engine/featurize";
import { computeEvidenceHashSync } from "@/lib/brain/evidenceHash";

export type SuggestForNodeInput = {
  node: BrainNode;
  /** Full node set the engine sees. */
  allNodes: BrainNode[];
  /** All edges currently in the graph (used to skip already-connected). */
  edges: BrainEdge[];
  /** Hashes of suggestions previously rejected by the user. */
  rejectedHashes?: ReadonlySet<string>;
  /** Cap on suggestions returned. Default 6. */
  limit?: number;
  /** Minimum combined score (strength × confidence). Default 0.45. */
  minScore?: number;
};

export type SuggestionResult = {
  edge: BrainEdge;
  combinedScore: number;
};

const DEFAULT_LIMIT = 6;
const DEFAULT_MIN_SCORE = 0.45;

export function suggestConnectionsForNode(
  input: SuggestForNodeInput,
): SuggestionResult[] {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const minScore = input.minScore ?? DEFAULT_MIN_SCORE;
  const rejected = input.rejectedHashes ?? new Set<string>();

  // Featurize on demand — for an interactive resolver this is fine.
  const features = featurizeAll(input.allNodes);
  const index = buildFeatureIndex(features);
  const targetFeatures = index.byNodeId.get(input.node.id);
  if (!targetFeatures) return [];

  // Skip nodes the orphan is already connected to (suggesting them again
  // would be noisy). Build an undirected neighbor set.
  const alreadyConnected = new Set<string>();
  for (const e of input.edges) {
    if (e.status === "rejected") continue;
    if (e.sourceNodeId === input.node.id) alreadyConnected.add(e.targetNodeId);
    if (e.targetNodeId === input.node.id) alreadyConnected.add(e.sourceNodeId);
  }

  const candidates: BrainEdge[] = [];

  // ── Tag / topic overlap ────────────────────────────────────────────
  for (const tag of targetFeatures.tagSlugs) {
    const peers = index.byTag.get(tag);
    if (!peers) continue;
    for (const peerId of peers) {
      if (peerId === input.node.id) continue;
      if (alreadyConnected.has(peerId)) continue;
      const peer = input.allNodes.find((n) => n.id === peerId);
      if (!peer) continue;
      candidates.push(
        buildEdge({
          userId: input.node.userId,
          sourceNodeId: input.node.id,
          targetNodeId: peerId,
          sourceNodeType: input.node.type,
          targetNodeType: peer.type,
          type: "tagged_with",
          strength: 0.55,
          confidence: 0.7,
          reason: `Both share tag "${tag}".`,
          sourceMethod: "tag",
          evidence: { sharedTag: tag },
        }),
      );
    }
  }

  // ── Life area overlap ──────────────────────────────────────────────
  for (const area of targetFeatures.lifeAreas) {
    const peers = index.byLifeArea.get(area);
    if (!peers) continue;
    const def = getLifeArea(area as Parameters<typeof getLifeArea>[0]);
    const areaName = def?.name ?? area;
    for (const peerId of peers) {
      if (peerId === input.node.id) continue;
      if (alreadyConnected.has(peerId)) continue;
      const peer = input.allNodes.find((n) => n.id === peerId);
      if (!peer) continue;
      candidates.push(
        buildEdge({
          userId: input.node.userId,
          sourceNodeId: input.node.id,
          targetNodeId: peerId,
          sourceNodeType: input.node.type,
          targetNodeType: peer.type,
          type: "same_life_area",
          strength: 0.7,
          confidence: 0.8,
          reason: `Both belong to life area "${areaName}".`,
          sourceMethod: "life_area",
          evidence: { lifeArea: area },
        }),
      );
    }
  }

  // ── Entity mentions ────────────────────────────────────────────────
  if (targetFeatures.searchText) {
    const knownNames = input.allNodes
      .filter(
        (n) =>
          n.id !== input.node.id &&
          (n.type === "project" ||
            n.type === "career_project" ||
            n.type === "career_event" ||
            n.type === "relationship_person" ||
            n.type === "role_model" ||
            n.type === "organization" ||
            n.type === "tool" ||
            n.type === "ai_knowledge" ||
            n.type === "goal"),
      )
      .filter((n) => n.title && n.title.length >= 4)
      .map((n) => ({ slug: n.id, name: n.title }));
    const mentions = scanEntities(targetFeatures.searchText, knownNames);
    for (const peerId of mentions) {
      if (alreadyConnected.has(peerId)) continue;
      const peer = input.allNodes.find((n) => n.id === peerId);
      if (!peer) continue;
      candidates.push(
        buildEdge({
          userId: input.node.userId,
          sourceNodeId: input.node.id,
          targetNodeId: peerId,
          sourceNodeType: input.node.type,
          targetNodeType: peer.type,
          type: "mentions",
          strength: 0.78,
          confidence: 0.82,
          reason: `Mentions "${peer.title}" in its content.`,
          sourceMethod: "entity",
          evidence: { entityNodeId: peerId },
        }),
      );
    }
  }

  // ── Value overlap (for value-bearing types) ───────────────────────
  const valueScannableTypes = new Set([
    "quote",
    "journal_entry",
    "goal",
    "decision",
    "role_model",
    "memory",
    "gratitude_entry",
    "about_me",
  ]);
  if (valueScannableTypes.has(input.node.type)) {
    const detected = matchValuesInText(targetFeatures.searchText);
    for (const v of detected) {
      // Find peers also detecting this value.
      for (const peer of input.allNodes) {
        if (peer.id === input.node.id) continue;
        if (alreadyConnected.has(peer.id)) continue;
        if (!valueScannableTypes.has(peer.type)) continue;
        const peerFeatures = index.byNodeId.get(peer.id);
        if (!peerFeatures) continue;
        const peerValues = matchValuesInText(peerFeatures.searchText);
        if (!peerValues.has(v)) continue;
        candidates.push(
          buildEdge({
            userId: input.node.userId,
            sourceNodeId: input.node.id,
            targetNodeId: peer.id,
            sourceNodeType: input.node.type,
            targetNodeType: peer.type,
            type: "related_theme",
            strength: 0.62,
            confidence: 0.72,
            reason: `Both reference value "${v}".`,
            sourceMethod: "tag",
            evidence: { value: v },
          }),
        );
      }
    }
  }

  // ── Score, dedupe, filter rejected, sort, cap ─────────────────────
  const byPair = new Map<string, SuggestionResult>();
  for (const edge of candidates) {
    const score = edge.strength * edge.confidence;
    if (score < minScore) continue;
    // Filter rejected.
    const hash = computeEvidenceHashSync({
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      relationshipType: edge.type,
      evidence: edge.evidence ?? null,
    });
    if (rejected.has(hash)) continue;

    const a =
      edge.sourceNodeId < edge.targetNodeId
        ? edge.sourceNodeId
        : edge.targetNodeId;
    const b =
      edge.sourceNodeId < edge.targetNodeId
        ? edge.targetNodeId
        : edge.sourceNodeId;
    const key = `${a}::${b}`;
    const cur = byPair.get(key);
    if (!cur || cur.combinedScore < score) {
      byPair.set(key, { edge, combinedScore: score });
    }
  }

  return [...byPair.values()]
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, limit);
}
