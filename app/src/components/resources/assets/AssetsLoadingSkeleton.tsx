"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

type AssetsLoadingSkeletonProps = {
  count?: number;
};

/**
 * Loading skeleton that mirrors the AssetCard shape exactly (pill + title +
 * two field rows), so the transition to real data doesn't cause layout shift.
 */
export function AssetsLoadingSkeleton({ count = 6 }: AssetsLoadingSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className="flex h-full flex-col gap-3 p-4"
          aria-hidden
        >
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="size-4 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/5" />
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
