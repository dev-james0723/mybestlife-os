import { describe, expect, it } from "vitest";
import {
  getAIPilotPlusPlayBallThrowVelocity,
  getAIPilotPlusPlayBallZoneRects,
  isAIPilotPlusPointNearBall,
  resolveAIPilotPlusPlayBallZone,
} from "./play-ball-gesture";

describe("AI Pilot Plus Play Ball gesture helpers", () => {
  it("detects whether the hand is near the ball", () => {
    expect(
      isAIPilotPlusPointNearBall({
        point: { x: 105, y: 105 },
        ballCenter: { x: 100, y: 100 },
        ballSize: 38,
      }),
    ).toBe(true);
    expect(
      isAIPilotPlusPointNearBall({
        point: { x: 180, y: 180 },
        ballCenter: { x: 100, y: 100 },
        ballSize: 38,
      }),
    ).toBe(false);
  });

  it("maps screen corners and center to command zones", () => {
    const viewport = { width: 1_000, height: 800 };

    expect(resolveAIPilotPlusPlayBallZone({ point: { x: 40, y: 40 }, viewport })).toBe("brain");
    expect(resolveAIPilotPlusPlayBallZone({ point: { x: 960, y: 40 }, viewport })).toBe("idea");
    expect(resolveAIPilotPlusPlayBallZone({ point: { x: 960, y: 760 }, viewport })).toBe("project");
    expect(resolveAIPilotPlusPlayBallZone({ point: { x: 40, y: 760 }, viewport })).toBe("shortcut");
    expect(resolveAIPilotPlusPlayBallZone({ point: { x: 500, y: 400 }, viewport })).toBe("osBuddy");
  });

  it("returns zone rects for visual overlays", () => {
    expect(getAIPilotPlusPlayBallZoneRects({ width: 1_000, height: 800 })).toHaveLength(5);
  });

  it("computes clamped throw velocity", () => {
    expect(
      getAIPilotPlusPlayBallThrowVelocity({
        previous: { x: 0, y: 0, at: 1_000 },
        current: { x: 100, y: -100, at: 1_016 },
        maxVelocity: 24,
      }),
    ).toEqual({ x: 24, y: -24 });
  });
});
