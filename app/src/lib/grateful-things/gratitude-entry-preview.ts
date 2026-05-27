import { normalizeStoredRichText, stripHtml } from "@/lib/utils/html";

const PREVIEW_MAX_LEN = 140;

/** Shorter cap for heart card — ~2 lines in the narrow clipped interior. */
export const HEART_PREVIEW_MAX_LEN = 72;

export function getGratitudeHeartCardPreview(
  content: string | null | undefined,
  imageFallback: string,
  emptyFallback: string,
): string {
  const normalizedContent = normalizeStoredRichText(content);
  let plain = stripHtml(normalizedContent).replace(/\s+/g, " ").trim();
  if (!plain && /<img\b/i.test(normalizedContent)) {
    plain = imageFallback;
  }
  const previewSource = plain || emptyFallback || "Gratitude memory";
  return previewSource.length > HEART_PREVIEW_MAX_LEN
    ? `${previewSource.slice(0, HEART_PREVIEW_MAX_LEN)}…`
    : previewSource;
}

/** Plain-text card preview; never returns raw or escaped HTML. */
export function getGratitudeEntryPreview(
  content: string | null | undefined,
  imageFallback: string,
): string {
  const normalizedContent = normalizeStoredRichText(content);
  let plain = stripHtml(normalizedContent);
  if (!plain && /<img\b/i.test(normalizedContent)) {
    plain = imageFallback;
  }
  if (!plain) return "";
  return plain.length > PREVIEW_MAX_LEN
    ? `${plain.slice(0, PREVIEW_MAX_LEN)}…`
    : plain;
}

export function getGratitudeThumbnailUrl(
  entry: { photo_url: string | null; thumbnail_url?: string | null },
): string | null {
  return entry.thumbnail_url ?? entry.photo_url ?? null;
}
