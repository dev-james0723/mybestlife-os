"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-settings";
import { settingsRepository } from "@/lib/repositories/settings";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { addOSBuddyBadge } from "@/lib/os-buddy/os-buddy-stats";
import {
  getLocalOSBuddyBirthdayProfile,
  getOSBuddyBirthdayProfileFromSource,
  getOSBuddyBirthdayStatus,
  getOSBuddyBirthdayTargetKey,
  getOSBuddyBirthdayTodayKey,
  saveLocalOSBuddyBirthdayProfile,
  toOSBuddyBirthdayProfileUpdate,
  validateOSBuddyBirthdayProfile,
  type OSBuddyBirthdayProfile,
} from "@/lib/os-buddy/os-buddy-birthday";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import type { AppLocale } from "@/lib/i18n/app-locale";

export const BIRTHDAY_MODE_DURATION_MS = 12_000;
export const UPCOMING_BIRTHDAY_WINDOW_DAYS = 7;

const UNSOLICITED_BIRTHDAY_GAP_MS = 20_000;

function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return Math.max(1_000, next.getTime() - now.getTime());
}

export function useOSBuddyBirthdayProfile(): {
  profile: OSBuddyBirthdayProfile;
  saveProfile: (profile: OSBuddyBirthdayProfile) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { data: sourceProfile } = useProfile();
  const [localRevision, setLocalRevision] = useState(0);
  const sourceBirthdayProfile = useMemo(
    () => getOSBuddyBirthdayProfileFromSource(sourceProfile),
    [sourceProfile],
  );
  const birthdayProfile = useMemo(
    () => {
      void localRevision;
      return sourceBirthdayProfile ?? getLocalOSBuddyBirthdayProfile();
    },
    [localRevision, sourceBirthdayProfile],
  );

  const saveProfile = useCallback(
    async (nextProfile: OSBuddyBirthdayProfile) => {
      const safeProfile = validateOSBuddyBirthdayProfile(nextProfile);
      saveLocalOSBuddyBirthdayProfile(safeProfile);
      setLocalRevision((current) => current + 1);

      try {
        const saved = await settingsRepository.updateProfile(
          toOSBuddyBirthdayProfileUpdate(safeProfile),
        );
        queryClient.setQueryData(["profile"], saved);
      } catch {
        // Local persistence is the fallback contract for Birthday Mode.
      }
    },
    [queryClient],
  );

  return {
    profile: birthdayProfile,
    saveProfile,
  };
}

export function useOSBuddyBirthday(params: {
  enabled: boolean;
  locale: AppLocale;
  profile: OSBuddyBirthdayProfile;
  saveProfile: (profile: OSBuddyBirthdayProfile) => Promise<void> | void;
}): void {
  const setBirthdayMode = useOSBuddyStore((state) => state.setBirthdayMode);
  const profileRef = useRef(params.profile);
  const saveProfileRef = useRef(params.saveProfile);

  useEffect(() => {
    profileRef.current = params.profile;
  }, [params.profile]);

  useEffect(() => {
    saveProfileRef.current = params.saveProfile;
  }, [params.saveProfile]);

  useEffect(() => {
    if (!params.enabled) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const runBirthdayCheck = () => {
      if (cancelled) return;

      const profile = validateOSBuddyBirthdayProfile(profileRef.current);
      if (!profile.enabled) return;

      const now = new Date();
      const status = getOSBuddyBirthdayStatus({ profile, now });
      const state = useOSBuddyStore.getState();

      if (status.type === "today") {
        const todayKey = getOSBuddyBirthdayTodayKey({ profile, now });
        if (profile.lastCelebratedOn === todayKey) return;

        const nextProfile = {
          ...profile,
          lastCelebratedOn: todayKey,
        };
        void saveProfileRef.current(nextProfile);
        void addOSBuddyBadge("birthday-celebrated");
        setBirthdayMode(true, BIRTHDAY_MODE_DURATION_MS);
        emitOSBuddyEvent({
          type: "birthday:today",
          age: status.age,
        });
        return;
      }

      if (
        status.type !== "upcoming" ||
        status.daysUntil < 1 ||
        status.daysUntil > UPCOMING_BIRTHDAY_WINDOW_DAYS ||
        profile.reminderEnabled === false
      ) {
        return;
      }

      const targetKey = getOSBuddyBirthdayTargetKey({ profile, now });
      if (!targetKey || profile.lastReminderOn === targetKey) return;
      if (state.isMenuOpen || state.isMiniGameOpen || state.bubble) return;
      if (
        state.lastUnsolicitedBubbleAt != null &&
        Date.now() - state.lastUnsolicitedBubbleAt < UNSOLICITED_BIRTHDAY_GAP_MS
      ) {
        return;
      }

      void saveProfileRef.current({
        ...profile,
        lastReminderOn: targetKey,
      });
      emitOSBuddyEvent({
        type: "birthday:upcoming",
        daysUntil: status.daysUntil,
        age: status.age,
      });
    };

    const scheduleNextMidnight = () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      midnightTimer = setTimeout(() => {
        runBirthdayCheck();
        scheduleNextMidnight();
      }, msUntilNextLocalMidnight());
    };

    const initialTimer = setTimeout(runBirthdayCheck, 800);
    scheduleNextMidnight();

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [params.enabled, params.locale, setBirthdayMode]);
}
