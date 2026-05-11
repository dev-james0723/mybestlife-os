/**
 * Server-only HTML fetcher for the Software Vault autofill pipeline.
 * Applies an SSRF allowlist (public HTTP(S) only), a hard timeout, a body
 * size cap, and strips tracking cookies from the response. Used to collect
 * title/meta/favicon hints before invoking the LLM.
 */

const MAX_HTML_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 8000;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
];

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname));
}

export function isValidPublicUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/^https?:$/i.test(u.protocol)) return false;
    if (!u.hostname) return false;
    if (isPrivateHostname(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export type PageMeta = {
  url: string;
  title: string | null;
  description: string | null;
  html: string;
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function extractTag(html: string, regex: RegExp): string | null {
  const match = regex.exec(html);
  if (!match) return null;
  const raw = (match[1] ?? "").trim();
  if (!raw) return null;
  return decodeHtmlEntities(raw).slice(0, 400);
}

export async function fetchPageMeta(rawUrl: string): Promise<PageMeta | null> {
  if (!isValidPublicUrl(rawUrl)) return null;
  const res = await fetch(rawUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; MyLifeOSVaultBot/1.0; +https://mylifeos.app)",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  }).catch(() => null);

  if (!res || !res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;

  // Guard against huge pages.
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_HTML_BYTES) {
    const chunk = buf.slice(0, MAX_HTML_BYTES);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(chunk);
    return extractMeta(res.url, text);
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  return extractMeta(res.url, text);
}

function extractMeta(url: string, html: string): PageMeta {
  const title =
    extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ??
    extractTag(
      html,
      /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    );
  const description =
    extractTag(
      html,
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
    ) ??
    extractTag(
      html,
      /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
    );
  return { url, title, description, html };
}
