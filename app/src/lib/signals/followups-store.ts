/**
 * Signals — Follow-Up Tracker storage adapter (§7/§21).
 *
 * "Track this story" pins a developing signal the user wants to keep an eye on.
 * During refreshes we count fresh, similar items so the tracker can say
 * "developed N times since you started tracking." MVP persists to localStorage.
 *
 * TODO(Supabase): back this with `signal_followups` (per-user, RLS-scoped) — the
 * migration already exists. Keep these signatures so callers don't change.
 */

import { SIGNALS_FOLLOWUPS_STORAGE_KEY } from "./constants";
import type { SignalFollowUp, SignalFollowUpStatus, SignalItem } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadFollowUps(): SignalFollowUp[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SIGNALS_FOLLOWUPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is SignalFollowUp =>
        !!f && typeof f === "object" && typeof (f as SignalFollowUp).signalId === "string",
    );
  } catch {
    return [];
  }
}

function persist(followUps: SignalFollowUp[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SIGNALS_FOLLOWUPS_STORAGE_KEY, JSON.stringify(followUps));
  } catch {
    // non-fatal
  }
}

/** Begin (or re-open) tracking a story. Idempotent on signalId. */
export function trackFollowUp(signal: SignalItem): SignalFollowUp[] {
  const now = new Date().toISOString();
  const existing = loadFollowUps();
  const idx = existing.findIndex((f) => f.signalId === signal.id);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = { ...next[idx], status: "watching", updatedAt: now };
    persist(next);
    return next;
  }
  const entry: SignalFollowUp = {
    signalId: signal.id,
    headline: signal.headline,
    sourceUrl: signal.sourceUrl,
    sourceName: signal.source.name,
    topic: signal.topic,
    status: "watching",
    updateCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const next = [entry, ...existing];
  persist(next);
  return next;
}

export function setFollowUpStatus(
  signalId: string,
  status: SignalFollowUpStatus,
): SignalFollowUp[] {
  const now = new Date().toISOString();
  const next = loadFollowUps().map((f) =>
    f.signalId === signalId ? { ...f, status, updatedAt: now } : f,
  );
  persist(next);
  return next;
}

export function removeFollowUp(signalId: string): SignalFollowUp[] {
  const next = loadFollowUps().filter((f) => f.signalId !== signalId);
  persist(next);
  return next;
}

export function clearFollowUps(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(SIGNALS_FOLLOWUPS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Given the freshly-fetched candidate pool, bump `updateCount`/`lastSeenAt` for
 * watched stories that have a newer, similar item (same topic + token overlap in
 * the headline). Deterministic + source-grounded — never fabricates an update.
 */
export function reconcileFollowUps(
  pool: SignalItem[],
  followUps: SignalFollowUp[] = loadFollowUps(),
): SignalFollowUp[] {
  if (followUps.length === 0) return followUps;
  let changed = false;
  const next = followUps.map((f) => {
    if (f.status !== "watching") return f;
    const sinceMs = Date.parse(f.lastSeenAt ?? f.createdAt);
    const match = pool.find((item) => {
      if (item.id === f.signalId) return false;
      if (item.topic !== f.topic) return false;
      const publishedMs = Date.parse(item.publishedAt);
      if (Number.isFinite(sinceMs) && Number.isFinite(publishedMs) && publishedMs <= sinceMs) {
        return false;
      }
      return headlinesRelated(f.headline, item.headline);
    });
    if (!match) return f;
    changed = true;
    return {
      ...f,
      updateCount: f.updateCount + 1,
      lastSeenAt: match.publishedAt,
      updatedAt: new Date().toISOString(),
    };
  });
  if (changed) persist(next);
  return next;
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "as",
  "at",
  "by",
  "is",
  "are",
  "be",
  "this",
  "that",
  "from",
  "new",
  "says",
  "after",
  "over",
]);

function significantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

/** Two headlines are "related" when they share ≥2 significant tokens. */
function headlinesRelated(a: string, b: string): boolean {
  const ta = significantTokens(a);
  const tb = significantTokens(b);
  let shared = 0;
  for (const w of ta) {
    if (tb.has(w)) shared += 1;
    if (shared >= 2) return true;
  }
  return false;
}
