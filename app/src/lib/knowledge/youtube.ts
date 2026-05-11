/** YouTube video IDs are 11 characters from this set. */
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function isValidVideoId(id: string | undefined | null): id is string {
  return !!id && VIDEO_ID_RE.test(id);
}

/**
 * Extracts the YouTube video id from common watch / shorts / embed / youtu.be URLs.
 */
export function extractYouTubeVideoId(inputUrl: string): string | null {
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return isValidVideoId(id) ? id : null;
    }

    if (!host.endsWith("youtube.com")) return null;

    const fromQuery = url.searchParams.get("v");
    if (isValidVideoId(fromQuery)) return fromQuery;

    const parts = url.pathname.split("/").filter(Boolean);
    for (const key of ["embed", "shorts", "live"] as const) {
      const i = parts.indexOf(key);
      if (i >= 0 && isValidVideoId(parts[i + 1])) return parts[i + 1]!;
    }

    return null;
  } catch {
    return null;
  }
}

/** Highest-quality static thumbnail URL (may 404 for very old videos; browser can fall back). */
export function youTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

export function youTubeThumbnailUrlFromPageUrl(pageUrl: string): string | null {
  const id = extractYouTubeVideoId(pageUrl);
  return id ? youTubeThumbnailUrl(id) : null;
}

export function isYouTubePageUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/** Canonical watch URL for Gemini / oEmbed (stable video id). */
export function canonicalYouTubeWatchUrl(pageUrl: string): string | null {
  const id = extractYouTubeVideoId(pageUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export type YouTubeOEmbed = {
  title: string;
  author_name?: string;
  thumbnail_url?: string;
  description?: string;
};

/** Public metadata (no API key). Description is often empty in oEmbed but title/author are reliable. */
export async function fetchYouTubeOEmbed(pageUrl: string): Promise<YouTubeOEmbed | null> {
  const canonical = canonicalYouTubeWatchUrl(pageUrl) ?? pageUrl.trim();
  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as Record<string, unknown>;
    const title = typeof j.title === "string" ? j.title.trim() : "";
    if (!title) return null;
    const author_name = typeof j.author_name === "string" ? j.author_name.trim() : undefined;
    const thumbnail_url =
      typeof j.thumbnail_url === "string" ? j.thumbnail_url.trim() : undefined;
    const description = typeof j.description === "string" ? j.description.trim() : undefined;
    return { title, author_name, thumbnail_url, description };
  } catch {
    return null;
  }
}

/** Plaintext block for AI / storage from oEmbed (YouTube HTML fetch is not usable). */
export function buildYouTubeContextFromOEmbed(
  pageUrl: string,
  oembed: YouTubeOEmbed,
): string {
  const lines = [
    `Video URL: ${canonicalYouTubeWatchUrl(pageUrl) ?? pageUrl}`,
    `Title: ${oembed.title}`,
    oembed.author_name ? `Channel: ${oembed.author_name}` : "",
    oembed.description ? `YouTube description:\n${oembed.description}` : "",
  ].filter(Boolean);
  return lines.join("\n\n");
}
