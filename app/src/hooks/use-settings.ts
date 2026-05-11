"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  settingsRepository,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
} from "@/lib/repositories/settings";
import { getSettingsUiCopy } from "@/lib/i18n/settings-ui";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";
import { getOnboardingSaveErrorHint, logSupabaseClientError } from "@/lib/utils/onboarding-save-error-hint";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: settingsRepository.getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => settingsRepository.updateProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const ui = getSettingsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastPreferencesSaved);
    },
    onError: (err) => {
      const locale = useAppStore.getState().language;
      const ui = getSettingsUiCopy(locale);
      const themeUi = getThemeUiCopy(locale);
      const hint = getOnboardingSaveErrorHint(err, themeUi);
      logSupabaseClientError("useUpdateProfile", err);
      toast.error(ui.toastPreferencesFailed, hint ? { description: hint } : undefined);
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: settingsRepository.getNotificationPreferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      settingsRepository.updateNotificationPreferences(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      const ui = getSettingsUiCopy(useAppStore.getState().language);
      toast.success(ui.toastNotificationsSaved);
    },
    onError: () => {
      const ui = getSettingsUiCopy(useAppStore.getState().language);
      toast.error(ui.toastNotificationsFailed);
    },
  });
}

export function useUploadProfileAvatar() {
  const queryClient = useQueryClient();
  const locale = useAppStore((s) => s.language);
  const ui = useMemo(() => getSettingsUiCopy(locale), [locale]);
  return useMutation({
    mutationFn: (file: File) => settingsRepository.uploadProfileAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(ui.profileAvatarSavedToast);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_AVATAR_TYPE") {
        toast.error(ui.profileAvatarInvalidType);
        return;
      }
      if (msg === "AVATAR_TOO_LARGE") {
        toast.error(ui.profileAvatarTooLarge);
        return;
      }
      toast.error(ui.profileAvatarUploadFailedToast);
    },
  });
}
