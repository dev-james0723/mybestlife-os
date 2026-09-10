"use client";

import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  appendAction,
  clearActions,
  loadActions,
} from "@/lib/signals/memory-store";
import { deriveBehavior } from "@/lib/signals/behavior";
import type {
  SignalAction,
  SignalActionKind,
  SignalBehavior,
  SignalItem,
} from "@/lib/signals/types";

export type UseSignalMemoryReturn = {
  actions: SignalAction[];
  ready: boolean;
  /** Log a feedback action against a signal (captures topic + source domain). */
  record: (signal: Pick<SignalItem, "id" | "topic" | "source">, kind: SignalActionKind) => void;
  /** Wipe the local reading history for real (§17). */
  clearHistory: () => void;
  /** Recency-decayed behavior signal derived from the log (always computed). */
  behavior: SignalBehavior;
};

/**
 * The reading-behavior + Signal Memory action log (localStorage MVP).
 *
 * TODO(Supabase): back `record`/`clearHistory` with `user_signal_actions`; the
 * hook surface stays identical.
 */
export function useSignalMemory(): UseSignalMemoryReturn {
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const [actions, setActions] = useState<SignalAction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    setActions(loadActions(userId));
    setReady(true);
  }, [userId, isLoading]);

  const record = useCallback(
    (signal: Pick<SignalItem, "id" | "topic" | "source">, kind: SignalActionKind) => {
      const next = appendAction({
        signalId: signal.id,
        kind,
        topic: signal.topic,
        domain: signal.source?.domain,
      }, userId);
      setActions(next);
    },
    [userId],
  );

  const clearHistory = useCallback(() => {
    clearActions(userId);
    setActions([]);
  }, [userId]);

  const behavior = useMemo(() => deriveBehavior(actions), [actions]);

  return { actions, ready, record, clearHistory, behavior };
}
