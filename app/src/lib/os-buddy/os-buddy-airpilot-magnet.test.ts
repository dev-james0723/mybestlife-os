import { describe, expect, it } from "vitest";
import {
  AIRPILOT_MAGNET_DWELL_MS,
  AIRPILOT_MAGNET_ESCAPE_PX,
  createAirPilotMagnetMachine,
  updateAirPilotMagnetMachine,
  type AirPilotMagnetTarget,
} from "./os-buddy-airpilot-magnet";

const buttonA: AirPilotMagnetTarget = {
  key: "button-a",
  label: "Button A",
  center: { x: 120, y: 120 },
  rect: { x: 90, y: 100, width: 60, height: 40 },
};

function update(params: {
  previous?: ReturnType<typeof createAirPilotMagnetMachine>;
  now: number;
  rawCursor?: { x: number; y: number } | null;
  target?: AirPilotMagnetTarget | null;
  thumbIndexRatio?: number | null;
}) {
  return updateAirPilotMagnetMachine({
    previous: params.previous ?? createAirPilotMagnetMachine(),
    now: params.now,
    rawCursor: params.rawCursor ?? { x: 116, y: 118 },
    target: params.target ?? buttonA,
    thumbIndexRatio: params.thumbIndexRatio ?? null,
  });
}

function lockButtonA() {
  const candidate = update({ now: 1_000 });
  return update({
    previous: candidate.state,
    now: 1_000 + AIRPILOT_MAGNET_DWELL_MS,
  });
}

describe("AirPilot magnet state machine", () => {
  it("does not lock before the dwell window completes", () => {
    const candidate = update({ now: 1_000 });
    const early = update({
      previous: candidate.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS - 1,
    });

    expect(early.state.phase).toBe("candidate");
    expect(early.cursor).toEqual({ x: 116, y: 118 });
    expect(early.selectedPoint).toBeNull();
  });

  it("locks the same target after the dwell window", () => {
    const locked = lockButtonA();

    expect(locked.state.phase).toBe("locked");
    expect(locked.cursor).toEqual(buttonA.center);
    expect(locked.target?.label).toBe("Button A");
  });

  it("stays locked for small finger movement", () => {
    const locked = lockButtonA();
    const stillLocked = update({
      previous: locked.state,
      now: 1_400,
      rawCursor: { x: buttonA.center.x + 18, y: buttonA.center.y + 12 },
    });

    expect(stillLocked.state.phase).toBe("locked");
    expect(stillLocked.cursor).toEqual(buttonA.center);
  });

  it("unlocks when the finger leaves the escape range", () => {
    const locked = lockButtonA();
    const escaped = update({
      previous: locked.state,
      now: 1_400,
      rawCursor: { x: buttonA.center.x + AIRPILOT_MAGNET_ESCAPE_PX + 1, y: buttonA.center.y },
    });

    expect(escaped.state.phase).toBe("tracking");
    expect(escaped.cursor).toEqual({
      x: buttonA.center.x + AIRPILOT_MAGNET_ESCAPE_PX + 1,
      y: buttonA.center.y,
    });
  });

  it("requires open after lock before pinch selection", () => {
    const locked = lockButtonA();
    const alreadyPinched = update({
      previous: locked.state,
      now: 1_320,
      thumbIndexRatio: 0.2,
    });
    const opening = update({
      previous: alreadyPinched.state,
      now: 1_430,
      thumbIndexRatio: 0.7,
    });
    const prepared = update({
      previous: opening.state,
      now: 1_560,
      thumbIndexRatio: 0.7,
    });
    const pinching = update({
      previous: prepared.state,
      now: 1_570,
      thumbIndexRatio: 0.2,
    });
    const selected = update({
      previous: pinching.state,
      now: 1_690,
      thumbIndexRatio: 0.2,
    });

    expect(alreadyPinched.selectedPoint).toBeNull();
    expect(prepared.pinchState).toBe("prepared");
    expect(pinching.pinchState).toBe("pinching");
    expect(selected.selectedPoint).toEqual(buttonA.center);
  });

  it("blocks repeated selections during cooldown", () => {
    const locked = lockButtonA();
    const prepared = update({
      previous: locked.state,
      now: 1_500,
      thumbIndexRatio: 0.7,
    });
    const preparedHeld = update({
      previous: prepared.state,
      now: 1_630,
      thumbIndexRatio: 0.7,
    });
    const pinching = update({
      previous: preparedHeld.state,
      now: 1_640,
      thumbIndexRatio: 0.2,
    });
    const selected = update({
      previous: pinching.state,
      now: 1_760,
      thumbIndexRatio: 0.2,
    });
    const repeated = update({
      previous: selected.state,
      now: 1_810,
      thumbIndexRatio: 0.2,
    });

    expect(selected.selectedPoint).toEqual(buttonA.center);
    expect(repeated.selectedPoint).toBeNull();
    expect(repeated.pinchState).toBe("cooldown");
  });
});
