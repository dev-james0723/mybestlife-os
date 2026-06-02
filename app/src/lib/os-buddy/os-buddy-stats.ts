import { settingsRepository } from "@/lib/repositories/settings";

export type OSBuddyBadge =
  | "secret-pixel-mode"
  | "first-game"
  | "pixel-collector"
  | "fast-hands"
  | "clean-desk"
  | "birthday-celebrated";

export type OSBuddyInteractionStats = {
  clicks?: number;
  drags?: number;
  gamesPlayed?: number;
  lastInteractionAt?: string;
  badges?: string[];
};

const STATS_STORAGE_KEY = "mblos:os-buddy-interaction-stats";
const BADGES_STORAGE_KEY = "mblos:os-buddy-badges";
const STAT_WRITE_DELAY_MS = 1_500;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

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
    // Local interaction state should never break the UI.
  }
}

function normalizeStats(value: unknown): OSBuddyInteractionStats {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const row = value as Record<string, unknown>;
  const badges = Array.isArray(row.badges)
    ? row.badges.filter((badge): badge is string => typeof badge === "string")
    : undefined;

  return {
    clicks: typeof row.clicks === "number" && Number.isFinite(row.clicks) ? row.clicks : undefined,
    drags: typeof row.drags === "number" && Number.isFinite(row.drags) ? row.drags : undefined,
    gamesPlayed:
      typeof row.gamesPlayed === "number" && Number.isFinite(row.gamesPlayed)
        ? row.gamesPlayed
        : undefined,
    lastInteractionAt:
      typeof row.lastInteractionAt === "string" ? row.lastInteractionAt : undefined,
    badges,
  };
}

function normalizeBadges(value: unknown): OSBuddyBadge[] {
  if (!Array.isArray(value)) return [];
  return value.filter((badge): badge is OSBuddyBadge =>
    [
      "secret-pixel-mode",
      "first-game",
      "pixel-collector",
      "fast-hands",
      "clean-desk",
      "birthday-celebrated",
    ].includes(String(badge)),
  );
}

function mergeStats(
  base: OSBuddyInteractionStats,
  next: OSBuddyInteractionStats,
): OSBuddyInteractionStats {
  const badges = Array.from(new Set([...(base.badges ?? []), ...(next.badges ?? [])]));
  return {
    ...base,
    ...next,
    clicks: Math.max(base.clicks ?? 0, next.clicks ?? 0),
    drags: Math.max(base.drags ?? 0, next.drags ?? 0),
    gamesPlayed: Math.max(base.gamesPlayed ?? 0, next.gamesPlayed ?? 0),
    badges,
  };
}

async function flushOSBuddyStats() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const localStats = getLocalOSBuddyStats();
  try {
    const profile = await settingsRepository.getProfile();
    const profileStats = normalizeStats(profile.os_buddy_interaction_stats);
    const merged = mergeStats(profileStats, localStats);
    await settingsRepository.updateProfile({ os_buddy_interaction_stats: merged });
    writeStorageJson(STATS_STORAGE_KEY, merged);
  } catch {
    writeStorageJson(STATS_STORAGE_KEY, localStats);
  }
}

function scheduleStatsFlush() {
  if (typeof window === "undefined") return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void flushOSBuddyStats();
  }, STAT_WRITE_DELAY_MS);
}

export function getLocalOSBuddyStats(): OSBuddyInteractionStats {
  const stats = normalizeStats(readStorageJson(STATS_STORAGE_KEY, {}));
  const badges = normalizeBadges(readStorageJson(BADGES_STORAGE_KEY, stats.badges ?? []));
  return {
    ...stats,
    badges,
  };
}

export async function incrementOSBuddyStat(
  kind: "clicks" | "drags" | "gamesPlayed",
): Promise<void> {
  const current = getLocalOSBuddyStats();
  const next: OSBuddyInteractionStats = {
    ...current,
    [kind]: (current[kind] ?? 0) + 1,
    lastInteractionAt: new Date().toISOString(),
  };
  writeStorageJson(STATS_STORAGE_KEY, next);
  scheduleStatsFlush();
}

export async function addOSBuddyBadge(badge: OSBuddyBadge): Promise<void> {
  const currentBadges = normalizeBadges(readStorageJson(BADGES_STORAGE_KEY, []));
  if (currentBadges.includes(badge)) return;

  const nextBadges = [...currentBadges, badge];
  writeStorageJson(BADGES_STORAGE_KEY, nextBadges);

  const currentStats = getLocalOSBuddyStats();
  writeStorageJson(STATS_STORAGE_KEY, {
    ...currentStats,
    badges: Array.from(new Set([...(currentStats.badges ?? []), ...nextBadges])),
    lastInteractionAt: new Date().toISOString(),
  });
  scheduleStatsFlush();
}
