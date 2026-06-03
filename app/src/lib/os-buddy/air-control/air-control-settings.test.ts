import { describe, expect, it } from "vitest";
import {
  DEFAULT_AIR_CONTROL_SETTINGS,
  validateAirControlSettings,
} from "./air-control-settings";

describe("validateAirControlSettings", () => {
  it("returns defaults for null/garbage", () => {
    expect(validateAirControlSettings(null)).toEqual(DEFAULT_AIR_CONTROL_SETTINGS);
    expect(validateAirControlSettings(undefined)).toEqual(DEFAULT_AIR_CONTROL_SETTINGS);
    expect(validateAirControlSettings({ enableQuadTap: "yes" as unknown as boolean })).toEqual(
      DEFAULT_AIR_CONTROL_SETTINGS,
    );
  });

  it("keeps valid fields and rejects invalid sensor modes", () => {
    const result = validateAirControlSettings({
      enableQuadTap: false,
      defaultSensorMode: "stereo",
      showDebugOverlay: true,
      allowPhoneRemote: false,
    });
    expect(result).toEqual({
      enableQuadTap: false,
      defaultSensorMode: "stereo",
      showDebugOverlay: true,
      allowPhoneRemote: false,
    });

    const bad = validateAirControlSettings({
      defaultSensorMode: "laser" as never,
    });
    expect(bad.defaultSensorMode).toBe(DEFAULT_AIR_CONTROL_SETTINGS.defaultSensorMode);
  });
});
