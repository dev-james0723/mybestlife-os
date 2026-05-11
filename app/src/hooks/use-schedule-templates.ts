"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  scheduleTemplatesRepository,
  type CreateScheduleTemplateInput,
} from "@/lib/repositories/schedule-templates";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useScheduleTemplates() {
  return useQuery({
    queryKey: ["schedule-templates"],
    queryFn: scheduleTemplatesRepository.getAll,
  });
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateScheduleTemplateInput) =>
      scheduleTemplatesRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-templates"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.scheduleTemplates;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.scheduleTemplates;
      toast.error(ui.createFailed);
    },
  });
}

export function useDeleteScheduleTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => scheduleTemplatesRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-templates"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.scheduleTemplates;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.scheduleTemplates;
      toast.error(ui.deleteFailed);
    },
  });
}
