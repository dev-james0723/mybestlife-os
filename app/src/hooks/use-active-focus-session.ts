"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { plannerFocusSessionsRepository } from "@/lib/repositories/planner-focus-sessions";
import { useFocusSessionStore } from "@/stores/focus-session-store";

export const ACTIVE_FOCUS_SESSION_QUERY_KEY = ["planner-active-focus-session"] as const;

export function useActiveFocusSession() {
  const setActiveSession = useFocusSessionStore((state) => state.setActiveSession);
  const query = useQuery({
    queryKey: ACTIVE_FOCUS_SESSION_QUERY_KEY,
    queryFn: () => plannerFocusSessionsRepository.getActive(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    setActiveSession(query.data ?? null);
  }, [query.data, setActiveSession]);

  return query;
}
