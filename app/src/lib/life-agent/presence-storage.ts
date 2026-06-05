import type { CompanionPresenceState } from "@/lib/life-agent/companion-presence-types";
import type { CompanionArrivalState } from "@/lib/life-agent/companion-presence-types";
import { COMPANION_ARRIVAL_STATES } from "@/lib/life-agent/companion-presence-types";

const STORAGE_KEY = "mylifeos-life-agent-presence-v1";

/** Stable default for SSR and useSyncExternalStore server snapshot. */
export const COMPANION_PRESENCE_DEFAULT: CompanionPresenceState = {
  arrival: null,
  checkInCompletedAt: null,
  dismissedContinuityId: null,
};

const listeners = new Set<() => void>();

/** Cached client snapshot — same reference until localStorage values change. */
let cachedSnapshot: CompanionPresenceState = COMPANION_PRESENCE_DEFAULT;
let cachedStorageRaw: string | null = null;

export function subscribeCompanionPresence(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function emitChange(): void {
  listeners.forEach((l) => l());
}

function isArrivalState(v: string): v is CompanionArrivalState {
  return (COMPANION_ARRIVAL_STATES as readonly string[]).includes(v);
}

function parsePresenceRaw(raw: string | null): CompanionPresenceState {
  if (!raw) return COMPANION_PRESENCE_DEFAULT;
  try {
    const parsed = JSON.parse(raw) as Partial<CompanionPresenceState>;
    return {
      arrival:
        typeof parsed.arrival === "string" && isArrivalState(parsed.arrival)
          ? parsed.arrival
          : null,
      checkInCompletedAt:
        typeof parsed.checkInCompletedAt === "string" ? parsed.checkInCompletedAt : null,
      dismissedContinuityId:
        typeof parsed.dismissedContinuityId === "string"
          ? parsed.dismissedContinuityId
          : null,
    };
  } catch {
    return COMPANION_PRESENCE_DEFAULT;
  }
}

function presenceEqual(a: CompanionPresenceState, b: CompanionPresenceState): boolean {
  return (
    a.arrival === b.arrival &&
    a.checkInCompletedAt === b.checkInCompletedAt &&
    a.dismissedContinuityId === b.dismissedContinuityId
  );
}

/**
 * Client snapshot for useSyncExternalStore — returns a stable object reference
 * when underlying localStorage data has not changed.
 */
export function getCompanionPresenceSnapshot(): CompanionPresenceState {
  if (typeof window === "undefined") return COMPANION_PRESENCE_DEFAULT;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return COMPANION_PRESENCE_DEFAULT;
  }

  if (raw === cachedStorageRaw) return cachedSnapshot;

  const next = parsePresenceRaw(raw);
  cachedStorageRaw = raw;

  if (presenceEqual(next, cachedSnapshot)) return cachedSnapshot;

  cachedSnapshot = next;
  return cachedSnapshot;
}

/** @deprecated Use getCompanionPresenceSnapshot for subscriptions. */
export function readCompanionPresence(): CompanionPresenceState {
  return getCompanionPresenceSnapshot();
}

export function writeCompanionPresence(state: CompanionPresenceState): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedStorageRaw = raw;
    if (!presenceEqual(state, cachedSnapshot)) {
      cachedSnapshot = state;
    }
    emitChange();
  } catch {
    // ignore
  }
}

export function setCompanionArrival(arrival: CompanionArrivalState): void {
  const current = getCompanionPresenceSnapshot();
  writeCompanionPresence({
    ...current,
    arrival,
    checkInCompletedAt: new Date().toISOString(),
  });
}

export function dismissContinuityCard(continuityId: string): void {
  const current = getCompanionPresenceSnapshot();
  writeCompanionPresence({ ...current, dismissedContinuityId: continuityId });
}
