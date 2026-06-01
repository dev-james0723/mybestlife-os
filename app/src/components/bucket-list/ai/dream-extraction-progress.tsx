"use client";

import { Loader2, Sparkles } from "lucide-react";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";

export function DreamExtractionProgress({ copy }: { copy: BucketListUiCopy }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="relative">
        <Sparkles className="h-8 w-8 text-lime-500" />
        <Loader2 className="absolute -right-3 -top-3 h-4 w-4 animate-spin text-muted-foreground" />
      </div>
      <p className="text-base font-medium">{copy.aiExtractingTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {copy.aiExtractingSubtitle}
      </p>
    </div>
  );
}
