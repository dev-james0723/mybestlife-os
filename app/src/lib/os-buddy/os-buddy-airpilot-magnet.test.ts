import { describe, expect, it } from "vitest";
import type {
  OSBuddyAirControlHand,
  OSBuddyAirControlLandmark,
} from "./os-buddy-air-control-types";
import {
  AIRPILOT_INDEX_TAP_ARM_MS,
  AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD,
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

function makeHand(params: {
  indexOffset?: Partial<OSBuddyAirControlLandmark>;
  wholeHandOffset?: Partial<OSBuddyAirControlLandmark>;
  thumbOffset?: Partial<OSBuddyAirControlLandmark>;
} = {}): OSBuddyAirControlHand {
  const whole = {
    x: params.wholeHandOffset?.x ?? 0,
    y: params.wholeHandOffset?.y ?? 0,
    z: params.wholeHandOffset?.z ?? 0,
  };
  const index = {
    x: params.indexOffset?.x ?? 0,
    y: params.indexOffset?.y ?? 0,
    z: params.indexOffset?.z ?? 0,
  };
  const thumb = {
    x: params.thumbOffset?.x ?? 0,
    y: params.thumbOffset?.y ?? 0,
    z: params.thumbOffset?.z ?? 0,
  };
  const landmarks: OSBuddyAirControlLandmark[] = new Array(21)
    .fill(null)
    .map(() => ({ x: whole.x, y: whole.y, z: whole.z }));

  landmarks[0] = { x: whole.x, y: whole.y, z: whole.z };
  landmarks[4] = {
    x: whole.x + 0.05 + thumb.x,
    y: whole.y - 0.45 + thumb.y,
    z: whole.z + thumb.z,
  };
  landmarks[5] = { x: whole.x + 0.2, y: whole.y, z: whole.z };
  landmarks[6] = {
    x: whole.x + 0.2 + index.x,
    y: whole.y - 0.3 + index.y,
    z: whole.z + index.z,
  };
  landmarks[7] = {
    x: whole.x + 0.2 + index.x,
    y: whole.y - 0.5 + index.y,
    z: whole.z + index.z,
  };
  landmarks[8] = {
    x: whole.x + 0.2 + index.x,
    y: whole.y - 0.7 + index.y,
    z: whole.z + index.z,
  };
  landmarks[9] = { x: whole.x + 0.4, y: whole.y, z: whole.z };
  landmarks[13] = { x: whole.x + 0.6, y: whole.y, z: whole.z };
  landmarks[17] = { x: whole.x + 0.8, y: whole.y, z: whole.z };

  return {
    landmarks,
    handedness: "Right",
    confidence: 0.95,
    gestureName: null,
    gestureScore: 0,
  };
}

function update(params: {
  previous?: ReturnType<typeof createAirPilotMagnetMachine>;
  now: number;
  rawCursor?: { x: number; y: number } | null;
  rawPalmCursor?: { x: number; y: number } | null;
  target?: AirPilotMagnetTarget | null;
  hand?: OSBuddyAirControlHand | null;
}) {
  return updateAirPilotMagnetMachine({
    previous: params.previous ?? createAirPilotMagnetMachine(),
    now: params.now,
    rawCursor: params.rawCursor ?? { x: 116, y: 118 },
    rawPalmCursor: params.rawPalmCursor ?? { x: 104, y: 152 },
    target: params.target ?? buttonA,
    hand: params.hand ?? makeHand(),
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
    expect(locked.selectState).toBe("locked");
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

  it("does not select while locked without an index tap", () => {
    const locked = lockButtonA();
    const idle = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
    });

    expect(idle.state.phase).toBe("locked");
    expect(idle.selectState).toBe("armed");
    expect(idle.selectedPoint).toBeNull();
  });

  it("selects the locked target center when the index finger taps", () => {
    const locked = lockButtonA();
    const selected = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      hand: makeHand({ indexOffset: { y: 0.18 } }),
    });

    expect(selected.selectedPoint).toEqual(buttonA.center);
    expect(selected.selectState).toBe("tapping");
    expect(selected.indexTapScore).toBeGreaterThan(AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD);
  });

  it("selects from a subtle index joint flick while locked", () => {
    const locked = lockButtonA();
    const selected = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      hand: makeHand({ indexOffset: { y: 0.04 } }),
    });

    expect(selected.selectedPoint).toEqual(buttonA.center);
    expect(selected.selectState).toBe("tapping");
    expect(selected.indexTapScore).toBeGreaterThan(AIRPILOT_INDEX_TAP_TRIGGER_THRESHOLD);
  });

  it("selects from raw index movement relative to a steady palm while locked", () => {
    const locked = lockButtonA();
    const selected = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      rawCursor: { x: 124, y: 118 },
      rawPalmCursor: { x: 104, y: 152 },
      hand: makeHand(),
    });

    expect(selected.selectedPoint).toEqual(buttonA.center);
    expect(selected.selectState).toBe("tapping");
  });

  it("does not select for whole-hand drift inside the locked range", () => {
    const locked = lockButtonA();
    const drifted = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      rawCursor: { x: 136, y: 138 },
      rawPalmCursor: { x: 124, y: 172 },
      hand: makeHand({ wholeHandOffset: { x: 0.2, y: 0.2, z: 0.05 } }),
    });

    expect(drifted.selectedPoint).toBeNull();
    expect(drifted.indexTapScore).toBeLessThan(0.01);
  });

  it("does not select for thumb-only pinch movement", () => {
    const locked = lockButtonA();
    const thumbMoved = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      hand: makeHand({ thumbOffset: { x: 0.2, y: 0.25 } }),
    });

    expect(thumbMoved.selectedPoint).toBeNull();
    expect(thumbMoved.selectState).toBe("armed");
  });

  it("blocks repeated selections during cooldown", () => {
    const locked = lockButtonA();
    const selected = update({
      previous: locked.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 1,
      rawCursor: { x: 124, y: 118 },
      hand: makeHand(),
    });
    const repeated = update({
      previous: selected.state,
      now: 1_000 + AIRPILOT_MAGNET_DWELL_MS + AIRPILOT_INDEX_TAP_ARM_MS + 50,
      rawCursor: { x: 130, y: 118 },
      hand: makeHand(),
    });

    expect(selected.selectedPoint).toEqual(buttonA.center);
    expect(repeated.selectedPoint).toBeNull();
    expect(repeated.selectState).toBe("cooldown");
  });
});
