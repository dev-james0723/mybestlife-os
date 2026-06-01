"use client";

import { ArrowRight } from "lucide-react";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem, BucketReflection } from "@/types/bucket-list";

/**
 * Before / after: the dream's original "why it matters" next to the AI's
 * interpretation of what changed. Only renders when both sides exist.
 */
export function DreamBeforeAfterReflection({
  item,
  reflection,
  copy,
}: {
  item: BucketItem;
  reflection: BucketReflection;
  copy: BucketListUiCopy;
}) {
  const before = item.why_this_matters?.trim();
  const after = reflection.ai_memory?.whatChanged?.trim();
  if (!before || !after) return null;

  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">{copy.beforeAfterHeading}</h3>
      <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.beforeLabel}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{before}</p>
        </div>
        <div className="hidden items-center justify-center sm:flex">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-lg bg-lime-400/10 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-lime-600">
            {copy.afterLabel}
          </p>
          <p className="mt-1 text-[13px]">{after}</p>
        </div>
      </div>
    </section>
  );
}
