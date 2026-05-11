"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerOpportunitiesRepository,
  opportunityInteractionsRepository,
  type CreateInteractionInput,
  type CreateOpportunityInput,
  type UpdateOpportunityInput,
} from "@/lib/repositories/career-opportunities";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type {
  CareerOpportunity,
  CareerVaultFile,
  OpportunityInteraction,
  OpportunityStage,
} from "@/types/career-vault";

const ROOT_KEY = ["career-opportunities"] as const;

export function useCareerOpportunities() {
  return useQuery<CareerOpportunity[]>({
    queryKey: ROOT_KEY,
    queryFn: careerOpportunitiesRepository.list,
  });
}

export function useCareerOpportunity(id: string | null | undefined) {
  return useQuery<CareerOpportunity>({
    queryKey: ["career-opportunity", id],
    queryFn: () => careerOpportunitiesRepository.getById(id as string),
    enabled: !!id,
  });
}

export function useOpportunitiesForFile(fileId: string | null | undefined) {
  return useQuery<CareerOpportunity[]>({
    queryKey: ["career-opportunities", "for-file", fileId],
    queryFn: () => careerOpportunitiesRepository.listForFile(fileId as string),
    enabled: !!fileId,
  });
}

export function useOpportunityAttachedFiles(opportunity: CareerOpportunity | null | undefined) {
  return useQuery<CareerVaultFile[]>({
    queryKey: [
      "career-opportunity-files",
      opportunity?.id,
      opportunity?.attached_file_ids,
    ],
    queryFn: () =>
      careerOpportunitiesRepository.loadAttachedFiles(
        opportunity as CareerOpportunity,
      ),
    enabled: !!opportunity,
  });
}

export function useCreateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOpportunityInput) =>
      careerOpportunitiesRepository.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.pipeline.toasts.created);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.pipeline.toasts.createFailed);
    },
  });
}

export function useUpdateOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateOpportunityInput;
    }) => careerOpportunitiesRepository.update(id, updates),
    onSuccess: (updated) => {
      qc.setQueryData<CareerOpportunity[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev,
      );
      qc.setQueryData(["career-opportunity", updated.id], updated);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.pipeline.toasts.updated);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.pipeline.toasts.updateFailed);
    },
  });
}

export function useSetOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: OpportunityStage }) =>
      careerOpportunitiesRepository.setStage(id, stage),
    onSuccess: (updated) => {
      qc.setQueryData<CareerOpportunity[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev,
      );
      qc.setQueryData(["career-opportunity", updated.id], updated);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.pipeline.toasts.updateFailed);
    },
  });
}

export function useSetOpportunityAttachedFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fileIds }: { id: string; fileIds: string[] }) =>
      careerOpportunitiesRepository.setAttachedFiles(id, fileIds),
    onSuccess: (updated) => {
      qc.setQueryData(["career-opportunity", updated.id], updated);
      qc.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerOpportunitiesRepository.delete(id),
    onSuccess: (_v, id) => {
      qc.setQueryData<CareerOpportunity[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.filter((o) => o.id !== id) : prev,
      );
      qc.removeQueries({ queryKey: ["career-opportunity", id] });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.pipeline.toasts.deleted);
    },
  });
}

export function useOpportunityInteractions(
  opportunityId: string | null | undefined,
) {
  return useQuery<OpportunityInteraction[]>({
    queryKey: ["opportunity-interactions", opportunityId],
    queryFn: () =>
      opportunityInteractionsRepository.listForOpportunity(
        opportunityId as string,
      ),
    enabled: !!opportunityId,
  });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInteractionInput) =>
      opportunityInteractionsRepository.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({
        queryKey: ["opportunity-interactions", created.opportunity_id],
      });
    },
  });
}

export function useDeleteInteraction(opportunityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      opportunityInteractionsRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["opportunity-interactions", opportunityId],
      });
    },
  });
}
