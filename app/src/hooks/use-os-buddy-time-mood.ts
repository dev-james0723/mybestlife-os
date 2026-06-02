"use client";

import { useEffect } from "react";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import type { OSBuddyMood } from "@/types/os-buddy";

const TIME_BUBBLE_STORAGE_KEY = "mblos:os-buddy-last-time-bubble-at";
const TIME_BUBBLE_GAP_MS = 6 * 60 * 60_000;
const CHECK_INTERVAL_MS = 5 * 60_000;

const ACTIVE_MOODS = new Set<OSBuddyMood>([
  "thinking",
  "creating",
  "reading",
  "focused",
  "success",
  "error",
  "celebrating",
  "dragging-left",
  "dragging-right",
]);

function readLastBubbleAt() {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(TIME_BUBBLE_STORAGE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function writeLastBubbleAt(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TIME_BUBBLE_STORAGE_KEY, String(value));
  } catch {
    // ignore storage failures
  }
}

function timeLine(locale: AppLocale, hour: number) {
  if (hour >= 6 && hour < 12) {
    return locale === "zh-TW" ? "新的開始。" : "Fresh start.";
  }
  if (hour >= 18 && hour < 23) {
    return locale === "zh-TW" ? "要不要收尾一件事？" : "Want to wrap up one thing?";
  }
  if (hour >= 23 || hour < 6) {
    return locale === "zh-TW" ? "夜深了，慢慢來。" : "Late night mode. Keep it gentle.";
  }
  return null;
}

export function useOSBuddyTimeMood(params: {
  enabled: boolean;
  locale: AppLocale;
}) {
  const showBubble = useOSBuddyStore((s) => s.showBubble);
  const setMood = useOSBuddyStore((s) => s.setMood);

  useEffect(() => {
    if (!params.enabled) return;

    const applyTimeMood = () => {
      const state = useOSBuddyStore.getState();
      const now = Date.now();
      if (state.isBirthdayMode) return;
      if (state.bubble?.type === "birthday") return;
      if (state.birthdayQuietUntil != null && now < state.birthdayQuietUntil) return;
      if (ACTIVE_MOODS.has(state.mood)) return;

      const hour = new Date(now).getHours();
      const lateNight = hour >= 23 || hour < 6;

      if (lateNight && state.mood === "idle") {
        setMood("sleepy");
      }

      const line = timeLine(params.locale, hour);
      if (!line) return;
      if (readLastBubbleAt() && now - readLastBubbleAt() < TIME_BUBBLE_GAP_MS) return;
      if (state.isMenuOpen || state.isMiniGameOpen || state.bubble) return;

      showBubble(line, "context", {
        durationMs: 3_200,
        unsolicited: true,
      });
      writeLastBubbleAt(now);
    };

    const initialTimer = setTimeout(applyTimeMood, 90_000);
    const interval = setInterval(applyTimeMood, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [params.enabled, params.locale, setMood, showBubble]);
}
