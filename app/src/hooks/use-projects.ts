"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsRepository, type CreateProjectInput, type UpdateProjectInput } from "@/lib/repositories/projects";
import { getProjectsUiCopy } from "@/lib/i18n/projects-ui";
import { ensureError } from "@/lib/utils/ensure-error";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: projectsRepository.getAll,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => projectsRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastProjectCreated);
    },
    onError: (err) => {
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.error(ensureError(err, ui.toastProjectCreateFailed).message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      projectsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastProjectUpdated);
    },
    onError: (err) => {
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.error(ensureError(err, ui.toastProjectUpdateFailed).message);
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastProjectDeleted);
    },
    onError: (err) => {
      const ui = getProjectsUiCopy(useAppStore.getState().language);
      toast.error(ensureError(err, ui.toastProjectDeleteFailed).message);
    },
  });
}
