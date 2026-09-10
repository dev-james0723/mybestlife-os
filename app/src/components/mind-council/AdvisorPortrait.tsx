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
  /** Approximate rendered size in CSS pixels, used for next/image sizes. */
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
  // A failed image must not poison the next advisor when this instance is reused.
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const [from, to] = skill.avatarGradient;
  const accessibleName = alt ?? skill.lensTitle;

  if (!portraitPath || failedPath === portraitPath) {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white/90 ring-1 ring-white/10",
          rounded,
          className,
        )}
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        role={accessibleName ? "img" : undefined}
        aria-label={accessibleName || undefined}
        aria-hidden={accessibleName ? undefined : true}
      >
        <User className="h-5 w-5" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        // A plain inline span ignores width/height, collapsing a fill image to zero.
        "relative inline-flex shrink-0 overflow-hidden ring-1 ring-white/10",
        rounded,
        className,
      )}
    >
      <Image
        src={portraitPath}
        alt={accessibleName}
        fill
        sizes={`${Math.max(pixelSize, 32)}px`}
        className="object-cover object-[center_20%]"
        onError={() => setFailedPath(portraitPath)}
      />
    </span>
  );
}
