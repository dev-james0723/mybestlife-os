"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-settings";
import {
  settingsRepository,
  type UpdateProfileInput,
} from "@/lib/repositories/settings";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import {
  DEFAULT_OS_BUDDY_NAME,
  DEFAULT_OS_BUDDY_PET_ID,
  getOSBuddyPet,
} from "@/lib/os-buddy/os-buddy-pets";
import { getOSBuddyAnimationState } from "@/lib/os-buddy/os-buddy-animation-map";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type {
  OSBuddyPetId,
  OSBuddyPosition,
  OSBuddyMood,
  OSBuddyAnimationState,
} from "@/types/os-buddy";
import type { UserProfile } from "@/types/database";

const POSITION_STORAGE_KEY = "mblos:os-buddy-position";
const PROFILE_FALLBACK_STORAGE_KEY = "mblos:os-buddy-profile-fallback";
const INTERACTION_STATS_STORAGE_KEY = "mblos:os-buddy-interaction-stats";

const DEFAULT_POSITION: OSBuddyPosition = {
  x: null,
  y: null,
  anchor: "bottom-left",
};

const DEFAULT_UNLOCKED_PETS: OSBuddyPetId[] = ["xiaoba", "doge"];

type PartialProfileFallback = {
  os_buddy_pet_id: OSBuddyPetId;
  os_buddy_name: string;
  os_buddy_enabled: boolean;
  os_buddy_position: OSBuddyPosition;
  os_buddy_onboarding_completed: boolean;
  os_buddy_interaction_stats: Record<string, unknown>;
  os_buddy_unlocked_pets: OSBuddyPetId[];
};

function normalizePetId(value: unknown): OSBuddyPetId {
  return value === "doge" ? "doge" : "xiaoba";
}

function normalizePosition(value: unknown): OSBuddyPosition {
  if (!value || typeof value !== "object") return DEFAULT_POSITION;

  const row = value as Record<string, unknown>;
  const x = typeof row.x === "number" && Number.isFinite(row.x) ? row.x : null;
  const y = typeof row.y === "number" && Number.isFinite(row.y) ? row.y : null;
  const anchor =
    row.anchor === "bottom-left" ||
    row.anchor === "bottom-right" ||
    row.anchor === "top-left" ||
    row.anchor === "top-right" ||
    row.anchor === "custom"
      ? row.anchor
      : "bottom-left";

  return { x, y, anchor };
}

function normalizeInteractionStats(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function normalizeUnlockedPets(value: unknown): OSBuddyPetId[] {
  if (!Array.isArray(value)) return DEFAULT_UNLOCKED_PETS;
  const list = value
    .map((item) => normalizePetId(item))
    .filter((item, index, arr) => arr.indexOf(item) === index);

  if (!list.includes("xiaoba")) list.unshift("xiaoba");
  if (!list.includes("doge")) list.push("doge");

  return list;
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
    // ignore storage quota and privacy mode failures
  }
}

function normalizeBuddyName(raw: unknown, petId: OSBuddyPetId): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return getOSBuddyPet(petId).defaultName;
}

function getFallbackProfile(): PartialProfileFallback {
  const persisted = readStorageJson<Partial<PartialProfileFallback>>(
    PROFILE_FALLBACK_STORAGE_KEY,
    {},
  );
  const storedPosition = readStorageJson<unknown>(
    POSITION_STORAGE_KEY,
    persisted.os_buddy_position,
  );

  const petId = normalizePetId(persisted.os_buddy_pet_id);

  return {
    os_buddy_pet_id: petId,
    os_buddy_name: normalizeBuddyName(persisted.os_buddy_name, petId),
    os_buddy_enabled:
      typeof persisted.os_buddy_enabled === "boolean" ? persisted.os_buddy_enabled : true,
    os_buddy_position: normalizePosition(storedPosition),
    os_buddy_onboarding_completed:
      typeof persisted.os_buddy_onboarding_completed === "boolean"
        ? persisted.os_buddy_onboarding_completed
        : false,
    os_buddy_interaction_stats: normalizeInteractionStats(
      persisted.os_buddy_interaction_stats,
    ),
    os_buddy_unlocked_pets: normalizeUnlockedPets(persisted.os_buddy_unlocked_pets),
  };
}

