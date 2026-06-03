export type OSBuddyAirPilotSettings = {
  wakeEnabled: boolean;
  hudHidden: boolean;
  plusEnabled: boolean;
  twoHandModeEnabled: boolean;
  tenFingerModeEnabled: boolean;
  playBallGestureModeEnabled: boolean;
  scrollSensitivity: number;
  gestureSensitivity: number;
  smoothingStrength: number;
  reducedMotion: boolean;
};

export const DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS: OSBuddyAirPilotSettings = {
  wakeEnabled: true,
  hudHidden: false,
  plusEnabled: true,
  twoHandModeEnabled: true,
  tenFingerModeEnabled: false,
  playBallGestureModeEnabled: true,
  scrollSensitivity: 1,
  gestureSensitivity: 1,
  smoothingStrength: 0.42,
  reducedMotion: false,
};

export const OS_BUDDY_AIRPILOT_SETTINGS_STORAGE_KEY =
  "mblos:os-buddy-airpilot-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStorageJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // AirPilot settings must never block OS Buddy rendering.
  }
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function validateOSBuddyAirPilotSettings(
  settings: Partial<OSBuddyAirPilotSettings> | null | undefined,
): OSBuddyAirPilotSettings {
  if (!isRecord(settings)) return { ...DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS };

  return {
    wakeEnabled:
      typeof settings.wakeEnabled === "boolean"
        ? settings.wakeEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.wakeEnabled,
    hudHidden:
      typeof settings.hudHidden === "boolean"
        ? settings.hudHidden
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.hudHidden,
    plusEnabled:
      typeof settings.plusEnabled === "boolean"
        ? settings.plusEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.plusEnabled,
    twoHandModeEnabled:
      typeof settings.twoHandModeEnabled === "boolean"
        ? settings.twoHandModeEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.twoHandModeEnabled,
    tenFingerModeEnabled:
      typeof settings.tenFingerModeEnabled === "boolean"
        ? settings.tenFingerModeEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.tenFingerModeEnabled,
    playBallGestureModeEnabled:
      typeof settings.playBallGestureModeEnabled === "boolean"
        ? settings.playBallGestureModeEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.playBallGestureModeEnabled,
    scrollSensitivity: numberInRange(
      settings.scrollSensitivity,
      DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.scrollSensitivity,
      0.25,
      2,
    ),
    gestureSensitivity: numberInRange(
      settings.gestureSensitivity,
      DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.gestureSensitivity,
      0.25,
      2,
    ),
    smoothingStrength: numberInRange(
      settings.smoothingStrength,
      DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.smoothingStrength,
      0.05,
      0.95,
    ),
    reducedMotion:
      typeof settings.reducedMotion === "boolean"
        ? settings.reducedMotion
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.reducedMotion,
  };
}

export function getLocalOSBuddyAirPilotSettings(): OSBuddyAirPilotSettings {
  const raw = readStorageJson<Partial<OSBuddyAirPilotSettings> | null>(
    OS_BUDDY_AIRPILOT_SETTINGS_STORAGE_KEY,
    null,
  );
  if (!raw) return { ...DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS };
  const settings = validateOSBuddyAirPilotSettings(raw);
  if (JSON.stringify(settings) !== JSON.stringify(raw)) {
    saveLocalOSBuddyAirPilotSettings(settings);
  }
  return settings;
}

export function saveLocalOSBuddyAirPilotSettings(settings: OSBuddyAirPilotSettings) {
  writeStorageJson(
    OS_BUDDY_AIRPILOT_SETTINGS_STORAGE_KEY,
    validateOSBuddyAirPilotSettings(settings),
  );
}
