"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerNetworkRepository,
  type CreateEdgeInput,
  type CreateNodeInput,
  type UpdateNodeInput,
} from "@/lib/repositories/career-network";

const NODES_KEY = ["career-network-nodes"] as const;
const EDGES_KEY = ["career-network-edges"] as const;

export function useCareerNetworkNodes() {
  return useQuery({
    queryKey: NODES_KEY,
    queryFn: careerNetworkRepository.listNodes,
    staleTime: 30_000,
  });
}

export function useCareerNetworkEdges() {
  return useQuery({
    queryKey: EDGES_KEY,
    queryFn: careerNetworkRepository.listEdges,
    staleTime: 30_000,
  });
}

export function useCreateNetworkNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNodeInput) =>
      careerNetworkRepository.createNode(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NODES_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add node");
    },
  });
}

export function useUpdateNetworkNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateNodeInput }) =>
      careerNetworkRepository.updateNode(id, updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NODES_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update node");
    },
  });
}

export function useDeleteNetworkNode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerNetworkRepository.deleteNode(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NODES_KEY });
      void qc.invalidateQueries({ queryKey: EDGES_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete node");
    },
  });
}

export function useCreateNetworkEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEdgeInput) =>
      careerNetworkRepository.createEdge(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EDGES_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add edge");
    },
  });
}

export function useDeleteNetworkEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerNetworkRepository.deleteEdge(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: EDGES_KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete edge");
    },
  });
}

export function useLogNetworkInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nodeId, date }: { nodeId: string; date: string }) =>
      careerNetworkRepository.logInteraction(nodeId, date),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: NODES_KEY });
    },
  });
}
