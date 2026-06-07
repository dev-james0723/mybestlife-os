"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  plannerStimulationEventsRepository,
  type LogPlannerStimulationEventInput,
} from "@/lib/repositories/planner-stimulation-events";
import { ACTIVE_FOCUS_SESSION_QUERY_KEY } from "@/hooks/use-active-focus-session";

export function plannerStimulationEventsQueryKey(planDate: string) {
  return ["planner-stimulation-events", planDate] as const;
}

export function usePlannerStimulationEvents(planDate: string) {
  return useQuery({
    queryKey: plannerStimulationEventsQueryKey(planDate),
    queryFn: () => plannerStimulationEventsRepository.getForDate(planDate),
    enabled: !!planDate,
  });
}

export function usePlannerStimulationEventsForSession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ["planner-stimulation-events", "session", sessionId],
    queryFn: () => plannerStimulationEventsRepository.getForSession(sessionId ?? ""),
    enabled: !!sessionId,
  });
}

export function useLogPlannerStimulationEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LogPlannerStimulationEventInput) =>
      plannerStimulationEventsRepository.log(input),
    onSuccess: (event) => {
      queryClient.invalidateQueries({
        queryKey: plannerStimulationEventsQueryKey(event.plan_date),
      });
      queryClient.invalidateQueries({ queryKey: ACTIVE_FOCUS_SESSION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["daily-plan-review", event.plan_date] });
    },
  });
}
