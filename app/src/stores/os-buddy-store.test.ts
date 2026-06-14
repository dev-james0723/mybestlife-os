import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOSBuddyStore } from "./os-buddy-store";

function resetAirPilotStoreState() {
  useOSBuddyStore.setState({
    osBuddyEnabledOverride: null,
    isAirControlActive: false,
    airControlStatus: "idle",
    airControlGesture: null,
    airControlTarget: null,
    airControlRawPoint: null,
    airPilotSelectState: "tracking",
    airControlLandmarks: [],
    airControlLastSeenAt: null,
    airTouchState: "inactive",
    airControlError: null,
    airPilotPlusMode: "off",
    airPilotPlusCountdown: {
      kind: "inactive",
      startedAt: null,
      durationMs: 0,
      progress: 0,
      label: null,
    },
    airPilotPlusDomain: null,
    airPilotPlusActionPreview: null,
    airPilotPlusActionPreviewLabel: null,
  });
}

describe("OS Buddy AirPilot lifecycle state", () => {
  beforeEach(() => {
    resetAirPilotStoreState();
  });

  it("starts AirPilot from a clean requesting-permission state", () => {
    useOSBuddyStore.setState({
      airControlGesture: "Pinch",
      airControlTarget: { x: 120, y: 240 },
      airControlRawPoint: { x: 122, y: 242 },
      airPilotSelectState: "cooldown",
      airControlLandmarks: [{ x: 0.2, y: 0.3, z: 0 }],
      airControlLastSeenAt: 123,
      airTouchState: "grabbed",
      airControlError: "stale camera error",
      airPilotPlusMode: "plusActive",
      airPilotPlusCountdown: {
        kind: "plusActivation",
        startedAt: 100,
        durationMs: 2_000,
        progress: 0.6,
        label: "AI Pilot Plus activating...",
      },
      airPilotPlusDomain: "brain",
      airPilotPlusActionPreview: { type: "CAPTURE_KNOWLEDGE" },
      airPilotPlusActionPreviewLabel: "brain: capture knowledge",
    });

    useOSBuddyStore.getState().startAirControl();

    const state = useOSBuddyStore.getState();
    expect(state.isAirControlActive).toBe(true);
    expect(state.airControlStatus).toBe("requesting-permission");
    expect(state.airControlGesture).toBeNull();
    expect(state.airControlTarget).toBeNull();
    expect(state.airControlRawPoint).toBeNull();
    expect(state.airPilotSelectState).toBe("tracking");
    expect(state.airControlLandmarks).toEqual([]);
    expect(state.airControlLastSeenAt).toBeNull();
    expect(state.airTouchState).toBe("tracking");
    expect(state.airControlError).toBeNull();
    expect(state.airPilotPlusMode).toBe("normal");
    expect(state.airPilotPlusCountdown.kind).toBe("inactive");
    expect(state.airPilotPlusDomain).toBeNull();
    expect(state.airPilotPlusActionPreview).toBeNull();
  });

  it("stops AirPilot and clears tracking state for closed-fist exits", () => {
    useOSBuddyStore.setState({
      isAirControlActive: true,
      airControlStatus: "tracking",
      airControlGesture: "Closed_Fist",
      airControlTarget: { x: 80, y: 160 },
      airControlRawPoint: { x: 82, y: 162 },
      airPilotSelectState: "locked",
      airControlLandmarks: [{ x: 0.1, y: 0.2, z: 0.3 }],
      airControlLastSeenAt: 456,
      airTouchState: "tracking",
      airPilotPlusMode: "plusActive",
      airPilotPlusCountdown: {
        kind: "plusExit",
        startedAt: 500,
        durationMs: 1_500,
        progress: 0.3,
        label: "AI Pilot Plus exiting...",
      },
      airPilotPlusDomain: "projects",
      airPilotPlusActionPreview: { type: "ADD_GOAL" },
      airPilotPlusActionPreviewLabel: "projects: add goal",
    });

    useOSBuddyStore.getState().stopAirControl("closed-fist");

    const state = useOSBuddyStore.getState();
    expect(state.isAirControlActive).toBe(false);
    expect(state.airControlStatus).toBe("idle");
    expect(state.airControlGesture).toBeNull();
    expect(state.airControlTarget).toBeNull();
    expect(state.airControlRawPoint).toBeNull();
    expect(state.airPilotSelectState).toBe("tracking");
    expect(state.airControlLandmarks).toEqual([]);
    expect(state.airControlLastSeenAt).toBeNull();
    expect(state.airTouchState).toBe("inactive");
    expect(state.airPilotPlusMode).toBe("off");
    expect(state.airPilotPlusCountdown.kind).toBe("inactive");
    expect(state.airPilotPlusDomain).toBeNull();
    expect(state.airPilotPlusActionPreview).toBeNull();
  });

  it("updates and resets AI Pilot Plus state independently", () => {
    useOSBuddyStore.getState().setAirPilotPlusState("plusCountdown", {
      kind: "plusActivation",
      startedAt: 1_000,
      durationMs: 2_000,
      progress: 0.5,
      label: "AI Pilot Plus activating...",
    });

    expect(useOSBuddyStore.getState().airPilotPlusMode).toBe("plusCountdown");
    expect(useOSBuddyStore.getState().airPilotPlusCountdown.progress).toBe(0.5);

    useOSBuddyStore.getState().setAirPilotPlusDomainPreview({
      domain: "brain",
      actionPreview: { type: "CAPTURE_KNOWLEDGE" },
      previewLabel: "brain: capture knowledge",
    });

    expect(useOSBuddyStore.getState().airPilotPlusDomain).toBe("brain");
    expect(useOSBuddyStore.getState().airPilotPlusActionPreviewLabel).toContain("brain");

    useOSBuddyStore.getState().resetAirPilotPlus();

    expect(useOSBuddyStore.getState().airPilotPlusMode).toBe("off");
    expect(useOSBuddyStore.getState().airPilotPlusCountdown.kind).toBe("inactive");
    expect(useOSBuddyStore.getState().airPilotPlusDomain).toBeNull();
  });

  it("stores an immediate OS Buddy enabled override for global toggles", () => {
    useOSBuddyStore.getState().setOSBuddyEnabledOverride(false);
    expect(useOSBuddyStore.getState().osBuddyEnabledOverride).toBe(false);

    useOSBuddyStore.getState().setOSBuddyEnabledOverride(true);
    expect(useOSBuddyStore.getState().osBuddyEnabledOverride).toBe(true);

    useOSBuddyStore.getState().setOSBuddyEnabledOverride(null);
    expect(useOSBuddyStore.getState().osBuddyEnabledOverride).toBeNull();
  });
});

