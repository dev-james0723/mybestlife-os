/**
 * Air Touch user settings + calibration persistence (localStorage).
 *
 * PRIVACY: only small numbers are persisted — settings flags and calibration
 * coefficients (affine + RMS + quality). No video, no frames, ever.
 */

import type { CalibrationData } from "./types";
import type { OSBuddyAirControlSensorMode } from "../os-buddy-air-control-types";

export type OSBuddyAirControlSettings = {
  /** Whether the 4-tap activation gesture is enabled. */
  enableQuadTap: boolean;
  defaultSensorMode: OSBuddyAirControlSensorMode;
  showDebugOverlay: boolean;
  allowPhoneRemote: boolean;
};

export const DEFAULT_AIR_CONTROL_SETTINGS: OSBuddyAirControlSettings = {
  enableQuadTap: true,
  defaultSensorMode: "rgb-webcam",
  showDebugOverlay: false,
  allowPhoneRemote: true,
};

export const AIR_CONTROL_SETTINGS_STORAGE_KEY = "mblos:os-buddy-air-control-settings";
export const AIR_CONTROL_CALIBRATION_STORAGE_KEY = "mblos:os-buddy-air-control-calibration";

const VALID_MODES: OSBuddyAirControlSensorMode[] = [
  "rgb-webcam",
  "phone-rgb",
  "phone-ar",
  "stereo",
  "depth",
  "fallback-2d",
];

export function validateAirControlSettings(
  value: Partial<OSBuddyAirControlSettings> | null | undefined,
): OSBuddyAirControlSettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_AIR_CONTROL_SETTINGS };
  return {
    enableQuadTap:
      typeof value.enableQuadTap === "boolean"
        ? value.enableQuadTap
        : DEFAULT_AIR_CONTROL_SETTINGS.enableQuadTap,
    defaultSensorMode: VALID_MODES.includes(value.defaultSensorMode as OSBuddyAirControlSensorMode)
      ? (value.defaultSensorMode as OSBuddyAirControlSensorMode)
      : DEFAULT_AIR_CONTROL_SETTINGS.defaultSensorMode,
    showDebugOverlay:
      typeof value.showDebugOverlay === "boolean"
        ? value.showDebugOverlay
        : DEFAULT_AIR_CONTROL_SETTINGS.showDebugOverlay,
    allowPhoneRemote:
      typeof value.allowPhoneRemote === "boolean"
        ? value.allowPhoneRemote
        : DEFAULT_AIR_CONTROL_SETTINGS.allowPhoneRemote,
  };
}

export function getLocalAirControlSettings(): OSBuddyAirControlSettings {
  if (typeof window === "undefined") return { ...DEFAULT_AIR_CONTROL_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AIR_CONTROL_SETTINGS_STORAGE_KEY);
    return validateAirControlSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_AIR_CONTROL_SETTINGS };
  }
}

export function saveLocalAirControlSettings(settings: OSBuddyAirControlSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AIR_CONTROL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage may be unavailable (private mode); ignore.
  }
}

export function getLocalAirControlCalibration(): CalibrationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AIR_CONTROL_CALIBRATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalibrationData;
    if (!parsed || typeof parsed !== "object" || typeof parsed.quality !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalAirControlCalibration(calibration: CalibrationData | null): void {
  if (typeof window === "undefined") return;
  try {
    if (calibration) {
      window.localStorage.setItem(
        AIR_CONTROL_CALIBRATION_STORAGE_KEY,
        JSON.stringify(calibration),
      );
    } else {
      window.localStorage.removeItem(AIR_CONTROL_CALIBRATION_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}
