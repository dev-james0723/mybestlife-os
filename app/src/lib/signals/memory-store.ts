/**
 * Signals — action-log storage adapter (Signal Memory, §17).
 *
 * Every per-card feedback control appends a {@link SignalAction} here. The log
 * powers reading-behavior ranking, the inspectable Signal Memory surface, and
 * the Weekly Reflection. MVP persists to localStorage (privacy-safe, local-only).
 *
 * TODO(Supabase): swap the read/write impl for `user_signal_actions` (per-user,
 * RLS-scoped to auth.uid()) — the migration already exists. Keep these function
 * signatures so the hook/components don't change.
 */

import { SIGNALS_ACTIONS_MAX, SIGNALS_ACTIONS_STORAGE_KEY } from "./constants";
import type { SignalAction } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadActions(): SignalAction[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SIGNALS_ACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is SignalAction =>
        !!a && typeof a === "object" && typeof (a as SignalAction).kind === "string",
    );
  } catch {
    return [];
  }
}

function persist(actions: SignalAction[]): void {
  if (!isBrowser()) return;
  try {
    // Keep only the newest N (the log is unbounded over a lifetime otherwise).
    const trimmed = actions.slice(-SIGNALS_ACTIONS_MAX);
    window.localStorage.setItem(SIGNALS_ACTIONS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full / disabled — non-fatal; behavior simply won't persist.
  }
}

/** Append an action and return the new, trimmed log (newest last). */
export function appendAction(
  action: Omit<SignalAction, "createdAt"> & { createdAt?: string },
): SignalAction[] {
  const entry: SignalAction = {
    ...action,
    createdAt: action.createdAt ?? new Date().toISOString(),
  };
  const next = [...loadActions(), entry];
  persist(next);
  return next;
}

/** Clear reading history entirely (§17 — must actually wipe, not theater). */
export function clearActions(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SIGNALS_ACTIONS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
