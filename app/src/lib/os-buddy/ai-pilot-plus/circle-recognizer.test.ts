import { describe, expect, it } from "vitest";
import {
  createAIPilotPlusCircleRecognizerState,
  stepAIPilotPlusCircleRecognizer,
} from "./circle-recognizer";

function circlePoint(params: {
  center: { x: number; y: number };
  radius: number;
  angle: number;
}) {
  return {
    x: params.center.x + Math.cos(params.angle) * params.radius,
    y: params.center.y + Math.sin(params.angle) * params.radius,
  };
}

function driveCircle(params: {
  direction: "clockwise" | "counterclockwise";
  confidence?: number;
  radius?: number;
}) {
  let state = createAIPilotPlusCircleRecognizerState();
  let event = null as ReturnType<typeof stepAIPilotPlusCircleRecognizer>["event"];
  const sign = params.direction === "clockwise" ? 1 : -1;
  for (let index = 0; index < 18; index += 1) {
    const result = stepAIPilotPlusCircleRecognizer({
      previous: state,
      now: 1_000 + index * 50,
      point: circlePoint({
        center: { x: 200, y: 200 },
        radius: params.radius ?? 42,
        angle: -Math.PI / 2 + sign * index * ((Math.PI * 2) / 17),
      }),
      confidence: params.confidence ?? 0.9,
      enabled: true,
    });
    state = result.next;
    event = result.event ?? event;
  }
  return event;
}

describe("AI Pilot Plus circle recognizer", () => {
  it("detects a deliberate clockwise circle", () => {
    const event = driveCircle({ direction: "clockwise" });

    expect(event?.direction).toBe("clockwise");
    expect(event?.radiusPx).toBeGreaterThan(30);
    expect(event?.confidence).toBeGreaterThan(0.8);
  });

  it("detects a deliberate counterclockwise circle", () => {
    const event = driveCircle({ direction: "counterclockwise" });

    expect(event?.direction).toBe("counterclockwise");
  });

  it("rejects small or low-confidence circular movement", () => {
    expect(driveCircle({ direction: "clockwise", radius: 8 })).toBeNull();
    expect(driveCircle({ direction: "clockwise", confidence: 0.4 })).toBeNull();
  });

  it("does not run while disabled", () => {
    const result = stepAIPilotPlusCircleRecognizer({
      previous: createAIPilotPlusCircleRecognizerState(),
      now: 1_000,
      point: { x: 100, y: 100 },
      confidence: 1,
      enabled: false,
    });

    expect(result.event).toBeNull();
    expect(result.trail).toEqual([]);
  });

  it("applies cooldown after one circle event", () => {
    let state = createAIPilotPlusCircleRecognizerState();
    let emitted = 0;
    for (let lap = 0; lap < 2; lap += 1) {
      for (let index = 0; index < 18; index += 1) {
        const result = stepAIPilotPlusCircleRecognizer({
          previous: state,
          now: 1_000 + lap * 850 + index * 50,
          point: circlePoint({
            center: { x: 200, y: 200 },
            radius: 42,
            angle: -Math.PI / 2 + index * ((Math.PI * 2) / 17),
          }),
          confidence: 0.9,
          enabled: true,
          config: { cooldownMs: 2_000 },
        });
        state = result.next;
        if (result.event) emitted += 1;
      }
    }

    expect(emitted).toBeLessThanOrEqual(1);
  });
});
