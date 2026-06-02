"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";
import { getOSBuddyContextHint } from "@/lib/os-buddy/os-buddy-context-hints";
import { useOSBuddyStore } from "@/stores/os-buddy-store";

const IDLE_HINT_DELAY_MS = 45_000;
const HINT_PAUSE_MS = 2 * 60_000;
const RECENT_BUBBLE_GAP_MS = 20_000;

export function useOSBuddyContextHints(params: {
  enabled: boolean;
  buddyName: string;
  locale: AppLocale;
}) {
  const pathname = usePathname();
  const showBubble = useOSBuddyStore((s) => s.showBubble);
  const bubble = useOSBuddyStore((s) => s.bubble);
  const isMenuOpen = useOSBuddyStore((s) => s.isMenuOpen);
  const isMiniGameOpen = useOSBuddyStore((s) => s.isMiniGameOpen);
  const lastUnsolicitedBubbleAt = useOSBuddyStore((s) => s.lastUnsolicitedBubbleAt);
  const pauseUntilRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!params.enabled) return;

    const clearHintTimer = () => {
      if (!timerRef.current) return;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const scheduleHint = () => {
      clearHintTimer();
      timerRef.current = setTimeout(() => {
        const now = Date.now();
        if (now < pauseUntilRef.current) return;
        if (useOSBuddyStore.getState().isMenuOpen) return;
        if (useOSBuddyStore.getState().isMiniGameOpen) return;
        const state = useOSBuddyStore.getState();
        if (state.bubble) return;
        if (state.isBirthdayMode) return;
        if (state.birthdayQuietUntil != null && now < state.birthdayQuietUntil) return;

        const lastBubble = state.lastUnsolicitedBubbleAt;
        if (lastBubble != null && now - lastBubble < RECENT_BUBBLE_GAP_MS) return;

        if (typeof document !== "undefined") {
          const hasOpenDialog = Boolean(
            document.querySelector('[role="dialog"], [data-slot="dialog-content"]'),
          );
          if (hasOpenDialog) return;
        }

        const hint = getOSBuddyContextHint({
          pathname: stripLeadingLocaleFromPathname(pathname ?? "/"),
          buddyName: params.buddyName,
          locale: params.locale,
        });

        if (!hint) return;
        showBubble(hint, "context", {
          durationMs: 4_200,
          unsolicited: true,
        });
        pauseUntilRef.current = now + HINT_PAUSE_MS;
      }, IDLE_HINT_DELAY_MS);
    };

    scheduleHint();

    const activityEvents: Array<keyof WindowEventMap> = ["pointermove", "keydown", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleHint, { passive: true });
    });

    return () => {
      clearHintTimer();
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleHint);
      });
    };
  }, [
    bubble,
    isMenuOpen,
    isMiniGameOpen,
    lastUnsolicitedBubbleAt,
    params.buddyName,
    params.enabled,
    params.locale,
    pathname,
    showBubble,
  ]);
}
