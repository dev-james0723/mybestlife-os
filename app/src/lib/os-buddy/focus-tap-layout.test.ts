import { describe, expect, it } from "vitest";

import {
  FOCUS_TAP_MAX_SPRITE_SCALE,
  FOCUS_TAP_SPRITE_SCALE_CLASSES,
  getFocusTapSpriteScaleClass,
  type FocusTapVisualPhase,
} from "./focus-tap-layout";

function extractScaleValues(className: string) {
  return [...className.matchAll(/scale-\[([0-9.]+)\]/g)].map((match) =>
    Number(match[1]),
  );
}

describe("Focus Tap layout", () => {
  it("keeps every responsive sprite scale within the game surface cap", () => {
    const classes = Object.values(FOCUS_TAP_SPRITE_SCALE_CLASSES);

    for (const className of classes) {
      const values = extractScaleValues(className);
      expect(values.length).toBeGreaterThan(0);
      expect(Math.max(...values)).toBeLessThanOrEqual(FOCUS_TAP_MAX_SPRITE_SCALE);
    }
  });

  it("uses the active scale only while the cue is live", () => {
    const phases: FocusTapVisualPhase[] = ["waiting", "active", "feedback", "result"];

    expect(getFocusTapSpriteScaleClass("active", false)).toBe(
      FOCUS_TAP_SPRITE_SCALE_CLASSES.active,
    );

    for (const phase of phases.filter((phase) => phase !== "active")) {
      expect(getFocusTapSpriteScaleClass(phase, false)).toBe(
        FOCUS_TAP_SPRITE_SCALE_CLASSES.resting,
      );
    }

    expect(getFocusTapSpriteScaleClass("active", true)).toBe(
      FOCUS_TAP_SPRITE_SCALE_CLASSES.reducedMotion,
    );
  });
});
