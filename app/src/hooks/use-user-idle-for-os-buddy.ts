"use client";

import { useEffect } from "react";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";

const ACTIVE_IDLE_MS = 3 * 60_000;
const HIDDEN_IDLE_MS = 60_000;

export function useUserIdleForOSBuddy(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let idle = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    const markIdle = () => {
      if (idle) return;
      idle = true;
      emitOSBuddyEvent({ type: "user:idle" });
    };

    const scheduleIdle = (delayMs: number) => {
      clearTimer();
      timer = setTimeout(markIdle, delayMs);
    };

    const markActive = () => {
      if (document.visibilityState === "hidden") {
        scheduleIdle(HIDDEN_IDLE_MS);
        return;
      }

      if (idle) {
        idle = false;
        emitOSBuddyEvent({ type: "user:return" });
      }
      scheduleIdle(ACTIVE_IDLE_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        scheduleIdle(HIDDEN_IDLE_MS);
        return;
      }
      markActive();
    };

    markActive();

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointermove",
      "keydown",
      "scroll",
      "focus",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);
}
