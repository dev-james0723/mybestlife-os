"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerProfileRepository,
  type CareerProfileUpsertInput,
} from "@/lib/repositories/career-profile";
import { useAppStore } from "@/stores/app-store";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";

const KEY = ["career-profile"] as const;

export function useCareerProfile() {
  return useQuery({
    queryKey: KEY,
    queryFn: careerProfileRepository.get,
  });
}

export function useUpsertCareerProfile(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  const silent = options?.silent ?? false;
  return useMutation({
    mutationFn: (input: CareerProfileUpsertInput) =>
      careerProfileRepository.upsert(input),
    onSuccess: (saved) => {
      qc.setQueryData(KEY, saved);
      if (silent) return;
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.success(copy.toast.profileSaved);
    },
    onError: (err: unknown) => {
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.toast.saveFailed);
    },
  });
}
