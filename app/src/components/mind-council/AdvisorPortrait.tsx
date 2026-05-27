"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { MindSkill } from "@/lib/mind-council/types";
import { getAdvisorPortraitPath } from "@/lib/mind-council/advisor-portraits";

type AdvisorPortraitProps = {
  skill: MindSkill;
  /** Tailwind size classes, e.g. "h-12 w-12" */
  className?: string;
  /** Approximate rendered size in CSS pixels — feeds `next/image`'s `sizes`. */
  pixelSize?: number;
  rounded?: string;
  alt?: string;
};

export function AdvisorPortrait({
  skill,
  className = "h-12 w-12",
  pixelSize = 48,
  rounded = "rounded-xl",
  alt,
}: AdvisorPortraitProps) {
  const portraitPath = getAdvisorPortraitPath(skill.skillId);
  const [errored, setErrored] = useState(false);
  const [from, to] = skill.avatarGradient;

  if (!portraitPath || errored) {
    return (
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden text-white/90 ring-1 ring-white/10",
          rounded,
          className,
        )}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        <User className="h-5 w-5" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative shrink-0 overflow-hidden ring-1 ring-white/10",
        rounded,
        className,
      )}
    >
      <Image
        src={portraitPath}
        alt={alt ?? skill.lensTitle}
        fill
        sizes={`${Math.max(pixelSize, 32)}px`}
        className="object-cover object-[center_20%]"
        onError={() => setErrored(true)}
      />
    </span>
  );
}
