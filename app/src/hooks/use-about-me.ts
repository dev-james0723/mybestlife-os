"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aboutMeRepository, type UpsertAboutMeInput } from "@/lib/repositories/about-me";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useAboutMe() {
  return useQuery({
    queryKey: ["about-me"],
    queryFn: aboutMeRepository.get,
  });
}

export function useUpsertAboutMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertAboutMeInput) => aboutMeRepository.upsert(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-me"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).aboutMe;
      toast.success(ui.toastProfileSaved);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).aboutMe;
      toast.error(ui.toastProfileSaveFailed);
    },
  });
}

export function useUploadAboutMeProfileImage() {
  const queryClient = useQueryClient();
  const locale = useAppStore((s) => s.language);
  const ui = useMemo(() => getMiscUiCopy(locale).aboutMe, [locale]);
  return useMutation({
    mutationFn: (file: File) => aboutMeRepository.uploadProfileImage(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about-me"] });
      toast.success(ui.toastProfileImageSaved);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_CREW_PROFILE_IMAGE_TYPE") {
        toast.error(ui.profileImageInvalidType);
        return;
      }
      if (msg === "CREW_PROFILE_IMAGE_TOO_LARGE") {
        toast.error(ui.profileImageTooLarge);
        return;
      }
      toast.error(ui.profileImageUploadFailed);
    },
  });
}
