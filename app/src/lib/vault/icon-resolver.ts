/**
 * Tiered icon resolver for the Software Vault autofill pipeline.
 *
 * Strategy (in order):
 *   1. If we already have a website URL, try `<link rel="icon|apple-touch-icon">`
 *      parsed out of the fetched HTML.
 *   2. Fall back to Google's `s2/favicons` endpoint (256px) — no API key, but the
 *      result is generic.
 *   3. As a last resort, return `null` so the UI can render a letter avatar.
 *
 * Brandfetch / Clearbit are opt-in and require API keys; respect env vars
 * `BRANDFETCH_CLIENT_ID` / `CLEARBIT_LOGO_KEY` if provided and attempt those
 * first (they give the best-looking logo).
 */
export type ResolvedIcon = {
  url: string;
  source: "brandfetch" | "clearbit" | "html" | "google" | "fallback";
};

const FETCH_TIMEOUT_MS = 6000;

function timeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

async function head(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: timeoutSignal(FETCH_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function domainFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function tryBrandfetch(domain: string): Promise<ResolvedIcon | null> {
  const clientId = process.env.BRANDFETCH_CLIENT_ID?.trim();
  if (!clientId) return null;
  const url = `https://cdn.brandfetch.io/${encodeURIComponent(domain)}/fallback/letter/theme/light/h/256?c=${encodeURIComponent(clientId)}`;
  if (await head(url)) return { url, source: "brandfetch" };
  return null;
}

async function tryClearbit(domain: string): Promise<ResolvedIcon | null> {
  if (!process.env.CLEARBIT_LOGO_KEY?.trim()) return null;
  const url = `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=256`;
  if (await head(url)) return { url, source: "clearbit" };
  return null;
}

async function parseHtmlForIcon(
  html: string,
  origin: string,
): Promise<string | null> {
  const linkMatches = Array.from(
    html.matchAll(
      /<link\s[^>]*rel=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    ),
  );
  const candidates: { rel: string; href: string; sizes: number }[] = [];
  for (const m of linkMatches) {
    const rel = (m[1] ?? "").toLowerCase();
    const href = m[2] ?? "";
    if (!href) continue;
    if (
      !rel.includes("icon") &&
      !rel.includes("apple-touch-icon") &&
      !rel.includes("mask-icon")
    ) {
      continue;
    }
    const sizesMatch = /sizes=["']?(\d+)x\d+/i.exec(m[0] ?? "");
    candidates.push({
      rel,
      href,
      sizes: sizesMatch ? Number.parseInt(sizesMatch[1] ?? "0", 10) : 0,
    });
  }
  candidates.sort((a, b) => b.sizes - a.sizes);
  for (const c of candidates) {
    try {
      const resolved = new URL(c.href, origin).toString();
      if (await head(resolved)) return resolved;
    } catch {
      /* skip */
    }
  }
  return null;
}

function googleFallback(domain: string): ResolvedIcon {
  return {
    url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`,
    source: "google",
  };
}

/** Resolves an icon for a given canonical website URL (or name-only if no URL). */
export async function resolveIcon(params: {
  websiteUrl: string | null;
  pageHtml?: string | null;
}): Promise<ResolvedIcon | null> {
  const { websiteUrl, pageHtml } = params;
  if (!websiteUrl) return null;
  const domain = domainFromUrl(websiteUrl);
  if (!domain) return null;

  const brandfetch = await tryBrandfetch(domain);
  if (brandfetch) return brandfetch;
  const clearbit = await tryClearbit(domain);
  if (clearbit) return clearbit;

  if (pageHtml) {
    try {
      const origin = new URL(websiteUrl).origin;
      const fromHtml = await parseHtmlForIcon(pageHtml, origin);
      if (fromHtml) return { url: fromHtml, source: "html" };
    } catch {
      /* ignore */
    }
  }

  return googleFallback(domain);
}
