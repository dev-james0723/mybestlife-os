import type { UserProfile } from "@/types/database";

export type OSBuddyFreeRoamIntensity = "subtle" | "balanced" | "lively";

export type OSBuddyFreeRoamSettings = {
  enabled: boolean;
  intensity: OSBuddyFreeRoamIntensity;
  returnHomeAfterRoam: boolean;
  roamNearHomeOnly: boolean;
};

export const DEFAULT_OS_BUDDY_FREE_ROAM_SETTINGS: OSBuddyFreeRoamSettings = {
  enabled: false,
  intensity: "balanced",
  returnHomeAfterRoam: true,
  roamNearHomeOnly: true,
};

export const OS_BUDDY_FREE_ROAM_SETTINGS_STORAGE_KEY =
  "mblos:os-buddy-free-roam-settings";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeIntensity(value: unknown): OSBuddyFreeRoamIntensity {
  if (value === "subtle" || value === "lively") return value;
  return "balanced";
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
    // Free Roam settings must never block OS Buddy rendering.
  }
}

export function validateOSBuddyFreeRoamSettings(
  settings: Partial<OSBuddyFreeRoamSettings> | null | undefined,
): OSBuddyFreeRoamSettings {
  if (!isRecord(settings)) return { ...DEFAULT_OS_BUDDY_FREE_ROAM_SETTINGS };

  return {
    enabled: typeof settings.enabled === "boolean" ? settings.enabled : false,
    intensity: normalizeIntensity(settings.intensity),
    returnHomeAfterRoam:
      typeof settings.returnHomeAfterRoam === "boolean"
        ? settings.returnHomeAfterRoam
        : true,
    roamNearHomeOnly:
      typeof settings.roamNearHomeOnly === "boolean" ? settings.roamNearHomeOnly : true,
  };
}

export function getLocalOSBuddyFreeRoamSettings(): OSBuddyFreeRoamSettings {
  const raw = readStorageJson<Partial<OSBuddyFreeRoamSettings> | null>(
    OS_BUDDY_FREE_ROAM_SETTINGS_STORAGE_KEY,
    null,
  );
  if (!raw) return { ...DEFAULT_OS_BUDDY_FREE_ROAM_SETTINGS };
  const settings = validateOSBuddyFreeRoamSettings(raw);
  if (JSON.stringify(settings) !== JSON.stringify(raw)) {
    saveLocalOSBuddyFreeRoamSettings(settings);
  }
  return settings;
}

export function saveLocalOSBuddyFreeRoamSettings(
  settings: OSBuddyFreeRoamSettings,
): void {
  writeStorageJson(
    OS_BUDDY_FREE_ROAM_SETTINGS_STORAGE_KEY,
    validateOSBuddyFreeRoamSettings(settings),
  );
}

export function getOSBuddyFreeRoamSettingsFromSource(
  source: UserProfile | undefined | null,
): OSBuddyFreeRoamSettings | null {
  if (!source) return null;

  const hasRemoteFreeRoamSettings =
    typeof source.os_buddy_free_roam_enabled === "boolean" ||
    typeof source.os_buddy_free_roam_intensity === "string" ||
    typeof source.os_buddy_free_roam_return_home === "boolean" ||
    typeof source.os_buddy_free_roam_near_home_only === "boolean";

  if (!hasRemoteFreeRoamSettings) return null;

  return validateOSBuddyFreeRoamSettings({
    enabled: source.os_buddy_free_roam_enabled,
    intensity: source.os_buddy_free_roam_intensity ?? undefined,
    returnHomeAfterRoam: source.os_buddy_free_roam_return_home,
    roamNearHomeOnly: source.os_buddy_free_roam_near_home_only,
  });
}

export function toOSBuddyFreeRoamSettingsUpdate(settings: OSBuddyFreeRoamSettings) {
  const value = validateOSBuddyFreeRoamSettings(settings);
  return {
    os_buddy_free_roam_enabled: value.enabled,
    os_buddy_free_roam_intensity: value.intensity,
    os_buddy_free_roam_return_home: value.returnHomeAfterRoam,
    os_buddy_free_roam_near_home_only: value.roamNearHomeOnly,
  };
}
