"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  projectResourcesRepository,
  type CreateProjectResourceInput,
} from "@/lib/repositories/project-resources";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useProjectResources(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-resources", projectId],
    queryFn: () => projectResourcesRepository.listByProject(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateProjectResources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      items,
    }: {
      projectId: string;
      items: CreateProjectResourceInput[];
    }) => projectResourcesRepository.createMany(items),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ["project-resources", projectId],
      });
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.projectResources;
      toast.error(ui.saveRelatedFailed);
    },
  });
}

export function useUpdateProjectResourceFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_favorite }: { id: string; is_favorite: boolean }) =>
      projectResourcesRepository.updateFavorite(id, is_favorite),
    onSuccess: (row) => {
      queryClient.invalidateQueries({
        queryKey: ["project-resources", row.project_id],
      });
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.projectResources;
      toast.error(ui.updateFailed);
    },
  });
}
