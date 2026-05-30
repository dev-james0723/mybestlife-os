"use client";

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
  const [actions, setActions] = useState<SignalAction[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setActions(loadActions());
    setReady(true);
  }, []);

  const record = useCallback(
    (signal: Pick<SignalItem, "id" | "topic" | "source">, kind: SignalActionKind) => {
      const next = appendAction({
        signalId: signal.id,
        kind,
        topic: signal.topic,
        domain: signal.source?.domain,
      });
      setActions(next);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    clearActions();
    setActions([]);
  }, []);

  const behavior = useMemo(() => deriveBehavior(actions), [actions]);

  return { actions, ready, record, clearHistory, behavior };
}