function profileFromSource(
  profile: UserProfile | undefined,
  fallback: PartialProfileFallback,
): PartialProfileFallback {
  const petId = normalizePetId(profile?.os_buddy_pet_id ?? fallback.os_buddy_pet_id);
  return {
    os_buddy_pet_id: petId,
    os_buddy_name: normalizeBuddyName(profile?.os_buddy_name ?? fallback.os_buddy_name, petId),
    os_buddy_enabled:
      typeof profile?.os_buddy_enabled === "boolean"
        ? profile.os_buddy_enabled
        : fallback.os_buddy_enabled,
    os_buddy_position: normalizePosition(profile?.os_buddy_position ?? fallback.os_buddy_position),
    os_buddy_onboarding_completed:
      typeof profile?.os_buddy_onboarding_completed === "boolean"
        ? profile.os_buddy_onboarding_completed
        : fallback.os_buddy_onboarding_completed,
    os_buddy_interaction_stats: normalizeInteractionStats(
      profile?.os_buddy_interaction_stats ?? fallback.os_buddy_interaction_stats,
    ),
    os_buddy_unlocked_pets: normalizeUnlockedPets(
      profile?.os_buddy_unlocked_pets ?? fallback.os_buddy_unlocked_pets,
    ),
  };
}

function interactionStatsFromStorage() {
  return normalizeInteractionStats(readStorageJson(INTERACTION_STATS_STORAGE_KEY, {}));
}

