"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aiPreferencesRepository,
  type AIPreferencesInput,
} from "@/lib/repositories/ai-preferences";
import { useAppStore } from "@/stores/app-store";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";

const KEY = ["ai-preferences"] as const;

export function useAIPreferences() {
  return useQuery({
    queryKey: KEY,
    queryFn: aiPreferencesRepository.get,
  });
}

export function useUpsertAIPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AIPreferencesInput) =>
      aiPreferencesRepository.upsert(input),
    onSuccess: (saved) => {
      qc.setQueryData(KEY, saved);
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.success(copy.toast.preferencesSaved);
    },
    onError: (err: unknown) => {
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.toast.saveFailed);
    },
  });
}
