"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  plannerFocusSessionsRepository,
  type CreatePlannerFocusSessionInput,
  type FinishPlannerFocusSessionInput,
} from "@/lib/repositories/planner-focus-sessions";
import { ACTIVE_FOCUS_SESSION_QUERY_KEY } from "@/hooks/use-active-focus-session";

export function plannerFocusSessionsQueryKey(planDate: string) {
  return ["planner-focus-sessions", planDate] as const;
}

function invalidateFocusReality(queryClient: ReturnType<typeof useQueryClient>, planDate?: string) {
  if (planDate) {
    queryClient.invalidateQueries({ queryKey: plannerFocusSessionsQueryKey(planDate) });
    queryClient.invalidateQueries({ queryKey: ["planner-stimulation-events", planDate] });
    queryClient.invalidateQueries({ queryKey: ["daily-plan-review", planDate] });
  }
  queryClient.invalidateQueries({ queryKey: ACTIVE_FOCUS_SESSION_QUERY_KEY });
}

export function usePlannerFocusSessions(planDate: string) {
  return useQuery({
    queryKey: plannerFocusSessionsQueryKey(planDate),
    queryFn: () => plannerFocusSessionsRepository.getForDate(planDate),
    enabled: !!planDate,
  });
}

export function useStartPlannerFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlannerFocusSessionInput) =>
      plannerFocusSessionsRepository.start(input),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function usePausePlannerFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plannerFocusSessionsRepository.pause(id),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function useResumePlannerFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plannerFocusSessionsRepository.resume(id),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function useCompletePlannerFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FinishPlannerFocusSessionInput }) =>
      plannerFocusSessionsRepository.complete(id, input),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function useAbandonPlannerFocusSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: FinishPlannerFocusSessionInput }) =>
      plannerFocusSessionsRepository.abandon(id, input),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function useIncrementFocusInterruption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plannerFocusSessionsRepository.incrementInterruption(id),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}

export function useIncrementStimulationLeak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => plannerFocusSessionsRepository.incrementStimulationLeak(id),
    onSuccess: (session) => {
      invalidateFocusReality(queryClient, session.plan_date);
    },
  });
}
