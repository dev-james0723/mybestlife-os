"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveFocusSession } from "@/hooks/use-active-focus-session";
import { useFocusPreferences } from "@/hooks/use-focus-preferences";
import { useLogPlannerStimulationEvent } from "@/hooks/use-planner-stimulation-events";
import {
  useAbandonPlannerFocusSession,
  useIncrementStimulationLeak,
} from "@/hooks/use-planner-focus-sessions";
import { isHighStimulationRoute, normalizeRoutePath } from "@/lib/daily-planner/focus/stimulation-score";
import type { StimulationDecision } from "@/types/database";

export type PendingDistractionGate = {
  route: string;
  normalizedRoute: string;
  startedAt: number;
};

export function useDistractionGate() {
  const router = useRouter();
  const { data: activeSession } = useActiveFocusSession();
  const { data: preferences } = useFocusPreferences();
  const logEvent = useLogPlannerStimulationEvent();
  const incrementLeak = useIncrementStimulationLeak();
  const abandonSession = useAbandonPlannerFocusSession();
  const [pendingGate, setPendingGate] = useState<PendingDistractionGate | null>(null);

  const active = activeSession?.status === "running" || activeSession?.status === "paused";
  const delaySeconds = preferences?.urge_surfing_delay_seconds ?? 10;

  const highStimulationRoutes = useMemo(
    () => preferences?.high_stimulation_routes ?? [],
    [preferences?.high_stimulation_routes],
  );

  const shouldGateRoute = useCallback(
    (route: string): boolean => {
      if (!active || !activeSession || !preferences?.distraction_gate_enabled) return false;
      return isHighStimulationRoute(route, highStimulationRoutes);
    },
    [
      active,
      activeSession,
      highStimulationRoutes,
      preferences?.distraction_gate_enabled,
    ],
  );

  const requestRoute = useCallback(
    (route: string): boolean => {
      if (!shouldGateRoute(route)) {
        router.push(route);
        return true;
      }
      setPendingGate({
        route,
        normalizedRoute: normalizeRoutePath(route),
        startedAt: Date.now(),
      });
      if (activeSession) {
        logEvent.mutate({
          focus_session_id: activeSession.id,
          plan_date: activeSession.plan_date,
          event_type: "route_gate",
          route,
          delay_seconds: delaySeconds,
        });
      }
      return false;
    },
    [activeSession, delaySeconds, logEvent, router, shouldGateRoute],
  );

  const closeGate = useCallback(() => {
    setPendingGate(null);
  }, []);

  const logDecision = useCallback(
    (decision: StimulationDecision, reason?: string) => {
      if (!pendingGate || !activeSession) return;
      logEvent.mutate({
        focus_session_id: activeSession.id,
        plan_date: activeSession.plan_date,
        event_type: "urge_surfing",
        route: pendingGate.route,
        decision,
        reason: reason?.trim() || null,
        delay_seconds: delaySeconds,
      });
    },
    [activeSession, delaySeconds, logEvent, pendingGate],
  );

  const returnToFocus = useCallback(
    (reason?: string) => {
      logDecision("returned_to_focus", reason);
      closeGate();
    },
    [closeGate, logDecision],
  );

  const captureNoteAndReturn = useCallback(
    (note: string) => {
      logDecision("captured_and_returned", note);
      closeGate();
    },
    [closeGate, logDecision],
  );

  const continueIntentionally = useCallback(
    (reason?: string) => {
      if (!pendingGate) return;
      logDecision("continued_intentionally", reason);
      if (activeSession) {
        incrementLeak.mutate(activeSession.id);
      }
      const route = pendingGate.route;
      closeGate();
      router.push(route);
    },
    [activeSession, closeGate, incrementLeak, logDecision, pendingGate, router],
  );

  const abandonFocusAndContinue = useCallback(
    (reason?: string) => {
      if (!pendingGate || !activeSession) return;
      logDecision("abandoned_session", reason);
      abandonSession.mutate({
        id: activeSession.id,
        input: {
          completion_state: "not_completed",
          completion_note: reason?.trim() || "Abandoned from Distraction Gate.",
        },
      });
      const route = pendingGate.route;
      closeGate();
      router.push(route);
    },
    [abandonSession, activeSession, closeGate, logDecision, pendingGate, router],
  );

  return {
    activeSession,
    preferences,
    pendingGate,
    delaySeconds,
    shouldGateRoute,
    requestRoute,
    closeGate,
    returnToFocus,
    captureNoteAndReturn,
    continueIntentionally,
    abandonFocusAndContinue,
  };
}
