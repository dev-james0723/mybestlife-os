"use client";

import { useMemo } from "react";
import type { BucketDreamImage, BucketItem } from "@/types/bucket-list";
import { resolveBucketDreamImage } from "@/lib/bucket-list/resolve-bucket-dream-image";

/**
 * Memoized dream cover — same URL/alt for card, list thumb, and detail hero.
 */
export function useBucketDreamImage(item: BucketItem | null | undefined): BucketDreamImage | null {
  return useMemo(() => {
    if (!item) return null;
    return resolveBucketDreamImage(item);
  }, [
    item?.id,
    item?.cover_image_url,
    item?.title,
    item?.type,
    item?.description,
    item?.why_this_matters,
    item?.destination_name,
    item?.destination_city,
    item?.destination_country,
    item?.category_tags,
  ]);
}
