"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  roleModelsRepository,
  type CreateRoleModelInput,
  type UpdateRoleModelInput,
} from "@/lib/repositories/role-models";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useRoleModels() {
  return useQuery({
    queryKey: ["role-models"],
    queryFn: roleModelsRepository.getAll,
  });
}

export function useCreateRoleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoleModelInput) => roleModelsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-models"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateRoleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleModelInput }) =>
      roleModelsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-models"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteRoleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roleModelsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-models"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.roleModels;
      toast.error(ui.deleteFailed);
    },
  });
}