export function useOSBuddy() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const mood = useOSBuddyStore((s) => s.mood);
  const setMood = useOSBuddyStore((s) => s.setMood);
  const showBubble = useOSBuddyStore((s) => s.showBubble);

  const fallback = getFallbackProfile();
  const source = useMemo(() => profileFromSource(profile, fallback), [fallback, profile]);

  const petId = source.os_buddy_pet_id;
  const pet = getOSBuddyPet(petId);
  const name = source.os_buddy_name || DEFAULT_OS_BUDDY_NAME;
  const enabled = source.os_buddy_enabled;
  const position = source.os_buddy_position;

  const animationState: OSBuddyAnimationState = getOSBuddyAnimationState({
    petId,
    mood,
  });
  const animationSrc = getOSBuddyAssetSrc({
    petId,
    mood,
  });

  const persistFallbackProfile = useCallback((next: Partial<PartialProfileFallback>) => {
    const previous = getFallbackProfile();
    const merged = profileFromSource(undefined, {
      ...previous,
      ...next,
      os_buddy_pet_id: normalizePetId(next.os_buddy_pet_id ?? previous.os_buddy_pet_id),
      os_buddy_position: normalizePosition(next.os_buddy_position ?? previous.os_buddy_position),
      os_buddy_unlocked_pets: normalizeUnlockedPets(
        next.os_buddy_unlocked_pets ?? previous.os_buddy_unlocked_pets,
      ),
      os_buddy_interaction_stats: normalizeInteractionStats(
        next.os_buddy_interaction_stats ?? previous.os_buddy_interaction_stats,
      ),
      os_buddy_name: String(next.os_buddy_name ?? previous.os_buddy_name),
      os_buddy_enabled:
        typeof next.os_buddy_enabled === "boolean"
          ? next.os_buddy_enabled
          : previous.os_buddy_enabled,
      os_buddy_onboarding_completed:
        typeof next.os_buddy_onboarding_completed === "boolean"
          ? next.os_buddy_onboarding_completed
          : previous.os_buddy_onboarding_completed,
    });

    writeStorageJson(PROFILE_FALLBACK_STORAGE_KEY, merged);
  }, []);

  const saveProfilePatch = useCallback(
    async (patch: UpdateProfileInput) => {
      try {
        const saved = await settingsRepository.updateProfile(patch);
        queryClient.setQueryData(["profile"], saved);

        persistFallbackProfile({
          os_buddy_pet_id: normalizePetId(saved.os_buddy_pet_id),
          os_buddy_name: saved.os_buddy_name,
          os_buddy_enabled: saved.os_buddy_enabled,
          os_buddy_position: normalizePosition(saved.os_buddy_position),
          os_buddy_onboarding_completed: saved.os_buddy_onboarding_completed,
          os_buddy_interaction_stats: normalizeInteractionStats(saved.os_buddy_interaction_stats),
          os_buddy_unlocked_pets: normalizeUnlockedPets(saved.os_buddy_unlocked_pets),
        });
      } catch {
        persistFallbackProfile({
          os_buddy_pet_id: normalizePetId(patch.os_buddy_pet_id),
          os_buddy_name: typeof patch.os_buddy_name === "string" ? patch.os_buddy_name : undefined,
          os_buddy_enabled:
            typeof patch.os_buddy_enabled === "boolean" ? patch.os_buddy_enabled : undefined,
          os_buddy_position: patch.os_buddy_position
            ? normalizePosition(patch.os_buddy_position)
            : undefined,
          os_buddy_onboarding_completed:
            typeof patch.os_buddy_onboarding_completed === "boolean"
              ? patch.os_buddy_onboarding_completed
              : undefined,
          os_buddy_interaction_stats: patch.os_buddy_interaction_stats
            ? normalizeInteractionStats(patch.os_buddy_interaction_stats)
            : undefined,
          os_buddy_unlocked_pets: patch.os_buddy_unlocked_pets
            ? normalizeUnlockedPets(patch.os_buddy_unlocked_pets)
            : undefined,
        });
      }
    },
    [persistFallbackProfile, queryClient],
  );

  const savePosition = useCallback(
    async (nextPosition: OSBuddyPosition) => {
      const normalized = normalizePosition(nextPosition);
      writeStorageJson(POSITION_STORAGE_KEY, normalized);
      persistFallbackProfile({ os_buddy_position: normalized });
      await saveProfilePatch({ os_buddy_position: normalized });
    },
    [persistFallbackProfile, saveProfilePatch],
  );

  const resetPosition = useCallback(async () => {
    const reset = { ...DEFAULT_POSITION };
    writeStorageJson(POSITION_STORAGE_KEY, reset);
    await saveProfilePatch({ os_buddy_position: reset });
  }, [saveProfilePatch]);

  const renameBuddy = useCallback(
    async (nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) return;
      await saveProfilePatch({ os_buddy_name: trimmed });
    },
    [saveProfilePatch],
  );

  const changePet = useCallback(
    async (nextPetId: OSBuddyPetId) => {
      const safePetId = normalizePetId(nextPetId);
      const currentDefaultName = getOSBuddyPet(petId).defaultName;
      const targetDefaultName = getOSBuddyPet(safePetId).defaultName;
      const currentName = name.trim() || currentDefaultName;
      const shouldSwapToDefault =
        currentName === currentDefaultName || currentName === "Xiaoba" || currentName === "Doge";
      const nextName = shouldSwapToDefault ? targetDefaultName : currentName;

      await saveProfilePatch({
        os_buddy_pet_id: safePetId,
        os_buddy_name: nextName,
        os_buddy_unlocked_pets: DEFAULT_UNLOCKED_PETS,
      });
    },
    [name, petId, saveProfilePatch],
  );

  const setEnabled = useCallback(
    async (nextEnabled: boolean) => {
      await saveProfilePatch({ os_buddy_enabled: nextEnabled });
    },
    [saveProfilePatch],
  );

  const incrementInteraction = useCallback(
    async (key = "general") => {
      const current = {
        ...interactionStatsFromStorage(),
        ...source.os_buddy_interaction_stats,
      };

      const currentCount = Number(current[key]);
      const nextCount = Number.isFinite(currentCount) ? currentCount + 1 : 1;
      const nextStats = { ...current, [key]: nextCount };

      writeStorageJson(INTERACTION_STATS_STORAGE_KEY, nextStats);
      persistFallbackProfile({ os_buddy_interaction_stats: nextStats });
      await saveProfilePatch({ os_buddy_interaction_stats: nextStats });
      return nextCount;
    },
    [persistFallbackProfile, saveProfilePatch, source.os_buddy_interaction_stats],
  );

  return {
    enabled,
    petId,
    pet,
    name,
    position,
    mood,
    animationState,
    animationSrc,
    setMood: setMood as (mood: OSBuddyMood) => void,
    showBubble,
    savePosition,
    resetPosition,
    renameBuddy,
    changePet,
    incrementInteraction,
    setEnabled,
    defaultPetId: DEFAULT_OS_BUDDY_PET_ID,
    defaultName: DEFAULT_OS_BUDDY_NAME,
  };
}
