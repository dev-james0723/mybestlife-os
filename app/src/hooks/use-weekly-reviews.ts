"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  weeklyReviewsRepository,
  type CreateWeeklyReviewInput,
  type UpdateWeeklyReviewInput,
} from "@/lib/repositories/weekly-reviews";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useWeeklyReviews() {
  return useQuery({
    queryKey: ["weekly-reviews"],
    queryFn: weeklyReviewsRepository.getAll,
  });
}

export function useWeeklyReview(id: string) {
  return useQuery({
    queryKey: ["weekly-reviews", id],
    queryFn: () => weeklyReviewsRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWeeklyReviewInput) => weeklyReviewsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reviews"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWeeklyReviewInput }) =>
      weeklyReviewsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reviews"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteWeeklyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => weeklyReviewsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reviews"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.weeklyReviews;
      toast.error(ui.deleteFailed);
    },
  });
}
