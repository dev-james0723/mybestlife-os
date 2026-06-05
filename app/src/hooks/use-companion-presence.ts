"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  CompanionArrivalState,
  CompanionPresenceState,
} from "@/lib/life-agent/companion-presence-types";
import {
  COMPANION_PRESENCE_DEFAULT,
  dismissContinuityCard,
  getCompanionPresenceSnapshot,
  setCompanionArrival,
  subscribeCompanionPresence,
  writeCompanionPresence,
} from "@/lib/life-agent/presence-storage";

function getServerSnapshot(): CompanionPresenceState {
  return COMPANION_PRESENCE_DEFAULT;
}

export function useCompanionPresence() {
  const presence = useSyncExternalStore(
    subscribeCompanionPresence,
    getCompanionPresenceSnapshot,
    getServerSnapshot,
  );

  const completeCheckIn = useCallback((arrival: CompanionArrivalState) => {
    setCompanionArrival(arrival);
  }, []);

  const dismissContinuity = useCallback((id: string) => {
    dismissContinuityCard(id);
  }, []);

  const resetCheckIn = useCallback(() => {
    writeCompanionPresence({
      arrival: null,
      checkInCompletedAt: null,
      dismissedContinuityId: presence.dismissedContinuityId,
    });
  }, [presence.dismissedContinuityId]);

  return {
    ...presence,
    completeCheckIn,
    dismissContinuity,
    resetCheckIn,
  };
}
