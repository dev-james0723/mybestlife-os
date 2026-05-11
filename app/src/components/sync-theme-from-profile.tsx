"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/use-settings";
import { useTheme } from "@/lib/theme-context";
import { settingsRepository } from "@/lib/repositories/settings";
import type { UserProfile } from "@/types/database";

type ThemeSnapshot = {
  ui_theme: UserProfile["ui_theme"];
  color_mode: UserProfile["color_mode"];
  font_size_pref: UserProfile["font_size_pref"];
  widget_density: UserProfile["widget_density"];
  focus_mode: UserProfile["focus_mode"];
};

function serializeSnapshot(snapshot: ThemeSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Two-way sync between the theme context (local/localStorage) and the server profile.
 *
 * 1. On first load, hydrate the theme context from the server profile so SSR/default values
 *    don't flash something different from what the user last chose.
 * 2. After hydration, any user-initiated change to theme preferences is persisted back to
 *    `profiles` via a debounced silent update, so a refresh / re-login / other device lands
 *    on the same theme.
 */
export function SyncThemeFromProfile() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const {
    uiTheme,
    colorMode,
    fontSize,
    widgetDensity,
    focusMode,
    hydrateFromProfile,
  } = useTheme();

  const hydratedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  // 1) Hydrate once from the server profile.
  useEffect(() => {
    if (!profile || hydratedRef.current) return;
    const serverSnapshot: ThemeSnapshot = {
      ui_theme: profile.ui_theme,
      color_mode: profile.color_mode,
      font_size_pref: profile.font_size_pref,
      widget_density: profile.widget_density,
      focus_mode: profile.focus_mode,
    };
    hydrateFromProfile(serverSnapshot);
    lastSavedRef.current = serializeSnapshot(serverSnapshot);
    hydratedRef.current = true;
  }, [profile, hydrateFromProfile]);

  // 2) Persist any subsequent local change back to the profile (debounced, silent).
  useEffect(() => {
    if (!hydratedRef.current) return;

    const current: ThemeSnapshot = {
      ui_theme: uiTheme,
      color_mode: colorMode,
      font_size_pref: fontSize,
      widget_density: widgetDensity,
      focus_mode: focusMode,
    };
    const snapshot = serializeSnapshot(current);
    if (snapshot === lastSavedRef.current) return;

    const timeoutId = window.setTimeout(async () => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await settingsRepository.updateProfile({
          ui_theme: current.ui_theme,
          color_mode: current.color_mode,
          // Keep the legacy `theme` column in sync with day/night.
          theme: current.color_mode,
          font_size_pref: current.font_size_pref,
          widget_density: current.widget_density,
          focus_mode: current.focus_mode,
        });
        lastSavedRef.current = snapshot;
        // Refresh the profile cache so other consumers see the new values.
        queryClient.setQueryData<UserProfile | undefined>(
          ["profile"],
          (prev) => (prev ? { ...prev, ...current } : prev)
        );
      } catch (err) {
        // Non-fatal: localStorage still holds the user's choice for the current session.
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn("[SyncThemeFromProfile] Failed to persist theme preferences", err);
        }
      } finally {
        inFlightRef.current = false;
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [uiTheme, colorMode, fontSize, widgetDensity, focusMode, queryClient]);

  return null;
}
