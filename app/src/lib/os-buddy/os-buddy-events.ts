import type { OSBuddyMiniGame } from "@/stores/os-buddy-store";

export const OS_BUDDY_EVENT_NAME = "mblos:os-buddy-event";

export type OSBuddyEvent =
  | { type: "project:generate:start" }
  | { type: "project:generate:success" }
  | { type: "project:generate:error"; error?: string }
  | { type: "asset:extract:start" }
  | { type: "asset:extract:success" }
  | { type: "asset:extract:error"; error?: string }
  | { type: "asset:visual:start" }
  | { type: "asset:visual:success" }
  | { type: "asset:visual:error"; error?: string }
  | { type: "task:suggest:start" }
  | { type: "task:suggest:success" }
  | { type: "task:suggest:error"; error?: string }
  | { type: "task:complete"; title?: string }
  | { type: "habit:complete"; title?: string }
  | { type: "streak:milestone"; count: number }
  | { type: "focus:start"; durationMinutes?: number }
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
  | { type: "game:start"; game: OSBuddyMiniGame }
  | { type: "game:complete"; game: OSBuddyMiniGame; score?: number };

export function emitOSBuddyEvent(event: OSBuddyEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OSBuddyEvent>(OS_BUDDY_EVENT_NAME, { detail: event }));
}

export function addOSBuddyEventListener(listener: (event: OSBuddyEvent) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (evt: Event) => {
    const custom = evt as CustomEvent<OSBuddyEvent>;
    if (!custom.detail) return;
    listener(custom.detail);
  };

  window.addEventListener(OS_BUDDY_EVENT_NAME, handler);
  return () => window.removeEventListener(OS_BUDDY_EVENT_NAME, handler);
}
