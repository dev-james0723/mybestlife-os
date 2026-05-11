/**
 * Mutations for `brain_edges`.
 *
 * Exposed to UI components (orphan resolver, density panel, detail panel)
 * for confirm / reject / hide / delete operations. All mutations
 * invalidate `["brain", "edges"]` so the canvas updates automatically.
 */

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  brainEdgesRepository,
  type BrainEdgeInsert,
  type BrainEdgeRow,
} from "@/lib/brain/edges";
import { computeEvidenceHash } from "@/lib/brain/evidenceHash";
import type { BrainEdge } from "@/types/brain-graph";

const KEY = ["brain", "edges"] as const;

function toInsert(edge: BrainEdge, hash: string): BrainEdgeInsert {
  return {
    source_node_id: edge.sourceNodeId,
    source_node_type: edge.sourceNodeType ?? "memory",
    target_node_id: edge.targetNodeId,
    target_node_type: edge.targetNodeType ?? "memory",
    relationship_type: edge.type,
    strength: edge.strength,
    confidence: edge.confidence,
    reason: edge.reason,
    source_method: edge.sourceMethod,
    status: edge.status,
    evidence: edge.evidence ?? null,
    evidence_hash: hash,
    is_manual: edge.sourceMethod === "user_created",
    is_ai_suggested:
      edge.sourceMethod === "embedding" ||
      edge.sourceMethod === "llm" ||
      edge.sourceMethod === "system_suggested",
    auto_generated: edge.sourceMethod !== "user_created",
    metadata: edge.metadata ?? null,
  };
}

export function useConfirmBrainSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (edge: BrainEdge): Promise<BrainEdgeRow> => {
      const hash = await computeEvidenceHash({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        relationshipType: edge.type,
        evidence: edge.evidence ?? null,
      });
      // If it already exists in the DB, just confirm; else insert as confirmed.
      if (edge.persistenceId) {
        return brainEdgesRepository.confirm(edge.persistenceId, {
          recordAsUserConfirmed: true,
        });
      }
      const created = await brainEdgesRepository.create({
        ...toInsert(edge, hash),
        status: "confirmed",
        is_manual: true,
        source_method: "user_confirmed",
      });
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useRejectBrainSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (edge: BrainEdge): Promise<BrainEdgeRow> => {
      const hash = await computeEvidenceHash({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        relationshipType: edge.type,
        evidence: edge.evidence ?? null,
      });
      // Persist rejection so the engine never re-suggests this evidence.
      if (edge.persistenceId) {
        return brainEdgesRepository.reject(edge.persistenceId);
      }
      return brainEdgesRepository.create({
        ...toInsert(edge, hash),
        status: "rejected",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useHideBrainEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<BrainEdgeRow> => {
      return brainEdgesRepository.hide(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteBrainEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return brainEdgesRepository.delete(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

/** Manually create a confirmed link between two nodes. */
export function useCreateBrainLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BrainEdge): Promise<BrainEdgeRow> => {
      const hash = await computeEvidenceHash({
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        relationshipType: input.type,
        evidence: input.evidence ?? null,
      });
      return brainEdgesRepository.create({
        ...toInsert(input, hash),
        status: "confirmed",
        is_manual: true,
        source_method: "user_created",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
