"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getOSBuddyPet } from "@/lib/os-buddy/os-buddy-pets";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type OSBuddySpriteProps = {
  petId: OSBuddyPetId;
  name: string;
  mood: OSBuddyMood;
  animationSrc: string;
  size?: "sm" | "md" | "lg";
  isDragging?: boolean;
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
}: OSBuddySpriteProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const pet = getOSBuddyPet(petId);

  useEffect(() => {
    setHasImageError(false);
  }, [animationSrc, petId]);

  return (
    <div
      className={cn(
        "relative inline-flex items-end justify-center",
        SIZE_CLASSES[size],
        isDragging && "scale-[1.03]",
      )}
      data-mood={mood}
      aria-label={`${name}, your OS Buddy`}
    >
      {hasImageError ? (
        <span className="text-4xl sm:text-5xl leading-none" aria-hidden>
          {pet.fallbackEmoji}
        </span>
      ) : (
        <img
          src={animationSrc}
          alt={`${name}, your OS Buddy`}
          className="os-buddy-sprite-img"
          onError={() => setHasImageError(true)}
          draggable={false}
        />
      )}
    </div>
  );
}
