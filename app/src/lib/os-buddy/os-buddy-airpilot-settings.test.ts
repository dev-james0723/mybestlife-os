import { describe, expect, it } from "vitest";
import {
  DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS,
  validateOSBuddyAirPilotSettings,
} from "./os-buddy-airpilot-settings";

describe("validateOSBuddyAirPilotSettings", () => {
  it("returns defaults for empty or invalid input", () => {
    expect(validateOSBuddyAirPilotSettings(null)).toEqual(
      DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS,
    );
    expect(validateOSBuddyAirPilotSettings(undefined)).toEqual(
      DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS,
    );
  });

  it("keeps valid Plus settings", () => {
    expect(
      validateOSBuddyAirPilotSettings({
        wakeEnabled: false,
        hudHidden: true,
        plusEnabled: false,
        twoHandModeEnabled: false,
        tenFingerModeEnabled: true,
        playBallGestureModeEnabled: false,
        scrollSensitivity: 1.4,
        gestureSensitivity: 0.7,
        smoothingStrength: 0.6,
        reducedMotion: true,
      }),
    ).toEqual({
      wakeEnabled: false,
      hudHidden: true,
      plusEnabled: false,
      twoHandModeEnabled: false,
      tenFingerModeEnabled: true,
      playBallGestureModeEnabled: false,
      scrollSensitivity: 1.4,
      gestureSensitivity: 0.7,
      smoothingStrength: 0.6,
      reducedMotion: true,
    });
  });

  it("clamps numeric settings to safe ranges", () => {
    const result = validateOSBuddyAirPilotSettings({
      scrollSensitivity: 99,
      gestureSensitivity: -3,
      smoothingStrength: 3,
    });

    expect(result.scrollSensitivity).toBe(2);
    expect(result.gestureSensitivity).toBe(0.25);
    expect(result.smoothingStrength).toBe(0.95);
  });
});
