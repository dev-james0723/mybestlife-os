/**
 * DuckDuckGo search via lite HTML (preferred) and classic /html fallback.
 * Classic /html often returns a bot challenge for datacenter IPs; lite usually still serves results.
 */

export const DUCKDUCKGO_HTML_SEARCH_TIMEOUT_MS = 6000;
export const DUCKDUCKGO_LITE_SEARCH_TIMEOUT_MS = 7000;
export const URL_HEAD_REACHABILITY_TIMEOUT_MS = 4000;

export type SearchHit = { title: string; url: string; snippet: string };

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractUddgParam(href: string): string | null {
  const qIdx = href.indexOf("?");
  if (qIdx < 0) return null;
  const p = new URLSearchParams(href.slice(qIdx + 1));
  const uddg = p.get("uddg");
  if (!uddg) return null;
  try {
    return decodeURIComponent(uddg);
  } catch {
    return uddg;
  }
}

export function normalizeSearchHref(href: string): string | null {
  if (!href) return null;
  let h = href;
  if (h.startsWith("//")) h = `https:${h}`;
  if (h.includes("duckduckgo.com/l/?") || h.startsWith("/l/?")) {
    return extractUddgParam(h);
  }
  if (/^https?:\/\//i.test(h)) return h;
  return null;
}

function isLikelySponsoredLiteHref(href: string, decoded: string): boolean {
  const blob = `${href} ${decoded}`.toLowerCase();
  return (
    blob.includes("bing.com/aclick") ||
    blob.includes("ad_domain=") ||
    blob.includes("duckduckgo.com/y.js") ||
    blob.includes("/y.js?") ||
    blob.includes("click_metadata")
  );
}

function isDuckDuckGoBotWall(html: string): boolean {
  return (
    html.includes("anomaly-modal") ||
    html.includes("Unfortunately, bots use DuckDuckGo too")
  );
}

/**
 * Parses lite.duckduckgo.com HTML — more reliable than /html for server-side requests.
 */
export async function searchDuckDuckGoLite(
  query: string,
  options?: { timeoutMs?: number; maxHits?: number },
): Promise<SearchHit[]> {
  const timeoutMs =
    options?.timeoutMs ?? DUCKDUCKGO_LITE_SEARCH_TIMEOUT_MS;
  const maxHits = options?.maxHits ?? 8;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (isDuckDuckGoBotWall(html)) return [];

    const out: SearchHit[] = [];
    const seen = new Set<string>();
    const patterns = [
      /<a\s[^>]*href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi,
      /<a\s[^>]*class=['"]result-link['"][^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    ];

    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        let rawHref = m[1] ?? "";
        if (rawHref.startsWith("//")) rawHref = `https:${rawHref}`;
        const decoded = normalizeSearchHref(rawHref);
        if (!decoded || seen.has(decoded) || !/^https?:\/\//i.test(decoded))
          continue;
        if (isLikelySponsoredLiteHref(rawHref, decoded)) continue;

        const title = decodeHtmlEntities(stripHtmlTags(m[2] ?? "")).trim();
        if (!title || /^more info$/i.test(title)) continue;

        seen.add(decoded);
        out.push({ title, url: decoded, snippet: "" });
        if (out.length >= maxHits) return out;
      }
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGoHtmlClassic(
  query: string,
  options?: { timeoutMs?: number; maxHits?: number },
): Promise<SearchHit[]> {
  const timeoutMs =
    options?.timeoutMs ?? DUCKDUCKGO_HTML_SEARCH_TIMEOUT_MS;
  const maxHits = options?.maxHits ?? 8;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const endpoint = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(endpoint, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (isDuckDuckGoBotWall(html)) return [];

    const out: SearchHit[] = [];
    const seen = new Set<string>();

    const resultBlocks = html.split(/class="result\s/);
    for (const block of resultBlocks.slice(1)) {
      const linkMatch = block.match(
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!linkMatch) continue;
      const href = normalizeSearchHref(linkMatch[1] ?? "");
      if (!href || seen.has(href) || !/^https?:\/\//i.test(href)) continue;
      const title = decodeHtmlEntities(stripHtmlTags(linkMatch[2] ?? "")).trim();
      if (!title) continue;

      const snippetMatch = block.match(
        /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\//i,
      );
      const snippet = snippetMatch
        ? decodeHtmlEntities(stripHtmlTags(snippetMatch[1] ?? "")).trim()
        : "";

      seen.add(href);
      out.push({ title, url: href, snippet });
      if (out.length >= maxHits) break;
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Web search hits — tries DuckDuckGo Lite first, then classic HTML.
 */
export async function searchDuckDuckGo(
  query: string,
  options?: { timeoutMs?: number; maxHits?: number },
): Promise<SearchHit[]> {
  const lite = await searchDuckDuckGoLite(query, options);
  if (lite.length > 0) return lite;
  return searchDuckDuckGoHtmlClassic(query, options);
}

async function tryHeadReachable(
  url: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });
    const s = res.status;
    return (
      (s >= 200 && s < 400) ||
      s === 405 ||
      s === 403 ||
      s === 401 ||
      s === 429 ||
      s === 416
    );
  } catch {
    return false;
  }
}

async function tryGetReachable(
  url: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Range: "bytes=0-0",
      },
    });
    const s = res.status;
    return (
      (s >= 200 && s < 400) ||
      s === 405 ||
      s === 403 ||
      s === 401 ||
      s === 429 ||
      s === 416
    );
  } catch {
    return false;
  }
}

export async function isUrlReachable(
  url: string,
  options?: { timeoutMs?: number },
): Promise<boolean> {
  const timeoutMs =
    options?.timeoutMs ?? URL_HEAD_REACHABILITY_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const perTry = Math.max(2500, Math.floor(timeoutMs * 0.85));
  try {
    const headOk = await tryHeadReachable(url, perTry, controller.signal);
    if (headOk) return true;
    return await tryGetReachable(url, perTry, controller.signal);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
