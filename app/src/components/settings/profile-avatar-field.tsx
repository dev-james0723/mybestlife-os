"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, AvatarBadge } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SettingsUiCopy } from "@/lib/i18n/settings-ui";
import type { UseMutationResult } from "@tanstack/react-query";
import type { UserProfile } from "@/types/database";

type UploadMutation = UseMutationResult<UserProfile, unknown, File, unknown>;

type ProfileAvatarFieldProps = {
  profile: UserProfile;
  ui: SettingsUiCopy;
  uploadAvatar: UploadMutation;
};

export function ProfileAvatarField({ profile, ui, uploadAvatar }: ProfileAvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = () => {
    inputRef.current?.click();
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadAvatar.mutate(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={onPick}
        disabled={uploadAvatar.isPending}
        aria-label={ui.profileAvatarAriaLabel}
        title={ui.profileAvatarAriaLabel}
        className={cn(
          "group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          uploadAvatar.isPending && "pointer-events-none opacity-60"
        )}
      >
        <Avatar className="size-24 ring-2 ring-border">
          <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="bg-muted">
            <UserRound className="size-10 text-muted-foreground" aria-hidden />
          </AvatarFallback>
          <AvatarBadge
            className="size-8 border-2 border-background bg-primary text-primary-foreground shadow-sm [&>svg]:size-4"
            aria-hidden
          >
            <Camera />
          </AvatarBadge>
        </Avatar>
      </button>
    </div>
  );
}
