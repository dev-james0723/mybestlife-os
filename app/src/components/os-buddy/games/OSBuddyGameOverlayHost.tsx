"use client";

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMiniGame } from "@/stores/os-buddy-store";
import type { OSBuddyPetId } from "@/types/os-buddy";
import { PlayFoodCatchOverlay } from "./PlayFoodCatchOverlay";
import { CleanDeskOverlay } from "./CleanDeskOverlay";
import { FocusTapOverlay } from "./FocusTapOverlay";

type OSBuddyGameOverlayHostProps = {
  open: boolean;
  activeGame: OSBuddyMiniGame | null;
  locale: AppLocale;
  petId: OSBuddyPetId;
  buddyName: string;
  onComplete: (game: OSBuddyMiniGame, score: number) => void;
  onClose: () => void;
};

export function OSBuddyGameOverlayHost({
  open,
  activeGame,
  locale,
  petId,
  buddyName,
  onComplete,
  onClose,
}: OSBuddyGameOverlayHostProps) {
  if (!open || activeGame == null || activeGame === "play-ball") return null;

  if (activeGame === "food-catch") {
    return (
      <PlayFoodCatchOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("food-catch", score)}
      />
    );
  }

  if (activeGame === "clean-desk") {
    return (
      <CleanDeskOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("clean-desk", score)}
      />
    );
  }

  if (activeGame === "focus-tap") {
    return (
      <FocusTapOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("focus-tap", score)}
      />
    );
  }

  return null;
}
