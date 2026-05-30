import type { SignalSource } from "./types";

/** Hostname for favicon lookup — prefers `source.domain`, else parses `source.url`. */
export function signalSourceHostname(source: Pick<SignalSource, "domain" | "url">): string | null {
  const fromDomain = source.domain?.trim().toLowerCase().replace(/^www\./, "");
  if (fromDomain) return fromDomain;
  try {
    const host = new URL(source.url).hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Publisher favicon via Google's public s2 endpoint (same pattern as Vault library tools).
 * No API key; falls back to initials in the UI when the image fails to load.
 */
export function signalSourceIconUrl(
  source: Pick<SignalSource, "domain" | "url">,
  size = 32,
): string | null {
  const host = signalSourceHostname(source);
  if (!host) return null;
  const px = Math.min(128, Math.max(16, size));
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${px}`;
}
