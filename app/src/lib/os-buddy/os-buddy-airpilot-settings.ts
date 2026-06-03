export type OSBuddyAirPilotSettings = {
  wakeEnabled: boolean;
};

export const DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS: OSBuddyAirPilotSettings = {
  wakeEnabled: true,
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

export function validateOSBuddyAirPilotSettings(
  settings: Partial<OSBuddyAirPilotSettings> | null | undefined,
): OSBuddyAirPilotSettings {
  if (!isRecord(settings)) return { ...DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS };

  return {
    wakeEnabled:
      typeof settings.wakeEnabled === "boolean"
        ? settings.wakeEnabled
        : DEFAULT_OS_BUDDY_AIRPILOT_SETTINGS.wakeEnabled,
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
