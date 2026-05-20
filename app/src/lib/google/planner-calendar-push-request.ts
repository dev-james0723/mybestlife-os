"use client";

import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";

const pushListeners = new Set<() => void>();
let pushInFlight = 0;

const lastPushListeners = new Set<() => void>();
const lastPushIsoByDate: Record<string, string> = {};

function emitPushPending() {
  pushListeners.forEach((l) => l());
}

function emitLastPush() {
  lastPushListeners.forEach((l) => l());
}

export function subscribePlannerGcalPushPending(cb: () => void) {
  pushListeners.add(cb);
  return () => pushListeners.delete(cb);
}

export function getPlannerGcalPushPending(): boolean {
  return pushInFlight > 0;
}

export function subscribePlannerGcalLastPush(cb: () => void) {
  lastPushListeners.add(cb);
  return () => lastPushListeners.delete(cb);
}

export function getPlannerGcalLastPushAt(planDate: string): string | null {
  return lastPushIsoByDate[planDate] ?? null;
}

export function setPlannerGcalLastPushAt(planDate: string, iso: string) {
  lastPushIsoByDate[planDate] = iso;
  emitLastPush();
}

/**
 * After a successful Daily Planner save, asks the server to push Time Block tasks
 * to Google Calendar (no tokens on the client).
 */
export async function requestPlannerGoogleCalendarPush(
  planDate: string,
): Promise<{ syncedAt: string | null }> {
  if (typeof window === "undefined") return { syncedAt: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) return { syncedAt: null };
  if (hasDevLoginBypassCookie()) return { syncedAt: null };
  pushInFlight++;
  emitPushPending();
  try {
    const res = await fetch("/api/google/calendar/push-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planDate }),
      credentials: "include",
    });
    const j = (await res.json().catch(() => ({}))) as { syncedAt?: string };
    const syncedAt = typeof j.syncedAt === "string" ? j.syncedAt : null;
    if (res.ok && syncedAt) {
      setPlannerGcalLastPushAt(planDate, syncedAt);
    }
    return { syncedAt: res.ok ? syncedAt : null };
  } catch {
    return { syncedAt: null };
  } finally {
    pushInFlight--;
    emitPushPending();
  }
}
