/**
 * Knowledge Base files live in a private Storage bucket. `<img src>` cannot use
 * `getPublicUrl` — use same-origin proxy URLs instead (see `/api/knowledge-files/[...path]`).
 */

/** Build the app-relative URL that streams an authenticated object from `knowledge-files`. */
export function knowledgeFilesProxyUrlFromStoragePath(storagePath: string): string {
  const segments = storagePath
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
  return `/api/knowledge-files/${segments}`;
}

export type KnowledgeFileImageTransform = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

export const KNOWLEDGE_CARD_IMAGE_TRANSFORM: Required<KnowledgeFileImageTransform> = {
  width: 640,
  height: 400,
  quality: 70,
  resize: "cover",
};

export const KNOWLEDGE_DETAIL_IMAGE_TRANSFORM: Required<KnowledgeFileImageTransform> = {
  width: 960,
  height: 540,
  quality: 72,
  resize: "cover",
};

export function isKnowledgeFilesProxyUrl(url: string | undefined | null): boolean {
  return typeof url === "string" && url.trim().startsWith("/api/knowledge-files/");
}

export function knowledgeFilesProxyUrlWithTransform(
  url: string,
  transform: KnowledgeFileImageTransform,
): string {
  if (!isKnowledgeFilesProxyUrl(url)) return url;

  try {
    const parsed = new URL(url, "http://local.knowledge");
    if (transform.width) parsed.searchParams.set("w", String(transform.width));
    if (transform.height) parsed.searchParams.set("h", String(transform.height));
    if (transform.quality) parsed.searchParams.set("q", String(transform.quality));
    if (transform.resize) parsed.searchParams.set("resize", transform.resize);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

/**
 * Rewrite legacy Supabase public/sign URLs for `knowledge-files` into proxy URLs so images load.
 */
export function rewriteStoredKnowledgeThumbnailUrl(
  url: string | undefined | null,
): string | undefined {
  if (url == null || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("/api/knowledge-files/")) return trimmed;

  const m = /\/storage\/v1\/object\/(?:public|sign)\/knowledge-files\/([^?]+)/.exec(trimmed);
  if (!m?.[1]) return trimmed;

  try {
    const rawPath = decodeURIComponent(m[1]!);
    return knowledgeFilesProxyUrlFromStoragePath(rawPath);
  } catch {
    return trimmed;
  }
}
