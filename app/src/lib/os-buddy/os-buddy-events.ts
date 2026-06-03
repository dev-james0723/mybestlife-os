import { useEffect } from "react";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
  OSBuddyAirControlStopReason,
} from "@/lib/os-buddy/os-buddy-air-control-types";
import type {
  OSBuddyMiniGame,
  OSBuddyRoamInterruptReason,
} from "@/stores/os-buddy-store";

export const OS_BUDDY_EVENT_NAME = "mblos:os-buddy-event";

export type OSBuddyEvent =
  | { type: "project:generate:start"; label?: string }
  | { type: "project:generate:success"; label?: string }
  | { type: "project:generate:error"; label?: string; error?: string }
  | { type: "asset:extract:start" }
  | { type: "asset:extract:success" }
  | { type: "asset:extract:error"; error?: string }
  | { type: "asset:visual:start" }
  | { type: "asset:visual:success" }
  | { type: "asset:visual:error"; error?: string }
  | { type: "knowledge:summarize:start" }
  | { type: "knowledge:summarize:success" }
  | { type: "knowledge:summarize:error"; error?: string }
  | { type: "task:suggest:start" }
  | { type: "task:suggest:success" }
  | { type: "task:suggest:error"; error?: string }
  | { type: "task:complete"; title?: string }
  | { type: "habit:complete"; title?: string }
  | { type: "streak:milestone"; count: number }
  | { type: "focus:start"; durationMinutes?: number }
  | { type: "focus:pause" }
  | { type: "focus:resume" }
  | { type: "focus:complete" }
  | { type: "user:idle" }
  | { type: "user:return" }
  | { type: "buddy:clicked" }
  | { type: "buddy:drag:start" }
  | { type: "buddy:drag:end" }
  | { type: "buddy:longpress" }
  | { type: "buddy:walk:start" }
  | { type: "buddy:walk:return" }
  | { type: "buddy:walk:end" }
  | { type: "buddy:air-control:start"; sensorMode?: OSBuddyAirControlSensorMode }
  | { type: "buddy:air-control:end"; reason?: OSBuddyAirControlStopReason }
  | {
      type: "buddy:air-control:calibrated";
      quality: OSBuddyAirControlQuality;
      rmsErrorPx?: number | null;
    }
  | { type: "buddy:air-control:error"; error?: string }
  | { type: "buddy:air-control:gesture"; gesture: OSBuddyAirControlGesture }
  | { type: "buddy:free-roam:start" }
  | { type: "buddy:free-roam:end"; reason?: OSBuddyRoamInterruptReason }
  | {
      type: "buddy:free-roam:interrupt";
      reason: OSBuddyRoamInterruptReason;
    }
  | { type: "game:start"; game: OSBuddyMiniGame }
  | { type: "game:complete"; game: OSBuddyMiniGame; score?: number }
  | { type: "birthday:today"; age?: number }
  | { type: "birthday:upcoming"; daysUntil: number; age?: number }
  | { type: "birthday:set" }
  | { type: "birthday:clear" };

export function emitOSBuddyEvent(event: OSBuddyEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OSBuddyEvent>(OS_BUDDY_EVENT_NAME, { detail: event }));
}

export function subscribeToOSBuddyEvents(listener: (event: OSBuddyEvent) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (evt: Event) => {
    const custom = evt as CustomEvent<OSBuddyEvent>;
    if (!custom.detail) return;
    listener(custom.detail);
  };

  window.addEventListener(OS_BUDDY_EVENT_NAME, handler);
  return () => window.removeEventListener(OS_BUDDY_EVENT_NAME, handler);
}

export const addOSBuddyEventListener = subscribeToOSBuddyEvents;

export function useOSBuddyEvents(handler: (event: OSBuddyEvent) => void): void {
  useEffect(() => subscribeToOSBuddyEvents(handler), [handler]);
}
