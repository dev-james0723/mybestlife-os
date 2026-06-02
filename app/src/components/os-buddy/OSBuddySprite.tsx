"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getOSBuddyPet } from "@/lib/os-buddy/os-buddy-pets";
import { useSsrSafeReducedMotion } from "@/hooks/use-ssr-safe-reduced-motion";
import type { MotionProps } from "framer-motion";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type OSBuddySpriteProps = {
  petId: OSBuddyPetId;
  name: string;
  mood: OSBuddyMood;
  animationSrc: string;
  size?: "sm" | "md" | "lg";
  isDragging?: boolean;
  isBirthdayMode?: boolean;
};

const SIZE_CLASSES: Record<NonNullable<OSBuddySpriteProps["size"]>, string> = {
  sm: "w-[48px] sm:w-[56px]",
  md: "w-[58px] sm:w-[74px]",
  lg: "w-[68px] sm:w-[86px]",
};

export function OSBuddySprite({
  petId,
  name,
  mood,
  animationSrc,
  size = "md",
  isDragging = false,
  isBirthdayMode = false,
}: OSBuddySpriteProps) {
  const [imageState, setImageState] = useState({ key: "", index: 0 });
  const pet = getOSBuddyPet(petId);
  const reducedMotion = useSsrSafeReducedMotion(false);
  const imageCandidates = useMemo(() => {
    if (!isBirthdayMode) return [animationSrc];
    return [
      `${pet.assetBasePath}/birthday.webp`,
      `${pet.assetBasePath}/jumping.gif`,
      animationSrc,
    ];
  }, [animationSrc, isBirthdayMode, pet.assetBasePath]);
  const imageKey = `${petId}:${imageCandidates.join("|")}`;
  const imageIndex = imageState.key === imageKey ? imageState.index : 0;
  const currentSrc = imageCandidates[imageIndex] ?? null;

  const motionProps: MotionProps = reducedMotion
    ? {
        animate: {
          opacity: mood === "sleepy" ? 0.78 : 1,
          scale: isDragging ? 1.02 : 1,
        },
        transition: { duration: 0.18 },
      }
    : {
        animate:
          mood === "idle"
            ? { y: [0, -2, 0] }
            : mood === "thinking"
              ? { y: [0, -4, 0] }
              : mood === "creating"
                ? { y: [0, -5, 0], rotate: [0, -2, 2, 0] }
                : mood === "reading"
                  ? { x: [0, -2, 2, 0] }
                  : mood === "success"
                    ? { y: [0, -8, 0], scale: [1, 1.04, 1] }
                    : mood === "error"
                      ? { x: [-2, 2, -2, 0] }
                      : mood === "sleepy"
                        ? { opacity: [0.82, 0.68, 0.82], scale: [1, 0.98, 1] }
                        : mood === "playful"
                          ? { y: [0, -6, 0], rotate: [0, 4, -2, 0] }
                          : mood === "focused"
                            ? { scale: 1 }
                            : mood === "celebrating"
                              ? { y: [0, -10, 0], rotate: [0, -4, 4, 0] }
                              : { scale: isDragging ? 1.03 : 1 },
        transition:
          mood === "idle"
            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const }
            : mood === "sleepy"
              ? { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const }
              : mood === "focused"
                ? { duration: 0.2 }
                : { duration: 0.52, ease: "easeOut" as const },
      };

  return (
    <motion.div
      className={cn(
        "os-buddy-sprite relative inline-flex items-end justify-center",
        SIZE_CLASSES[size],
        isDragging && "scale-[1.03]",
        isBirthdayMode && "os-buddy-sprite--birthday",
      )}
      data-mood={mood}
      aria-label={`${name}, your OS Buddy`}
      {...motionProps}
    >
      {currentSrc == null ? (
        <span className="os-buddy-sprite-fallback" aria-hidden>
          {pet.fallbackEmoji}
        </span>
      ) : (
        <img
          src={currentSrc}
          alt={`${name}, your OS Buddy`}
          className="os-buddy-sprite-img"
          onError={() =>
            setImageState({
              key: imageKey,
              index: imageIndex + 1,
            })
          }
          draggable={false}
        />
      )}
      {isBirthdayMode ? (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 rounded-sm border bg-background px-1 text-[10px] leading-4 shadow-sm"
        >
          *
        </span>
      ) : null}
    </motion.div>
  );
}
