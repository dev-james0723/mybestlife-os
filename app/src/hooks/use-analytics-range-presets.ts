"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  analyticsRangePresetsRepository,
  type AnalyticsRangePresetInput,
} from "@/lib/repositories/analytics-range-presets";

export const analyticsRangePresetKeys = {
  all: ["analytics-range-presets"] as const,
};

export function useAnalyticsRangePresets() {
  return useQuery({
    queryKey: analyticsRangePresetKeys.all,
    queryFn: analyticsRangePresetsRepository.list,
  });
}

export function useCreateAnalyticsRangePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnalyticsRangePresetInput) =>
      analyticsRangePresetsRepository.create(input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: analyticsRangePresetKeys.all });
      toast.success(`Saved "${saved.name}"`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save range.");
    },
  });
}

export function useUpdateAnalyticsRangePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AnalyticsRangePresetInput }) =>
      analyticsRangePresetsRepository.update(id, input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: analyticsRangePresetKeys.all });
      toast.success(`Updated "${saved.name}"`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update range.");
    },
  });
}

export function useDeleteAnalyticsRangePreset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analyticsRangePresetsRepository.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsRangePresetKeys.all });
      toast.success("Saved range deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete range.");
    },
  });
}

export function useMarkAnalyticsRangePresetUsed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => analyticsRangePresetsRepository.markUsed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsRangePresetKeys.all });
    },
  });
}
