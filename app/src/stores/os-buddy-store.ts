import { create } from "zustand";
import type {
  OSBuddyAirControlGesture,
  OSBuddyAirControlPoint,
  OSBuddyAirControlQuality,
  OSBuddyAirControlSensorMode,
  OSBuddyAirControlStatus,
  OSBuddyAirControlStopReason,
  OSBuddyAirTouchState,
} from "@/lib/os-buddy/os-buddy-air-control-types";
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
  | "game"
  | "birthday";

export type { OSBuddyMiniGame };

export type OSBuddyRoamInterruptReason =
  | "user-click"
  | "user-drag"
  | "keyboard"
  | "scroll"
  | "route-change"
  | "focus-start"
  | "smart-action"
  | "menu-open"
  | "mini-game-open"
  | "visibility-hidden"
  | "reduced-motion"
  | "session-ended";

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
  isAirControlActive: boolean;
  airControlStatus: OSBuddyAirControlStatus;
  airControlGesture: OSBuddyAirControlGesture | null;
  airControlTarget: OSBuddyAirControlPoint | null;
  airControlLastSeenAt: number | null;
  airTouchState: OSBuddyAirTouchState;
  airControlSensorMode: OSBuddyAirControlSensorMode;
  airControlQuality: OSBuddyAirControlQuality;
  airControlCalibrationSummary: {
    quality: OSBuddyAirControlQuality;
    rmsErrorPx: number | null;
    createdAt: number | null;
  } | null;
  airControlDebugEnabled: boolean;
  airControlError: string | null;
  isFreeRoaming: boolean;
  freeRoamStartedAt: number | null;
  freeRoamUntil: number | null;
  freeRoamLastEndedAt: number | null;
  freeRoamSessionTimestamps: number[];
  freeRoamRuntimePosition: {
    x: number;
    y: number;
  } | null;

  isPetPickerOpen: boolean;
  isMiniGameOpen: boolean;
  activeMiniGame: OSBuddyMiniGame | null;
  focusSession: {
    startedAt: number;
    durationMinutes: number | null;
  } | null;
  isBirthdayMode: boolean;
  birthdayModeUntil: number | null;
  birthdayQuietUntil: number | null;

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
  startAirControl: () => void;
  stopAirControl: (reason?: OSBuddyAirControlStopReason) => void;
  setAirControlTarget: (point: OSBuddyAirControlPoint | null) => void;
  setAirControlGesture: (gesture: OSBuddyAirControlGesture | null) => void;
  setAirControlStatus: (status: OSBuddyAirControlStatus) => void;
  markAirControlHandSeen: (seenAt?: number) => void;
  setAirTouchState: (state: OSBuddyAirTouchState) => void;
  setAirControlSensorMode: (mode: OSBuddyAirControlSensorMode) => void;
  setAirControlQuality: (quality: OSBuddyAirControlQuality) => void;
  setAirControlCalibration: (
    summary: {
      quality: OSBuddyAirControlQuality;
      rmsErrorPx: number | null;
      createdAt: number | null;
    } | null,
  ) => void;
  setAirControlDebugEnabled: (enabled: boolean) => void;
  setAirControlError: (error: string | null) => void;
  startFreeRoam: (params: {
    until: number;
    initialPosition?: { x: number; y: number } | null;
  }) => void;
  updateFreeRoamPosition: (position: { x: number; y: number }) => void;
  stopFreeRoam: (reason?: OSBuddyRoamInterruptReason) => void;

  setPetPickerOpen: (open: boolean) => void;

  openMiniGame: (game: OSBuddyMiniGame) => void;
  closeMiniGame: () => void;
  setFocusSession: (session: { durationMinutes?: number | null } | null) => void;
  setBirthdayMode: (active: boolean, durationMs?: number) => void;

  registerClickBurst: () => number;
  resetClickBurst: () => void;
}

let moodResetTimer: ReturnType<typeof setTimeout> | null = null;
let bubbleClearTimer: ReturnType<typeof setTimeout> | null = null;
let birthdayModeTimer: ReturnType<typeof setTimeout> | null = null;

