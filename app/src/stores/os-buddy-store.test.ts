import { beforeEach, describe, expect, it } from "vitest";
import { useOSBuddyStore } from "./os-buddy-store";

function resetAirPilotStoreState() {
  useOSBuddyStore.setState({
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
  });
});
