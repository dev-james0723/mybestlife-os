"use client";

import { useCallback, useMemo, useState } from "react";
import {
  getLocalOSBuddyAirPilotSettings,
  saveLocalOSBuddyAirPilotSettings,
  validateOSBuddyAirPilotSettings,
  type OSBuddyAirPilotSettings,
} from "@/lib/os-buddy/os-buddy-airpilot-settings";

export function useOSBuddyAirPilotSettings(): {
  settings: OSBuddyAirPilotSettings;
  saveSettings: (settings: OSBuddyAirPilotSettings) => Promise<void>;
} {
  const [localRevision, setLocalRevision] = useState(0);
  const settings = useMemo(() => {
    void localRevision;
    return getLocalOSBuddyAirPilotSettings();
  }, [localRevision]);

  const saveSettings = useCallback(async (nextSettings: OSBuddyAirPilotSettings) => {
    saveLocalOSBuddyAirPilotSettings(validateOSBuddyAirPilotSettings(nextSettings));
    setLocalRevision((current) => current + 1);
  }, []);

  return { settings, saveSettings };
}