describe("OS Buddy resting space lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T00:00:00.000Z"));
    useOSBuddyStore.setState({
      bubble: null,
      isRestingInSidebar: false,
      restingState: "resting",
      mood: "playful",
      isMenuOpen: false,
      isDragging: false,
      dragDirection: null,
      isWalkModeActive: false,
      isReturningHome: false,
      isFreeRoaming: false,
      isMiniGameOpen: false,
      activeMiniGame: null,
    });
  });

  afterEach(() => {
    useOSBuddyStore.setState({
      bubble: null,
      isRestingInSidebar: false,
      restingState: "resting",
      isAirControlActive: false,
      airControlStatus: "idle",
      airControlGesture: null,
      airControlTarget: null,
      airControlRawPoint: null,
      airPilotSelectState: "tracking",
      airControlLandmarks: [],
      airControlLastSeenAt: null,
      airTouchState: "inactive",
      airPilotPlusMode: "off",
      airPilotPlusCountdown: {
        kind: "inactive",
        startedAt: null,
        durationMs: 0,
        progress: 0,
        label: null,
      },
      airPilotPlusDomain: null,
      airPilotPlusActionPreview: null,
      airPilotPlusActionPreviewLabel: null,
      isMenuOpen: false,
      isDragging: false,
      dragDirection: null,
      isWalkModeActive: false,
      isReturningHome: false,
      isFreeRoaming: false,
      isMiniGameOpen: false,
      activeMiniGame: null,
      mood: "idle",
    });
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("parks OS Buddy in resting space without leaving runtime modes alive", () => {
    useOSBuddyStore.getState().showBubble("Busy.");
    useOSBuddyStore.setState({
      isMenuOpen: true,
      isDragging: true,
      dragDirection: "right",
      isWalkModeActive: true,
      isReturningHome: true,
      isFreeRoaming: true,
      freeRoamStartedAt: 1,
      freeRoamUntil: 2,
      freeRoamRuntimePosition: { x: 12, y: 24 },
      isMiniGameOpen: true,
      activeMiniGame: "play-ball",
      isAirControlActive: true,
      airControlStatus: "tracking",
      airControlGesture: "Pinch",
      airControlTarget: { x: 120, y: 240 },
      airControlRawPoint: { x: 122, y: 242 },
      airPilotSelectState: "locked",
      airControlLandmarks: [{ x: 0.1, y: 0.2, z: 0 }],
      airControlLastSeenAt: 456,
      airTouchState: "grabbed",
      airPilotPlusMode: "plusActive",
      airPilotPlusCountdown: {
        kind: "plusExit",
        startedAt: 500,
        durationMs: 1_500,
        progress: 0.3,
        label: "AI Pilot Plus exiting...",
      },
      airPilotPlusDomain: "projects",
      airPilotPlusActionPreview: { type: "ADD_GOAL" },
      airPilotPlusActionPreviewLabel: "projects: add goal",
    });

    useOSBuddyStore.getState().dockInRestingSpace("resting");

    const state = useOSBuddyStore.getState();
    expect(state.isRestingInSidebar).toBe(true);
    expect(state.restingState).toBe("resting");
    expect(state.bubble).toBeNull();
    expect(state.isMenuOpen).toBe(false);
    expect(state.isDragging).toBe(false);
    expect(state.dragDirection).toBeNull();
    expect(state.isWalkModeActive).toBe(false);
    expect(state.isReturningHome).toBe(false);
    expect(state.isFreeRoaming).toBe(false);
    expect(state.freeRoamRuntimePosition).toBeNull();
    expect(state.isMiniGameOpen).toBe(false);
    expect(state.activeMiniGame).toBeNull();
    expect(state.isAirControlActive).toBe(false);
    expect(state.airControlStatus).toBe("idle");
    expect(state.airControlGesture).toBeNull();
    expect(state.airControlTarget).toBeNull();
    expect(state.airControlRawPoint).toBeNull();
    expect(state.airPilotSelectState).toBe("tracking");
    expect(state.airControlLandmarks).toEqual([]);
    expect(state.airControlLastSeenAt).toBeNull();
    expect(state.airTouchState).toBe("inactive");
    expect(state.airPilotPlusMode).toBe("off");
    expect(state.airPilotPlusCountdown.kind).toBe("inactive");
    expect(state.airPilotPlusDomain).toBeNull();
    expect(state.airPilotPlusActionPreview).toBeNull();

    vi.advanceTimersByTime(6_000);
    expect(useOSBuddyStore.getState().bubble).toBeNull();
  });

  it("releases OS Buddy from resting space for shortcut wakeups", () => {
    useOSBuddyStore.getState().dockInRestingSpace("sleeping");
    useOSBuddyStore.getState().releaseFromRestingSpace();

    const state = useOSBuddyStore.getState();
    expect(state.isRestingInSidebar).toBe(false);
    expect(state.restingState).toBe("resting");
    expect(state.mood).toBe("idle");
  });
});

