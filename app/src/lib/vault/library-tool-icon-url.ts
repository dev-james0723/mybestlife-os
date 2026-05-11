import type { VaultLibraryTool } from "@/lib/vault/software-library-schema";

/**
 * Some product URLs sit on generic hosts (docs, learn.*). Point favicon lookup
 * at the consumer-facing domain so Google s2 returns a recognizable mark.
 */
const FAVICON_HOST_ALIASES: Record<string, string> = {
  "learn.microsoft.com": "microsoft.com",
};

function hostnameFromWebsiteUrl(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null;
  try {
    const host = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Public favicon URL for a library tool (high-res PNG via Google’s s2 service).
 * Uses the tool’s official `website_url` hostname so marks stay vendor-accurate.
 */
export function libraryToolIconUrl(tool: VaultLibraryTool): string | null {
  const explicit = tool.icon_url?.trim();
  if (explicit) return explicit;
  const rawHost = hostnameFromWebsiteUrl(tool.website_url);
  if (!rawHost) return null;
  const host = FAVICON_HOST_ALIASES[rawHost] ?? rawHost;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}
