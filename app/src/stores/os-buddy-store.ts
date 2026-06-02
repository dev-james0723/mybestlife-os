import { create } from "zustand";
import type {
  OSBuddyCompanionCta,
  OSBuddyCompanionKind,
  OSBuddyMiniGame,
} from "@/lib/os-buddy/os-buddy-companion";
import type { OSBuddyMood } from "@/types/os-buddy";

const UNSOLICITED_BUBBLE_COOLDOWN_MS = 20_000;
const DEFAULT_BUBBLE_DURATION_MS = 3_200;
const CLICK_BURST_WINDOW_MS = 5_000;

export type OSBuddyBubbleType =
  | "user-triggered"
  | "system"
  | "context"
  | "success"
  | "error"
  | "game";

export type { OSBuddyMiniGame };

interface OSBuddyRuntimeState {
  mood: OSBuddyMood;
  previousMood: OSBuddyMood | null;

  bubble: {
    message: string;
    type: OSBuddyBubbleType;
    kind?: OSBuddyCompanionKind;
    cta?: OSBuddyCompanionCta | null;
    createdAt: number;
  } | null;

  isMenuOpen: boolean;
  isDragging: boolean;
  dragDirection: "left" | "right" | null;
  isWalkModeActive: boolean;
  isReturningHome: boolean;

  isPetPickerOpen: boolean;
  isMiniGameOpen: boolean;
  activeMiniGame: OSBuddyMiniGame | null;

  lastUnsolicitedBubbleAt: number | null;
  clickBurstCount: number;
  clickBurstStartedAt: number | null;

  setMood: (mood: OSBuddyMood) => void;
  temporarilySetMood: (mood: OSBuddyMood, durationMs?: number) => void;

  showBubble: (
    message: string,
    type?: OSBuddyBubbleType,
    options?: {
      durationMs?: number;
      force?: boolean;
      unsolicited?: boolean;
      kind?: OSBuddyCompanionKind;
      cta?: OSBuddyCompanionCta | null;
    },
  ) => void;

  clearBubble: () => void;

  setMenuOpen: (open: boolean) => void;
  setDragging: (dragging: boolean, direction?: "left" | "right" | null) => void;
  setWalkModeActive: (active: boolean) => void;
  setReturningHome: (returning: boolean) => void;

  setPetPickerOpen: (open: boolean) => void;

  openMiniGame: (game: OSBuddyMiniGame) => void;
  closeMiniGame: () => void;

  registerClickBurst: () => number;
  resetClickBurst: () => void;
}

let moodResetTimer: ReturnType<typeof setTimeout> | null = null;
let bubbleClearTimer: ReturnType<typeof setTimeout> | null = null;

export const useOSBuddyStore = create<OSBuddyRuntimeState>((set, get) => ({
  mood: "idle",
  previousMood: null,

  bubble: null,

  isMenuOpen: false,
  isDragging: false,
  dragDirection: null,
  isWalkModeActive: false,
  isReturningHome: false,

  isPetPickerOpen: false,
  isMiniGameOpen: false,
  activeMiniGame: null,

  lastUnsolicitedBubbleAt: null,
  clickBurstCount: 0,
  clickBurstStartedAt: null,

  setMood: (mood) => {
    set((state) => ({
      previousMood: state.mood,
      mood,
    }));
  },

  temporarilySetMood: (mood, durationMs = 1_600) => {
    const previousMood = get().mood;

    if (moodResetTimer) {
      clearTimeout(moodResetTimer);
      moodResetTimer = null;
    }

    set((state) => ({ previousMood: state.mood, mood }));

    moodResetTimer = setTimeout(() => {
      set((state) => {
        if (state.mood !== mood) return state;
        return {
          previousMood: state.mood,
          mood: previousMood,
        };
      });
    }, durationMs);
  },

  showBubble: (message, type = "system", options) => {
    const now = Date.now();
    const durationMs = options?.durationMs ?? DEFAULT_BUBBLE_DURATION_MS;
    const force = options?.force ?? false;
    const unsolicited = options?.unsolicited ?? false;
    const lastUnsolicitedBubbleAt = get().lastUnsolicitedBubbleAt;

    if (
      unsolicited &&
      !force &&
      lastUnsolicitedBubbleAt != null &&
      now - lastUnsolicitedBubbleAt < UNSOLICITED_BUBBLE_COOLDOWN_MS
    ) {
      return;
    }

    if (bubbleClearTimer) {
      clearTimeout(bubbleClearTimer);
      bubbleClearTimer = null;
    }

    set((state) => ({
      bubble: {
        message,
        type,
        kind: options?.kind,
        cta: options?.cta ?? null,
        createdAt: now,
      },
      lastUnsolicitedBubbleAt: unsolicited ? now : state.lastUnsolicitedBubbleAt,
    }));

    bubbleClearTimer = setTimeout(() => {
      set((state) => {
        if (state.bubble?.createdAt !== now) return state;
        return { bubble: null };
      });
    }, durationMs);
  },

  clearBubble: () => {
    if (bubbleClearTimer) {
      clearTimeout(bubbleClearTimer);
      bubbleClearTimer = null;
    }
    set({ bubble: null });
  },

  setMenuOpen: (open) => set({ isMenuOpen: open }),

  setWalkModeActive: (active) => set({ isWalkModeActive: active }),

  setReturningHome: (returning) => set({ isReturningHome: returning }),

  setDragging: (dragging, direction = null) => {
    set((state) => {
      const nextMood: OSBuddyMood = dragging
        ? direction === "left"
          ? "dragging-left"
          : direction === "right"
            ? "dragging-right"
            : state.mood
        : state.mood === "dragging-left" || state.mood === "dragging-right"
          ? "idle"
          : state.mood;

      return {
        isDragging: dragging,
        dragDirection: dragging ? direction : null,
        previousMood: state.mood,
        mood: nextMood,
      };
    });
  },

  setPetPickerOpen: (open) => set({ isPetPickerOpen: open }),

  openMiniGame: (game) =>
    set({
      isMiniGameOpen: true,
      activeMiniGame: game,
    }),

  closeMiniGame: () =>
    set({
      isMiniGameOpen: false,
      activeMiniGame: null,
    }),

  registerClickBurst: () => {
    const now = Date.now();
    const { clickBurstStartedAt, clickBurstCount } = get();

    const burstExpired =
      clickBurstStartedAt == null || now - clickBurstStartedAt > CLICK_BURST_WINDOW_MS;

    const nextCount = burstExpired ? 1 : clickBurstCount + 1;

    set({
      clickBurstStartedAt: burstExpired ? now : clickBurstStartedAt,
      clickBurstCount: nextCount,
    });

    return nextCount;
  },

  resetClickBurst: () => {
    set({
      clickBurstStartedAt: null,
      clickBurstCount: 0,
    });
  },
}));
