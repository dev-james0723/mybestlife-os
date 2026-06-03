"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlannerGcalLastPushAt,
  getPlannerGcalPushPending,
  subscribePlannerGcalLastPush,
  subscribePlannerGcalPushPending,
} from "@/lib/google/planner-calendar-push-request";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";

export type GoogleCalendarPlannerStatus = {
  connected: boolean;
  syncEnabled: boolean;
  email: string | null;
  watchExpiration: string | null;
  lastIncrementalSyncAt: string | null;
  lastFullSyncAt: string | null;
  pendingCount: number;
  errorCount: number;
  conflictCount: number;
  remoteDeletedCount: number;
};

function useOptionalGoogleCalendarApiEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!hasDevLoginBypassCookie());
  }, []);

  return enabled;
}

export function useGoogleCalendarPlannerStatus() {
  const optionalApiEnabled = useOptionalGoogleCalendarApiEnabled();

  return useQuery({
    queryKey: ["google-calendar-planner-status"],
    queryFn: async (): Promise<GoogleCalendarPlannerStatus> => {
      const res = await fetch("/api/google/calendar/status", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return (await res.json()) as GoogleCalendarPlannerStatus;
    },
    enabled: optionalApiEnabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    retry: 3,
    retryDelay: (attempt) => 400 * (attempt + 1),
  });
}

/** True while a server push to Google Calendar is in flight after a planner save. */
export function usePlannerGcalPushPending() {
  return useSyncExternalStore(
    subscribePlannerGcalPushPending,
    getPlannerGcalPushPending,
    () => false,
  );
}

/** ISO timestamp of the last successful push for this plan date (client-side). */
export function usePlannerGcalLastPushAt(planDate: string | undefined) {
  return useSyncExternalStore(
    subscribePlannerGcalLastPush,
    () => (planDate ? getPlannerGcalLastPushAt(planDate) : null),
    () => null,
  );
}

export type TaskSyncMap = Record<string, { sync_status: string; sync_error_message: string | null }>;

export function useGoogleCalendarTaskSyncForDate(planDate: string | undefined) {
  const optionalApiEnabled = useOptionalGoogleCalendarApiEnabled();
  const hasValidPlanDate = !!planDate && /^\d{4}-\d{2}-\d{2}$/.test(planDate);

  return useQuery({
    queryKey: ["google-calendar-task-sync", planDate],
    queryFn: async (): Promise<TaskSyncMap> => {
      const res = await fetch(
        `/api/google/calendar/task-sync?planDate=${encodeURIComponent(planDate!)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(await res.text());
      const j = (await res.json()) as { tasks: TaskSyncMap };
      return j.tasks ?? {};
    },
    enabled: optionalApiEnabled && hasValidPlanDate,
    staleTime: 10_000,
  });
}
