import { beforeEach, describe, expect, it } from "vitest";
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
