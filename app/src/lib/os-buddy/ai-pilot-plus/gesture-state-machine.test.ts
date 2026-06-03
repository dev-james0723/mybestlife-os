import { describe, expect, it } from "vitest";
import {
  createAIPilotPlusMachineState,
  stepAIPilotPlusMachine,
} from "./gesture-state-machine";
import type { AIPilotPlusFrame, AIPilotPlusTarget } from "./types";

const buttonTarget: AIPilotPlusTarget = {
  id: "button-a",
  kind: "dom",
  label: "Button A",
  center: { x: 120, y: 140 },
  rect: { x: 90, y: 120, width: 60, height: 40 },
};

function frame(overrides: Partial<AIPilotPlusFrame> = {}): AIPilotPlusFrame {
  return {
    now: 1_000,
    active: true,
    handCount: 1,
    gesture: "Index_Point",
    confidence: 0.9,
    sensorMode: "rgb-webcam",
    cursor: { x: 116, y: 138 },
    rawCursor: { x: 116, y: 138 },
    palm: { x: 96, y: 178 },
    indexPalmVector: { x: 20, y: -40 },
    primaryHand: null,
    secondaryHand: null,
    secondaryPalm: null,
    target: buttonTarget,
    lockedTarget: null,
    ...overrides,
  };
}

describe("AI Pilot Plus state machine", () => {
  it("resets while inactive", () => {
    const result = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({ active: false }),
    });

    expect(result.next.mode).toBe("inactive");
    expect(result.intents).toEqual([]);
  });

  it("emits a deterministic stop intent on Closed_Fist", () => {
    const result = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({ gesture: "Closed_Fist" }),
    });

    expect(result.next.mode).toBe("inactive");
    expect(result.intents).toEqual([
      { type: "lifecycle.stop", reason: "closed-fist", gesture: "Closed_Fist" },
    ]);
  });

  it("hovers locked targets before arming, then selects on index tap", () => {
    const initial = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({ now: 1_000, lockedTarget: buttonTarget }),
    });
    const selected = stepAIPilotPlusMachine({
      previous: initial.next,
      frame: frame({
        now: 1_120,
        lockedTarget: buttonTarget,
        indexPalmVector: { x: 20, y: -30 },
      }),
    });

    expect(initial.intents[0]?.type).toBe("target.hover");
    expect(selected.intents[0]).toMatchObject({
      type: "target.select",
      point: buttonTarget.center,
    });
    expect(selected.next.mode).toBe("cooldown");
  });

  it("prevents repeated selection during cooldown", () => {
    const initial = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({ now: 1_000, lockedTarget: buttonTarget }),
    });
    const selected = stepAIPilotPlusMachine({
      previous: initial.next,
      frame: frame({
        now: 1_120,
        lockedTarget: buttonTarget,
        indexPalmVector: { x: 20, y: -30 },
      }),
    });
    const repeated = stepAIPilotPlusMachine({
      previous: selected.next,
      frame: frame({
        now: 1_200,
        lockedTarget: buttonTarget,
        indexPalmVector: { x: 20, y: -18 },
      }),
    });

    expect(selected.intents[0]?.type).toBe("target.select");
    expect(repeated.intents[0]?.type).toBe("target.hover");
    expect(repeated.next.mode).toBe("cooldown");
  });

  it("suppresses page scroll while a target is locked", () => {
    const result = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({
        gesture: "Open_Palm",
        cursor: null,
        rawCursor: null,
        palm: { x: 100, y: 150 },
        indexPalmVector: null,
        lockedTarget: buttonTarget,
      }),
    });

    expect(result.intents.map((intent) => intent.type)).toEqual(["target.hover"]);
  });

  it("emits scroll and zoom intents while unlocked", () => {
    const first = stepAIPilotPlusMachine({
      previous: createAIPilotPlusMachineState(),
      frame: frame({
        now: 1_000,
        gesture: "Open_Palm",
        palm: { x: 100, y: 100 },
        secondaryPalm: { x: 200, y: 100 },
      }),
    });
    const second = stepAIPilotPlusMachine({
      previous: first.next,
      frame: frame({
        now: 1_016,
        gesture: "Open_Palm",
        palm: { x: 80, y: 112 },
        secondaryPalm: { x: 230, y: 100 },
      }),
    });

    expect(second.intents.some((intent) => intent.type === "page.scroll")).toBe(true);
    expect(second.intents.some((intent) => intent.type === "viewport.zoom")).toBe(true);
  });
});
