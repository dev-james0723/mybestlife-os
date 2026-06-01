"use client";

import { Leaf } from "lucide-react";

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketDreamSmallestVersion } from "@/types/bucket-list";

/** The smallest livable version of the dream the user could start soon. */
export function DreamSmallVersions({
  smallestVersion,
  copy,
}: {
  smallestVersion: BucketDreamSmallestVersion;
  copy: BucketListUiCopy;
}) {
  return (
    <section className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Leaf className="h-4 w-4 text-emerald-500" />
        {copy.smallestHeading}
      </h3>
      <p className="text-sm font-medium">{smallestVersion.title}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {smallestVersion.description}
      </p>
      {smallestVersion.estimatedCost != null || smallestVersion.timeRequired ? (
        <div className="mt-2 flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          {smallestVersion.estimatedCost != null ? (
            <span>
              {copy.smallestCost}: ≈ {smallestVersion.estimatedCost}
            </span>
          ) : null}
          {smallestVersion.timeRequired ? (
            <span>
              {copy.smallestTime}: {smallestVersion.timeRequired}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
