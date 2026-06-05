"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  lifeAgentRepository,
  type CreateLifeAgentConversationInput,
  type CreateLifeAgentMemoryInput,
  type CreateLifeAgentMessageInput,
  type UpdateLifeAgentConversationInput,
} from "@/lib/repositories/life-agent";
import type { LifeAgentMessage, UpsertLifeAgentProfileInput } from "@/types/life-agent";
import { useAppStore } from "@/stores/app-store";
import { getLifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type {
  LifeAgentChatRequestBody,
  LifeAgentChatResponseBody,
} from "@/lib/life-agent/chat-types";
import type { LifeAgentAccessLevel, LifeAgentPermissionDomain } from "@/types/life-agent";

export const lifeAgentQueryKeys = {
  all: ["life-agent"] as const,
  profile: () => [...lifeAgentQueryKeys.all, "profile"] as const,
  permissions: () => [...lifeAgentQueryKeys.all, "permissions"] as const,
  conversations: () => [...lifeAgentQueryKeys.all, "conversations"] as const,
  conversation: (id: string) => [...lifeAgentQueryKeys.all, "conversation", id] as const,
  messages: (conversationId: string) =>
    [...lifeAgentQueryKeys.all, "messages", conversationId] as const,
  memories: () => [...lifeAgentQueryKeys.all, "memories"] as const,
};

export function useLifeAgentProfile() {
  return useQuery({
    queryKey: lifeAgentQueryKeys.profile(),
    queryFn: lifeAgentRepository.getProfile,
  });
}

export function useUpsertLifeAgentProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertLifeAgentProfileInput) => lifeAgentRepository.upsertProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.profile() });
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastProfileSaved);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastProfileSaveFailed);
    },
  });
}

export function useLifeAgentPermissions() {
  return useQuery({
    queryKey: lifeAgentQueryKeys.permissions(),
    queryFn: lifeAgentRepository.getPermissions,
  });
}

export function useUpsertLifeAgentPermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domain,
      access_level,
    }: {
      domain: LifeAgentPermissionDomain;
      access_level: LifeAgentAccessLevel;
    }) => lifeAgentRepository.upsertPermission(domain, access_level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.permissions() });
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastPermissionSaved);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastPermissionSaveFailed);
    },
  });
}

export function useLifeAgentConversations() {
  return useQuery({
    queryKey: lifeAgentQueryKeys.conversations(),
    queryFn: lifeAgentRepository.getConversations,
  });
}

export function useLifeAgentConversation(id: string | null) {
  return useQuery({
    queryKey: lifeAgentQueryKeys.conversation(id ?? ""),
    queryFn: () => (id ? lifeAgentRepository.getConversationById(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateLifeAgentConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: CreateLifeAgentConversationInput) =>
      lifeAgentRepository.createConversation(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversations() });
    },
  });
}

export function useUpdateLifeAgentConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLifeAgentConversationInput }) =>
      lifeAgentRepository.updateConversation(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversation(data.id) });
    },
  });
}

export function useDeleteLifeAgentConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lifeAgentRepository.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversations() });
    },
  });
}

export function useLifeAgentMessages(conversationId: string | null) {
  return useQuery({
    queryKey: lifeAgentQueryKeys.messages(conversationId ?? ""),
    queryFn: () =>
      conversationId
        ? lifeAgentRepository.getMessages(conversationId, { limit: 50 })
        : Promise.resolve({ messages: [], hasMore: false }),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
  });
}

export function useLoadOlderLifeAgentMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (beforeCreatedAt: string) => {
      if (!conversationId) throw new Error("no_conversation");
      return lifeAgentRepository.getMessages(conversationId, {
        limit: 50,
        beforeCreatedAt,
      });
    },
    onSuccess: (older) => {
      if (!conversationId) return;
      queryClient.setQueryData(
        lifeAgentQueryKeys.messages(conversationId),
        (prev: { messages: LifeAgentMessage[]; hasMore: boolean } | undefined) => {
          if (!prev) return older;
          const existingIds = new Set(prev.messages.map((m) => m.id));
          const merged = [
            ...older.messages.filter((m) => !existingIds.has(m.id)),
            ...prev.messages,
          ];
          return { messages: merged, hasMore: older.hasMore };
        },
      );
    },
  });
}

export function useCreateLifeAgentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLifeAgentMessageInput) => lifeAgentRepository.createMessage(input),
    onSuccess: (message) => {
      queryClient.invalidateQueries({
        queryKey: lifeAgentQueryKeys.messages(message.conversation_id),
      });
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversations() });
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastMessageSaved);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastMessageSaveFailed);
    },
  });
}

export function useLifeAgentMemories() {
  return useQuery({
    queryKey: lifeAgentQueryKeys.memories(),
    queryFn: lifeAgentRepository.getMemories,
  });
}

export function useCreateLifeAgentMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLifeAgentMemoryInput) => lifeAgentRepository.createMemory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.memories() });
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastMemorySaved);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastMemorySaveFailed);
    },
  });
}

async function postAction(
  path: "confirm" | "cancel",
  previewId: string,
  temporaryPermissions?: Partial<Record<LifeAgentPermissionDomain, boolean>>,
): Promise<{ preview: LifeAgentActionPreviewCard }> {
  const res = await fetch(`/api/life-agent/actions/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ previewId, temporaryPermissions }),
  });
  const json = (await res.json()) as { preview?: LifeAgentActionPreviewCard; error?: string; detail?: string };
  if (!res.ok) {
    throw new Error(json.detail ?? json.error ?? `${path}_failed`);
  }
  if (!json.preview) throw new Error("missing_preview");
  return { preview: json.preview };
}

export function useConfirmLifeAgentAction() {
  return useMutation({
    mutationFn: ({
      previewId,
      temporaryPermissions,
    }: {
      previewId: string;
      temporaryPermissions?: Partial<Record<LifeAgentPermissionDomain, boolean>>;
    }) => postAction("confirm", previewId, temporaryPermissions),
    onSuccess: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastActionConfirmed);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastActionConfirmFailed);
    },
  });
}

export function useCancelLifeAgentAction() {
  return useMutation({
    mutationFn: ({ previewId }: { previewId: string }) => postAction("cancel", previewId),
    onSuccess: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastActionCancelled);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastActionCancelFailed);
    },
  });
}

export function useLifeAgentChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LifeAgentChatRequestBody): Promise<LifeAgentChatResponseBody> => {
      const res = await fetch("/api/life-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as LifeAgentChatResponseBody & {
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(json.detail ?? json.error ?? "chat_failed");
      }
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: lifeAgentQueryKeys.messages(data.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.conversations() });
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastChatFailed);
    },
  });
}

export function useDeleteLifeAgentMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lifeAgentRepository.deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAgentQueryKeys.memories() });
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.success(ui.toastMemoryDeleted);
    },
    onError: () => {
      const ui = getLifeAgentUiCopy(useAppStore.getState().language);
      toast.error(ui.toastMemoryDeleteFailed);
    },
  });
}
