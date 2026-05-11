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
