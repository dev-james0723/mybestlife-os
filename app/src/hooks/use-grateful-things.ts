"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  gratefulThingsRepository,
  type CreateGratefulThingInput,
  type UpdateGratefulThingInput,
} from "@/lib/repositories/grateful-things";
import { getGratefulThingsUiCopy } from "@/lib/i18n/grateful-things-ui";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";

export function useGratefulThings() {
  return useQuery({
    queryKey: ["grateful-things"],
    queryFn: gratefulThingsRepository.getAll,
  });
}

export function useCreateGratefulThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGratefulThingInput) => gratefulThingsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grateful-things"] });
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastEntrySaved);
    },
    onError: (error) => {
      console.error("[grateful_things:create] Failed to save entry", error);
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      const detail = error instanceof Error ? error.message : null;
      toast.error(detail && detail !== "Failed to save entry" ? detail : ui.toastEntrySaveFailed);
    },
  });
}

export function useUpdateGratefulThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGratefulThingInput }) =>
      gratefulThingsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grateful-things"] });
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastEntryUpdated);
    },
    onError: (error) => {
      console.error("[grateful_things:update] Failed to update entry", error);
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      toast.error(ui.toastEntryUpdateFailed);
    },
  });
}

export function useDeleteGratefulThing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gratefulThingsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grateful-things"] });
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastEntryDeleted);
    },
    onError: (error) => {
      console.error("[grateful_things:delete] Failed to delete entry", error);
      const ui = getGratefulThingsUiCopy(useAppStore.getState().language);
      toast.error(ui.toastEntryDeleteFailed);
    },
  });
}
