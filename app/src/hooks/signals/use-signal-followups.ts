"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearFollowUps,
  loadFollowUps,
  reconcileFollowUps,
  removeFollowUp,
  setFollowUpStatus,
  trackFollowUp,
} from "@/lib/signals/followups-store";
import type {
  SignalFollowUp,
  SignalFollowUpStatus,
  SignalItem,
} from "@/lib/signals/types";

export type UseSignalFollowUpsReturn = {
  followUps: SignalFollowUp[];
  ready: boolean;
  /** Currently watched stories (newest first). */
  watching: SignalFollowUp[];
  isTracked: (signalId: string) => boolean;
  track: (signal: SignalItem) => void;
  setStatus: (signalId: string, status: SignalFollowUpStatus) => void;
  remove: (signalId: string) => void;
  clearAll: () => void;
  /** Bump update counts against a fresh candidate pool (source-grounded). */
  reconcile: (pool: SignalItem[]) => void;
};

/**
 * Follow-Up Tracker state (localStorage MVP).
 *
 * TODO(Supabase): back this with `signal_followups`; signatures stay identical.
 */
export function useSignalFollowUps(): UseSignalFollowUpsReturn {
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const [followUps, setFollowUps] = useState<SignalFollowUp[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setFollowUps(loadFollowUps(userId));
    setReady(true);
  }, [userId, isLoading]);

  const track = useCallback((signal: SignalItem) => {
    setFollowUps(trackFollowUp(signal, userId));
  }, [userId]);

  const setStatus = useCallback((signalId: string, status: SignalFollowUpStatus) => {
    setFollowUps(setFollowUpStatus(signalId, status, userId));
  }, [userId]);

  const remove = useCallback((signalId: string) => {
    setFollowUps(removeFollowUp(signalId, userId));
  }, [userId]);

  const clearAll = useCallback(() => {
    clearFollowUps(userId);
    setFollowUps([]);
  }, [userId]);

  const reconcile = useCallback((pool: SignalItem[]) => {
    if (pool.length === 0) return;
    setFollowUps((prev) => (prev.length === 0 ? prev : reconcileFollowUps(pool, prev, userId)));
  }, [userId]);

  const watching = useMemo(
    () => followUps.filter((f) => f.status === "watching"),
    [followUps],
  );

  const trackedIds = useMemo(
    () => new Set(followUps.filter((f) => f.status !== "dismissed").map((f) => f.signalId)),
    [followUps],
  );
  const isTracked = useCallback((signalId: string) => trackedIds.has(signalId), [trackedIds]);

  return {
    followUps,
    ready,
    watching,
    isTracked,
    track,
    setStatus,
    remove,
    clearAll,
    reconcile,
  };
}
