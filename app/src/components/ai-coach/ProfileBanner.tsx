"use client";

import Link from "next/link";
import { UserCircle2, ArrowRight } from "lucide-react";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";

interface ProfileBannerProps {
  copy: AICoachCopy;
  editHref: string;
}

/**
 * Shown at the top of /career/coach when the user hasn't filled enough
 * of their career profile to get quality profile-context injection.
 */
export function ProfileBanner({ copy, editHref }: ProfileBannerProps) {
  return (
    <Link data-slot="project-surface"
      href={editHref}
      className="flex items-center gap-3 rounded-xl border bg-gradient-to-br from-violet-500/10 to-amber-500/10 p-3 text-sm transition-all hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-foreground/70">
        <UserCircle2 className="h-5 w-5" />
      </div>
      <span className="flex-1 text-foreground/90">
        {copy.profile.incompleteBanner}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
