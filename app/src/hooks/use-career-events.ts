"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerEventsRepository,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/lib/repositories/career-events";

const KEY = ["career-events"] as const;

export function useCareerEvents() {
  return useQuery({
    queryKey: KEY,
    queryFn: careerEventsRepository.list,
    staleTime: 30_000,
  });
}

export function useCreateCareerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) =>
      careerEventsRepository.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
    },
  });
}

export function useUpdateCareerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateEventInput }) =>
      careerEventsRepository.update(id, updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    },
  });
}

export function useDeleteCareerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerEventsRepository.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    },
  });
}
