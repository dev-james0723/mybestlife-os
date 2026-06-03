import { describe, expect, it } from "vitest";
import {
  AIRPILOT_WAKE_GUARD_MS,
  OS_BUDDY_HAND_CONNECTIONS,
  OS_BUDDY_HAND_LANDMARK_COUNT,
  createAirPilotPinchMachine,
  updateAirPilotPinchMachine,
} from "./os-buddy-airpilot-pinch";

describe("AirPilot pinch state machine", () => {
  it("requires thumb/index preparation before selection", () => {
    const first = updateAirPilotPinchMachine({
      previous: createAirPilotPinchMachine(),
      now: 1_000,
      cursor: { x: 120, y: 220 },
      thumbIndexRatio: 0.2,
    });

    expect(first.state.phase).toBe("tracking");
    expect(first.selectedPoint).toBeNull();
  });

  it("moves from prepared to pinching and selects the latched pre-pinch point", () => {
    const start = createAirPilotPinchMachine();
    const opening = updateAirPilotPinchMachine({
      previous: start,
      now: 1_000,
      cursor: { x: 10, y: 20 },
      thumbIndexRatio: 0.7,
    });
    const prepared = updateAirPilotPinchMachine({
      previous: opening.state,
      now: 1_130,
      cursor: { x: 11, y: 21 },
      thumbIndexRatio: 0.7,
    });
    const pinching = updateAirPilotPinchMachine({
      previous: prepared.state,
      now: 1_150,
      cursor: { x: 50, y: 80 },
      thumbIndexRatio: 0.2,
    });
    const selected = updateAirPilotPinchMachine({
      previous: pinching.state,
      now: 1_270,
      cursor: { x: 70, y: 100 },
      thumbIndexRatio: 0.2,
    });

    expect(prepared.state.phase).toBe("prepared");
    expect(pinching.state.phase).toBe("pinching");
    expect(selected.selectedPoint).toEqual({ x: 11, y: 21 });
    expect(selected.state.phase).toBe("cooldown");
  });

  it("blocks repeated clicks during cooldown and requires opening again", () => {
    const prepared = updateAirPilotPinchMachine({
      previous: {
        ...createAirPilotPinchMachine(),
        phase: "prepared",
        armedPoint: { x: 20, y: 20 },
      },
      now: 1_000,
      cursor: { x: 30, y: 30 },
      thumbIndexRatio: 0.2,
    });
    const selected = updateAirPilotPinchMachine({
      previous: prepared.state,
      now: 1_120,
      cursor: { x: 30, y: 30 },
      thumbIndexRatio: 0.2,
    });
    const cooldown = updateAirPilotPinchMachine({
      previous: selected.state,
      now: 1_300,
      cursor: { x: 30, y: 30 },
      thumbIndexRatio: 0.2,
    });
    const afterCooldownStillPinched = updateAirPilotPinchMachine({
      previous: cooldown.state,
      now: 1_800,
      cursor: { x: 30, y: 30 },
      thumbIndexRatio: 0.2,
    });

    expect(selected.selectedPoint).toEqual({ x: 20, y: 20 });
    expect(cooldown.selectedPoint).toBeNull();
    expect(afterCooldownStillPinched.selectedPoint).toBeNull();
  });

  it("honors the AirPilot wake guard before arming selection", () => {
    const wakeGuardUntil = 1_000 + AIRPILOT_WAKE_GUARD_MS;
    const opening = updateAirPilotPinchMachine({
      previous: createAirPilotPinchMachine(),
      now: 1_000,
      cursor: { x: 10, y: 10 },
      thumbIndexRatio: 0.7,
      wakeGuardUntil,
    });
    const blocked = updateAirPilotPinchMachine({
      previous: opening.state,
      now: 1_700,
      cursor: { x: 10, y: 10 },
      thumbIndexRatio: 0.7,
      wakeGuardUntil,
    });
    const armed = updateAirPilotPinchMachine({
      previous: blocked.state,
      now: 1_810,
      cursor: { x: 10, y: 10 },
      thumbIndexRatio: 0.7,
      wakeGuardUntil,
    });

    expect(blocked.state.phase).toBe("tracking");
    expect(armed.state.phase).toBe("prepared");
  });

  it("defines the full 21-landmark hand skeleton topology", () => {
    const touched = new Set<number>();
    for (const [from, to] of OS_BUDDY_HAND_CONNECTIONS) {
      touched.add(from);
      touched.add(to);
    }

    expect(touched.size).toBe(OS_BUDDY_HAND_LANDMARK_COUNT);
    expect(OS_BUDDY_HAND_CONNECTIONS).toContainEqual([5, 6]);
    expect(OS_BUDDY_HAND_CONNECTIONS).toContainEqual([7, 8]);
    expect(OS_BUDDY_HAND_CONNECTIONS).toContainEqual([0, 17]);
  });
});
