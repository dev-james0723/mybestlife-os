"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
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
  onExitComplete?: () => void;
};

export function OSBuddyGameOverlayHost({
  open,
  activeGame,
  locale,
  petId,
  buddyName,
  onComplete,
  onClose,
  onExitComplete,
}: OSBuddyGameOverlayHostProps) {
  const reduceMotion = useReducedMotion();
  const showOverlay = open && activeGame != null && activeGame !== "play-ball";
  const [enteredGame, setEnteredGame] = useState<OSBuddyMiniGame | null>(null);
  let overlay: ReactNode = null;

  useEffect(() => {
    if (!showOverlay || activeGame == null) return;
    const frame = window.requestAnimationFrame(() => {
      setEnteredGame(activeGame);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeGame, showOverlay]);

  const handleExitComplete = () => {
    setEnteredGame(null);
    onExitComplete?.();
  };

  if (showOverlay && activeGame === "food-catch") {
    overlay = (
      <PlayFoodCatchOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("food-catch", score)}
      />
    );
  }

  if (showOverlay && activeGame === "clean-desk") {
    overlay = (
      <CleanDeskOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("clean-desk", score)}
      />
    );
  }

  if (showOverlay && activeGame === "focus-tap") {
    overlay = (
      <FocusTapOverlay
        locale={locale}
        petId={petId}
        buddyName={buddyName}
        onClose={onClose}
        onComplete={(score) => onComplete("focus-tap", score)}
      />
    );
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
      {showOverlay && overlay ? (
        <motion.div
          key={activeGame}
          data-os-buddy-game-overlay={activeGame}
          className="pointer-events-none fixed inset-0 z-[118] overflow-hidden"
          initial={false}
          animate={
            reduceMotion || enteredGame !== activeGame
              ? { opacity: enteredGame === activeGame ? 1 : 0, y: reduceMotion ? 0 : "100%" }
              : { opacity: 1, y: 0 }
          }
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "100%" }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 430, damping: 42, mass: 0.9 }
          }
        >
          {overlay}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
