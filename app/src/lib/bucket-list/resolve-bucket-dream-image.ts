import type { BucketDreamImage, BucketItem } from "@/types/bucket-list";
import {
  DREAM_IMAGE_GLOBAL_FALLBACK,
  DREAM_IMAGE_RULES,
  DREAM_IMAGE_TYPE_FALLBACKS,
} from "@/lib/bucket-list/dream-image-catalog";

const imageCache = new Map<string, BucketDreamImage>();

function cacheKey(item: BucketItem): string {
  return [
    item.id,
    item.cover_image_url ?? "",
    item.title,
    item.type,
    item.destination_name ?? "",
    item.destination_country ?? "",
    item.category_tags.join(","),
  ].join("|");
}

/** Text corpus used for keyword matching. */
export function buildDreamImageSearchText(item: BucketItem): string {
  return [
    item.title,
    item.description ?? "",
    item.why_this_matters ?? "",
    item.destination_name ?? "",
    item.destination_city ?? "",
    item.destination_country ?? "",
    ...item.category_tags,
  ]
    .join(" ")
    .toLowerCase();
}

function altFromTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Dream cover image";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function fromStoredUrl(item: BucketItem): BucketDreamImage | null {
  const url = item.cover_image_url?.trim();
  if (!url) return null;
  return {
    url,
    alt: altFromTitle(item.title),
    sourceType: "api",
  };
}

/**
 * Pick the best static catalog image for a dream.
 * Priority: explicit DB url → keyword rules → type fallback → global fallback.
 */
export function resolveBucketDreamImage(item: BucketItem): BucketDreamImage {
  const key = cacheKey(item);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const stored = fromStoredUrl(item);
  if (stored) {
    imageCache.set(key, stored);
    return stored;
  }

  const text = buildDreamImageSearchText(item);
  let best: BucketDreamImage | null = null;
  let bestScore = -1;

  for (const rule of DREAM_IMAGE_RULES) {
    if (rule.types && !rule.types.includes(item.type)) continue;

    const hits = rule.patterns.filter((p) => p.test(text)).length;
    if (hits === 0) continue;

    const score = hits * 10 + (rule.priority ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = rule.image;
    }
  }

  const resolved =
    best ??
    DREAM_IMAGE_TYPE_FALLBACKS[item.type] ??
    DREAM_IMAGE_GLOBAL_FALLBACK;

  imageCache.set(key, resolved);
  return resolved;
}

/** Clear in-memory cache (tests). */
export function clearBucketDreamImageCache(): void {
  imageCache.clear();
}

/** Attach resolved `image` for consumers that want the nested shape. */
export function withBucketDreamImage<T extends BucketItem>(
  item: T,
): T & { image: BucketDreamImage } {
  return { ...item, image: resolveBucketDreamImage(item) };
}
