"use client";

import { Info, Sparkles } from "lucide-react";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketReflection } from "@/types/bucket-list";

/**
 * "What this dream changed" — the user's own words plus the AI's tentative
 * interpretation. Framed as "this may suggest…", never "this proves".
 */
export function DreamChangedMePanel({
  reflection,
  copy,
}: {
  reflection: BucketReflection;
  copy: BucketListUiCopy;
}) {
  const memory = reflection.ai_memory;
  if (!reflection.changed_me && !memory) return null;

  return (
    <section className="space-y-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-400/5 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-fuchsia-500" />
        {copy.changedMeHeading}
      </h3>

      {reflection.changed_me ? (
        <p className="text-[13px]">{reflection.changed_me}</p>
      ) : null}

      {memory ? (
        <div className="space-y-1">
          <p className="text-[13px] text-muted-foreground">{memory.whatChanged}</p>
          {memory.whatLearned ? (
            <p className="text-[13px]">
              <span className="font-medium">{copy.memoryWhatLearned}: </span>
              <span className="text-muted-foreground">{memory.whatLearned}</span>
            </p>
          ) : null}
          {memory.whatUnlocked ? (
            <p className="text-[13px]">
              <span className="font-medium">{copy.memoryWhatUnlocked}: </span>
              <span className="text-muted-foreground">{memory.whatUnlocked}</span>
            </p>
          ) : null}
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="h-3 w-3" />
            {copy.memoryInterpretNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}
