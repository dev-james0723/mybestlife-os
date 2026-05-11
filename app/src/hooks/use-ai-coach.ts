"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  promptLibraryRepository,
  type NewCustomPromptInput,
  type UpdateCustomPromptInput,
} from "@/lib/repositories/prompt-library";
import type {
  AITool,
  SystemPromptTemplate,
  UserCustomPrompt,
  UserPromptFavorite,
} from "@/types/ai-coach";
import { useAppStore } from "@/stores/app-store";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";

const SYS_KEY = ["ai-coach", "system-templates"] as const;
const CUSTOM_KEY = ["ai-coach", "custom-prompts"] as const;
const FAVS_KEY = ["ai-coach", "favorites"] as const;
const RECENT_KEY = ["ai-coach", "recent"] as const;

// -------- system templates --------
export function useSystemPromptTemplates() {
  return useQuery({
    queryKey: SYS_KEY,
    queryFn: promptLibraryRepository.listSystemTemplates,
    staleTime: 5 * 60_000,
  });
}

export function useSystemPromptTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: ["ai-coach", "system-template", id],
    queryFn: () => promptLibraryRepository.getSystemTemplate(id as string),
    enabled: !!id,
  });
}

// -------- custom prompts --------
export function useCustomPrompts() {
  return useQuery({
    queryKey: CUSTOM_KEY,
    queryFn: promptLibraryRepository.listCustomPrompts,
  });
}

export function useCustomPrompt(id: string | null | undefined) {
  return useQuery({
    queryKey: ["ai-coach", "custom-prompt", id],
    queryFn: () => promptLibraryRepository.getCustomPrompt(id as string),
    enabled: !!id,
  });
}

export function useCreateCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCustomPromptInput) =>
      promptLibraryRepository.createCustomPrompt(input),
    onSuccess: (created) => {
      qc.setQueryData<UserCustomPrompt[] | undefined>(CUSTOM_KEY, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.success(copy.toast.customCreated);
    },
    onError: (err: unknown) => {
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.toast.saveFailed);
    },
  });
}

export function useUpdateCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateCustomPromptInput;
    }) => promptLibraryRepository.updateCustomPrompt(id, updates),
    onSuccess: (saved) => {
      qc.setQueryData<UserCustomPrompt[] | undefined>(CUSTOM_KEY, (prev) =>
        prev ? prev.map((p) => (p.id === saved.id ? saved : p)) : prev,
      );
      qc.setQueryData(["ai-coach", "custom-prompt", saved.id], saved);
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.success(copy.toast.customUpdated);
    },
    onError: (err: unknown) => {
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.toast.saveFailed);
    },
  });
}

export function useDeleteCustomPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => promptLibraryRepository.deleteCustomPrompt(id),
    onSuccess: (_void, id) => {
      qc.setQueryData<UserCustomPrompt[] | undefined>(CUSTOM_KEY, (prev) =>
        prev ? prev.filter((p) => p.id !== id) : prev,
      );
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.success(copy.toast.customDeleted);
    },
    onError: (err: unknown) => {
      const copy = getAICoachCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.toast.saveFailed);
    },
  });
}

// -------- favourites (system templates) --------
export function usePromptFavorites() {
  return useQuery({
    queryKey: FAVS_KEY,
    queryFn: promptLibraryRepository.listFavorites,
  });
}

export function useToggleTemplateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      templateId,
      next,
    }: {
      templateId: string;
      next: boolean;
    }) => {
      if (next) await promptLibraryRepository.addFavorite(templateId);
      else await promptLibraryRepository.removeFavorite(templateId);
      return { templateId, next };
    },
    onMutate: async ({ templateId, next }) => {
      await qc.cancelQueries({ queryKey: FAVS_KEY });
      const prev = qc.getQueryData<UserPromptFavorite[]>(FAVS_KEY);
      if (prev) {
        qc.setQueryData<UserPromptFavorite[]>(
          FAVS_KEY,
          next
            ? [
                ...prev,
                {
                  user_id: "",
                  template_id: templateId,
                  created_at: new Date().toISOString(),
                },
              ]
            : prev.filter((f) => f.template_id !== templateId),
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(FAVS_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: FAVS_KEY });
    },
  });
}

// -------- usage history --------
export function useRecentPromptUsage(limit = 20) {
  return useQuery({
    queryKey: [...RECENT_KEY, limit] as const,
    queryFn: () => promptLibraryRepository.listRecentUsage(limit),
  });
}

export function useLogPromptUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      templateId?: string | null;
      customPromptId?: string | null;
      aiTool: AITool;
      attachedFileIds?: string[];
    }) => promptLibraryRepository.logUsage(input),
    onSuccess: async (_, vars) => {
      qc.invalidateQueries({ queryKey: RECENT_KEY });
      if (vars.customPromptId) {
        try {
          await promptLibraryRepository.incrementCustomUsage(vars.customPromptId);
        } catch {
          /* non-fatal — the prompt still ran. */
        }
        qc.invalidateQueries({ queryKey: CUSTOM_KEY });
      }
    },
  });
}

// Convenience: expose a single system template by slug once the list is loaded.
export function useSystemPromptTemplateBySlug(slug: string | null | undefined) {
  const { data: all } = useSystemPromptTemplates();
  const found = slug
    ? all?.find((t: SystemPromptTemplate) => t.slug === slug)
    : undefined;
  return found;
}
