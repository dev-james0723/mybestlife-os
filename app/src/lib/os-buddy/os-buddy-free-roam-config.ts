import type { OSBuddyFreeRoamIntensity } from "@/lib/os-buddy/os-buddy-free-roam";

export type OSBuddyFreeRoamConfig = {
  idleDelayMs: number;
  sessionMinMs: number;
  sessionMaxMs: number;
  cooldownMinMs: number;
  cooldownMaxMs: number;
  maxSessionsPerHour: number;
  desktopRadiusPx: number;
  mobileRadiusPx: number;
  speedMinPxPerSec: number;
  speedMaxPxPerSec: number;
};

export const OS_BUDDY_FREE_ROAM_CONFIG: Record<
  OSBuddyFreeRoamIntensity,
  OSBuddyFreeRoamConfig
> = {
  subtle: {
    idleDelayMs: 90_000,
    sessionMinMs: 8_000,
    sessionMaxMs: 12_000,
    cooldownMinMs: 8 * 60_000,
    cooldownMaxMs: 12 * 60_000,
    maxSessionsPerHour: 3,
    desktopRadiusPx: 160,
    mobileRadiusPx: 96,
    speedMinPxPerSec: 28,
    speedMaxPxPerSec: 40,
  },
  balanced: {
    idleDelayMs: 60_000,
    sessionMinMs: 12_000,
    sessionMaxMs: 20_000,
    cooldownMinMs: 4 * 60_000,
    cooldownMaxMs: 7 * 60_000,
    maxSessionsPerHour: 6,
    desktopRadiusPx: 220,
    mobileRadiusPx: 120,
    speedMinPxPerSec: 35,
    speedMaxPxPerSec: 55,
  },
  lively: {
    idleDelayMs: 45_000,
    sessionMinMs: 20_000,
    sessionMaxMs: 35_000,
    cooldownMinMs: 2 * 60_000,
    cooldownMaxMs: 4 * 60_000,
    maxSessionsPerHour: 10,
    desktopRadiusPx: 300,
    mobileRadiusPx: 160,
    speedMinPxPerSec: 45,
    speedMaxPxPerSec: 70,
  },
} as const;
