"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyPetId } from "@/types/os-buddy";
import type { OSBuddyMiniGame } from "@/stores/os-buddy-store";
import { PixelCatchGame } from "./PixelCatchGame";
import { FocusTapGame } from "./FocusTapGame";
import { CleanDeskGame } from "./CleanDeskGame";

type OSBuddyMiniGameModalProps = {
  open: boolean;
  game: OSBuddyMiniGame | null;
  locale: AppLocale;
  petId: OSBuddyPetId;
  buddyName: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (game: OSBuddyMiniGame, score: number) => void;
};

export function OSBuddyMiniGameModal({
  open,
  game,
  locale,
  petId,
  buddyName,
  onOpenChange,
  onComplete,
}: OSBuddyMiniGameModalProps) {
  const zh = locale === "zh-TW";

  const title =
    game === "play-ball"
      ? "Play Ball"
      : game === "pixel-catch"
      ? "Pixel Catch"
      : game === "focus-tap"
        ? "Focus Tap"
        : "Clean the Desk";

  const description =
    game === "play-ball"
      ? zh
        ? "和小夥伴玩球。"
        : "Play ball with your buddy."
      : game === "pixel-catch"
      ? zh
        ? "接住掉落的星星。"
        : "Catch the falling stars."
      : game === "focus-tap"
        ? zh
          ? "在正確時機點擊。"
          : "Tap at the right moment."
        : zh
          ? "幫小夥伴整理桌面。"
          : "Help your buddy tidy the desk.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {game === "pixel-catch" ? (
          <PixelCatchGame
            petId={petId}
            buddyName={buddyName}
            locale={locale}
            onComplete={(score) => onComplete("pixel-catch", score)}
          />
        ) : null}

        {game === "focus-tap" ? (
          <FocusTapGame
            petId={petId}
            buddyName={buddyName}
            locale={locale}
            onComplete={(score) => onComplete("focus-tap", score)}
          />
        ) : null}

        {game === "clean-desk" ? (
          <CleanDeskGame
            petId={petId}
            buddyName={buddyName}
            locale={locale}
            onComplete={(score) => onComplete("clean-desk", score)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