describe("OS Buddy bubble lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T00:00:00.000Z"));
    useOSBuddyStore.setState({
      bubble: null,
      lastUnsolicitedBubbleAt: null,
    });
  });

  afterEach(() => {
    useOSBuddyStore.setState({
      bubble: null,
      lastUnsolicitedBubbleAt: null,
    });
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps default bubbles visible for five seconds before vanishing", () => {
    useOSBuddyStore.getState().showBubble("Still here.");

    vi.advanceTimersByTime(4_999);
    expect(useOSBuddyStore.getState().bubble).toMatchObject({
      message: "Still here.",
      isDismissing: false,
    });

    vi.advanceTimersByTime(1);
    expect(useOSBuddyStore.getState().bubble).toMatchObject({
      message: "Still here.",
      isDismissing: true,
    });

    vi.advanceTimersByTime(559);
    expect(useOSBuddyStore.getState().bubble?.isDismissing).toBe(true);

    vi.advanceTimersByTime(1);
    expect(useOSBuddyStore.getState().bubble).toBeNull();
  });

  it("uses the same vanish state when bubbles are manually dismissed", () => {
    useOSBuddyStore.getState().showBubble("Dismiss me.", "system", {
      durationMs: 10_000,
    });

    useOSBuddyStore.getState().clearBubble();

    expect(useOSBuddyStore.getState().bubble).toMatchObject({
      message: "Dismiss me.",
      isDismissing: true,
    });

    vi.advanceTimersByTime(560);
    expect(useOSBuddyStore.getState().bubble).toBeNull();
  });
});
