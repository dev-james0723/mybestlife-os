"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-settings";
import { settingsRepository } from "@/lib/repositories/settings";
import {
  getLocalOSBuddyFreeRoamSettings,
  getOSBuddyFreeRoamSettingsFromSource,
  saveLocalOSBuddyFreeRoamSettings,
  toOSBuddyFreeRoamSettingsUpdate,
  validateOSBuddyFreeRoamSettings,
  type OSBuddyFreeRoamSettings,
} from "@/lib/os-buddy/os-buddy-free-roam";

export function useOSBuddyFreeRoamSettings(): {
  settings: OSBuddyFreeRoamSettings;
  saveSettings: (settings: OSBuddyFreeRoamSettings) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const { data: sourceProfile } = useProfile();
  const [localRevision, setLocalRevision] = useState(0);
  const sourceSettings = useMemo(
    () => getOSBuddyFreeRoamSettingsFromSource(sourceProfile),
    [sourceProfile],
  );
  const settings = useMemo(() => {
    void localRevision;
    return sourceSettings ?? getLocalOSBuddyFreeRoamSettings();
  }, [localRevision, sourceSettings]);

  const saveSettings = useCallback(
    async (nextSettings: OSBuddyFreeRoamSettings) => {
      const safeSettings = validateOSBuddyFreeRoamSettings(nextSettings);
      saveLocalOSBuddyFreeRoamSettings(safeSettings);
      setLocalRevision((current) => current + 1);

      try {
        const saved = await settingsRepository.updateProfile(
          toOSBuddyFreeRoamSettingsUpdate(safeSettings),
        );
        queryClient.setQueryData(["profile"], saved);
      } catch {
        // Local persistence is the fallback contract for Free Roam.
      }
    },
    [queryClient],
  );

  return {
    settings,
    saveSettings,
  };
}