export const useOSBuddyStore = create<OSBuddyRuntimeState>((set, get) => ({
  mood: "idle",
  previousMood: null,

  bubble: null,

  isMenuOpen: false,
  isDragging: false,
  dragDirection: null,
  isWalkModeActive: false,
  isReturningHome: false,
  isAirControlActive: false,
  airControlStatus: "idle",
  airControlGesture: null,
  airControlTarget: null,
  airControlLastSeenAt: null,
  airTouchState: "inactive",
  airControlSensorMode: "fallback-2d",
  airControlQuality: "uncalibrated",
  airControlCalibrationSummary: null,
  airControlDebugEnabled: false,
  airControlError: null,
  isFreeRoaming: false,
  freeRoamStartedAt: null,
  freeRoamUntil: null,
  freeRoamLastEndedAt: null,
  freeRoamSessionTimestamps: [],
  freeRoamRuntimePosition: null,

  isPetPickerOpen: false,
  isMiniGameOpen: false,
  activeMiniGame: null,
  focusSession: null,
  isBirthdayMode: false,
  birthdayModeUntil: null,
  birthdayQuietUntil: null,

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

  startAirControl: () =>
    set({
      isAirControlActive: true,
      airControlStatus: "requesting-permission",
      airControlGesture: null,
      airControlTarget: null,
      airControlLastSeenAt: null,
      airTouchState: "tracking",
      airControlError: null,
    }),

  stopAirControl: () =>
    set({
      isAirControlActive: false,
      airControlStatus: "idle",
      airControlGesture: null,
      airControlTarget: null,
      airControlLastSeenAt: null,
      airTouchState: "inactive",
    }),

  setAirControlTarget: (point) =>
    set({
      airControlTarget: point ? { x: point.x, y: point.y } : null,
      airControlLastSeenAt: point ? Date.now() : get().airControlLastSeenAt,
    }),

  setAirControlGesture: (gesture) => set({ airControlGesture: gesture }),

  setAirControlStatus: (status) => set({ airControlStatus: status }),

  markAirControlHandSeen: (seenAt = Date.now()) =>
    set({
      airControlLastSeenAt: seenAt,
    }),

  setAirTouchState: (state) => set({ airTouchState: state }),

  setAirControlSensorMode: (mode) => set({ airControlSensorMode: mode }),

  setAirControlQuality: (quality) => set({ airControlQuality: quality }),

  setAirControlCalibration: (summary) =>
    set({
      airControlCalibrationSummary: summary,
      airControlQuality: summary?.quality ?? "uncalibrated",
    }),

  setAirControlDebugEnabled: (enabled) => set({ airControlDebugEnabled: enabled }),

  setAirControlError: (error) => set({ airControlError: error }),

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

  startFreeRoam: ({ until, initialPosition }) => {
    const now = Date.now();
    set((state) => ({
      isFreeRoaming: true,
      freeRoamStartedAt: now,
      freeRoamUntil: until,
      freeRoamRuntimePosition: initialPosition ?? state.freeRoamRuntimePosition,
      freeRoamSessionTimestamps: [...state.freeRoamSessionTimestamps, now].filter(
        (timestamp) => now - timestamp < 60 * 60_000,
      ),
      previousMood: state.mood,
      mood: state.mood === "sleepy" || state.mood === "idle" ? "playful" : state.mood,
    }));
  },

  updateFreeRoamPosition: (position) => {
    set((state) => {
      if (!state.isFreeRoaming && !state.freeRoamRuntimePosition) return state;
      return {
        freeRoamRuntimePosition: {
          x: position.x,
          y: position.y,
        },
      };
    });
  },

  stopFreeRoam: () => {
    const now = Date.now();
    set((state) => ({
      isFreeRoaming: false,
      freeRoamStartedAt: null,
      freeRoamUntil: null,
      freeRoamLastEndedAt: state.isFreeRoaming ? now : state.freeRoamLastEndedAt,
      freeRoamRuntimePosition: null,
      previousMood: state.mood,
      mood: state.mood === "playful" ? "idle" : state.mood,
    }));
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

  setFocusSession: (session) =>
    set({
      focusSession: session
        ? {
            startedAt: Date.now(),
            durationMinutes: session.durationMinutes ?? null,
          }
        : null,
    }),

  setBirthdayMode: (active, durationMs = 12_000) => {
    if (birthdayModeTimer) {
      clearTimeout(birthdayModeTimer);
      birthdayModeTimer = null;
    }

    if (!active) {
      set({ isBirthdayMode: false, birthdayModeUntil: null });
      return;
    }

    const now = Date.now();
    const birthdayModeUntil = now + durationMs;
    set({
      isBirthdayMode: true,
      birthdayModeUntil,
      birthdayQuietUntil: now + 30_000,
    });

    birthdayModeTimer = setTimeout(() => {
      set((state) => {
        if (state.birthdayModeUntil !== birthdayModeUntil) return state;
        return { isBirthdayMode: false, birthdayModeUntil: null };
      });
    }, durationMs);
  },

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
