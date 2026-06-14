"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useProfile } from "@/hooks/use-settings";
import { useAppStore } from "@/stores/app-store";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import {
  DESKTOP_SHORTCUT_DOUBLE_PRESS_WINDOW_MS,
  TWO_FINGER_DOUBLE_TAP_MAX_DISTANCE_PX,
  TWO_FINGER_DOUBLE_TAP_WINDOW_MS,
  TWO_FINGER_TAP_MAX_DURATION_MS,
  TWO_FINGER_TAP_MAX_MOVE_PX,
  hasActiveOSBuddyShortcutBlocker,
  isOSBuddyShortcutTargetBlocked,
  resolveDesktopShortcutKeydown,
  validateOSBuddyShortcutSettings,
  type OSBuddyDesktopShortcutPress,
  type OSBuddyShortcutSettings,
} from "@/lib/os-buddy/os-buddy-shortcuts";

type Point = { x: number; y: number };

type TwoFingerTapSession = {
  startedAt: number;
  startCenter: Point;
  lastCenter: Point;
  maxMovePx: number;
};

function centerFromTouches(touches: TouchList): Point | null {
  if (touches.length < 2) return null;
  const first = touches.item(0);
  const second = touches.item(1);
  if (!first || !second) return null;
  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function toastLabel(locale: string, enabled: boolean) {
  if (locale === "zh-TW") {
    return enabled ? "OS Buddy 已顯示" : "OS Buddy 已隱藏";
  }
  return enabled ? "OS Buddy shown" : "OS Buddy hidden";
}

export function OSBuddyShortcutController() {
  const locale = useAppStore((s) => s.language);
  const { data: profile } = useProfile();
  const { enabled, setEnabled } = useOSBuddy();
  const isRestingInSidebar = useOSBuddyStore((s) => s.isRestingInSidebar);

  const settingsRef = useRef<OSBuddyShortcutSettings>(
    validateOSBuddyShortcutSettings(undefined),
  );
  const enabledRef = useRef(enabled);
  const isRestingInSidebarRef = useRef(isRestingInSidebar);
  const previousDesktopPressRef = useRef<OSBuddyDesktopShortcutPress | null>(null);
  const togglingRef = useRef(false);
  const touchSessionRef = useRef<TwoFingerTapSession | null>(null);
  const previousTwoFingerTapRef = useRef<{ at: number; center: Point } | null>(null);

  useEffect(() => {
    settingsRef.current = validateOSBuddyShortcutSettings(profile?.os_buddy_shortcut_settings);
  }, [profile?.os_buddy_shortcut_settings]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    isRestingInSidebarRef.current = isRestingInSidebar;
  }, [isRestingInSidebar]);

  const toggleBuddy = useCallback(async () => {
    if (togglingRef.current) return;
    togglingRef.current = true;
    try {
      const store = useOSBuddyStore.getState();
      const isOnScreen = enabledRef.current && !isRestingInSidebarRef.current;

      if (isOnScreen) {
        isRestingInSidebarRef.current = true;
        store.dockInRestingSpace("resting");
        toast.success(toastLabel(locale, false));
        return;
      }

      const enablePromise = enabledRef.current ? Promise.resolve() : setEnabled(true);
      enabledRef.current = true;
      isRestingInSidebarRef.current = false;
      store.releaseFromRestingSpace();
      store.showBubble("Hi, I'm back.", "user-triggered", {
        force: true,
        durationMs: 2_400,
      });
      await enablePromise;
    } finally {
      togglingRef.current = false;
    }
  }, [locale, setEnabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.isComposing) return;
      if (hasActiveOSBuddyShortcutBlocker(document)) return;
      if (isOSBuddyShortcutTargetBlocked(event.target)) return;

      const resolution = resolveDesktopShortcutKeydown({
        event,
        shortcut: settingsRef.current.desktopToggle,
        previousPress: previousDesktopPressRef.current,
        now: Date.now(),
        windowMs: DESKTOP_SHORTCUT_DOUBLE_PRESS_WINDOW_MS,
      });

      previousDesktopPressRef.current = resolution.nextPress;

      if (resolution.action === "ignore") return;

      event.preventDefault();
      if (resolution.action === "trigger") void toggleBuddy();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [toggleBuddy]);

  useEffect(() => {
    const startTwoFingerTap = (event: TouchEvent) => {
      if (!settingsRef.current.twoFingerDoubleTapEnabled) return;
      if (event.touches.length !== 2) {
        touchSessionRef.current = null;
        return;
      }
      if (hasActiveOSBuddyShortcutBlocker(document)) return;
      if (isOSBuddyShortcutTargetBlocked(event.target)) return;

      const center = centerFromTouches(event.touches);
      if (!center) return;

      touchSessionRef.current = {
        startedAt: Date.now(),
        startCenter: center,
        lastCenter: center,
        maxMovePx: 0,
      };
    };

    const updateTwoFingerTap = (event: TouchEvent) => {
      const session = touchSessionRef.current;
      if (!session) return;
      if (event.touches.length !== 2) return;

      const center = centerFromTouches(event.touches);
      if (!center) return;

      touchSessionRef.current = {
        ...session,
        lastCenter: center,
        maxMovePx: Math.max(session.maxMovePx, distance(session.startCenter, center)),
      };
    };

    const finishTwoFingerTap = (event: TouchEvent) => {
      const session = touchSessionRef.current;
      if (!session) return;
      if (event.touches.length > 0) return;

      touchSessionRef.current = null;
      const now = Date.now();
      const isTap =
        now - session.startedAt <= TWO_FINGER_TAP_MAX_DURATION_MS &&
        session.maxMovePx <= TWO_FINGER_TAP_MAX_MOVE_PX;

      if (!isTap) {
        previousTwoFingerTapRef.current = null;
        return;
      }

      const previous = previousTwoFingerTapRef.current;
      const isDoubleTap =
        previous != null &&
        now - previous.at <= TWO_FINGER_DOUBLE_TAP_WINDOW_MS &&
        distance(previous.center, session.lastCenter) <=
          TWO_FINGER_DOUBLE_TAP_MAX_DISTANCE_PX;

      if (!isDoubleTap) {
        previousTwoFingerTapRef.current = { at: now, center: session.lastCenter };
        return;
      }

      previousTwoFingerTapRef.current = null;
      event.preventDefault();
      void toggleBuddy();
    };

    const cancelTwoFingerTap = () => {
      touchSessionRef.current = null;
      previousTwoFingerTapRef.current = null;
    };

    window.addEventListener("touchstart", startTwoFingerTap, { passive: true });
    window.addEventListener("touchmove", updateTwoFingerTap, { passive: true });
    window.addEventListener("touchend", finishTwoFingerTap, { passive: false });
    window.addEventListener("touchcancel", cancelTwoFingerTap, { passive: true });
    return () => {
      window.removeEventListener("touchstart", startTwoFingerTap);
      window.removeEventListener("touchmove", updateTwoFingerTap);
      window.removeEventListener("touchend", finishTwoFingerTap);
      window.removeEventListener("touchcancel", cancelTwoFingerTap);
    };
  }, [toggleBuddy]);

  return null;
}
