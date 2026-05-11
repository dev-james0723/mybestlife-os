"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerDecisionsRepository,
  type CreateDecisionInput,
  type UpdateDecisionInput,
} from "@/lib/repositories/career-decisions";

const LIST_KEY = ["career-decisions"] as const;
const DETAIL_KEY = (id: string) => ["career-decisions", id] as const;

export function useCareerDecisions() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: careerDecisionsRepository.list,
    staleTime: 30_000,
  });
}

export function useCareerDecision(id: string | null | undefined) {
  return useQuery({
    queryKey: DETAIL_KEY(id ?? ""),
    queryFn: () => careerDecisionsRepository.get(id as string),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDecisionInput) =>
      careerDecisionsRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save decision",
      );
    },
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateDecisionInput;
    }) => careerDecisionsRepository.update(id, updates),
    onSuccess: (saved) => {
      qc.setQueryData(DETAIL_KEY(saved.id), saved);
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update decision",
      );
    },
  });
}

export function useDeleteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerDecisionsRepository.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST_KEY });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete decision",
      );
    },
  });
}
