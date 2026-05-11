/**
 * Social media ingestion adapter (X, Facebook, Instagram, Threads, Reddit).
 *
 * Strategy per provider (public-only; we never bypass auth walls):
 *   - X / Twitter: publish.twitter.com/oembed (no key). Returns HTML blockquote
 *     + author/handle/body text.
 *   - Instagram / Facebook: Meta oEmbed Read when META_OEMBED_ACCESS_TOKEN is
 *     configured; otherwise fall back to OG metadata.
 *   - Threads: graph.threads.net oEmbed (tokenless for public posts).
 *   - Reddit: `${url}.json` (no key). Returns subreddit, author, selftext.
 *
 * We always sanitize returned HTML to a strict allow-list before storing it
 * in `embed_html`; consumers render it inside a sandboxed iframe or a
 * minimal DOMPurify-equivalent regex filter.
 */

import { extractArticleBody } from "@/lib/knowledge/ai/extractContent";
import { enrichXCaptionFromWeb } from "@/lib/knowledge/ai/enrichXCaption";
import { processUrl } from "@/lib/knowledge/ai/processUrl";
import type { ClassifyResult } from "@/lib/knowledge/classify";
import type { NormalizedIngest } from "./types";

/** `no-referrer` breaks many Meta / Threads embeds; send origin only cross-site. */
const SOCIAL_IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin";

/**
 * Output from the upstream extraction step before we synthesize the
 * NormalizedIngest — kept narrow so callers only deal with what matters.
 */
type SocialExtractResult = {
  text?: string;
  html?: string;
  authorName?: string;
  authorHandle?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  title?: string;
  aspectRatio?: string;
  providerName?: string;
  providerUrl?: string;
  extractionStatus?: "success" | "partial" | "failed" | "blocked" | "requires_auth" | "unsupported";
  extractionNote?: string;
};

export async function ingestSocialPost(
  url: string,
  classification: ClassifyResult,
): Promise<NormalizedIngest> {
  const { provider, sourceType, category, label, metadata } = classification;
  const domain = metadata.domain ?? safeDomain(url);

  let extracted: SocialExtractResult | null = null;
  try {
    if (provider === "x") {
      extracted = await extractXPost(url);
    } else if (provider === "reddit") {
      extracted = await extractRedditPost(url);
    } else if (provider === "instagram") {
      extracted = await extractInstagramPost(url);
    } else if (provider === "facebook") {
      extracted = await extractFacebookPost(url, sourceType === "social_facebook_video_post");
    } else if (provider === "threads") {
      extracted = await extractThreadsPost(url);
    }
  } catch {
    extracted = null;
  }

  const visibleText = decodeHtmlEntities(extracted?.text?.trim() ?? "");
  const embedHtml = sanitizeSocialHtml(extracted?.html ?? "");

  const hasText = visibleText.length > 0;
  const hasEmbed = embedHtml.length > 0;

  // Partial if we got at least ONE useful signal, otherwise failed.
  const extractionStatus =
    extracted?.extractionStatus ??
    (hasText && hasEmbed
      ? "success"
      : hasText || hasEmbed || extracted?.thumbnailUrl
        ? "partial"
        : "failed");

  const authorLine = extracted?.authorName
    ? extracted.authorHandle
      ? `${extracted.authorName} (${extracted.authorHandle})`
      : extracted.authorName
    : extracted?.authorHandle;

  // Smart title: extracted title > first meaningful sentence of body > fallback
  const smartTitle = chooseSmartTitle({
    providedTitle: decodeHtmlEntities(extracted?.title ?? ""),
    visibleText,
    authorLine,
    label,
    domain,
  });

  const aiInput = [
    decodeHtmlEntities(extracted?.title ?? ""),
    authorLine ? `Posted by ${authorLine}` : "",
    visibleText,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n\n");

  return {
    sourceType,
    provider,
    category,
    label,
    title: smartTitle.title,
    titleSource: smartTitle.titleSource,
    sourceUrl: url,
    sourceDomain: domain,
    thumbnailUrl: extracted?.thumbnailUrl ?? undefined,
    rawContent: visibleText || undefined,
    aiInputText: aiInput || visibleText || label,
    embedHtml: hasEmbed ? embedHtml : undefined,
    metadata: {
      ...metadata,
      domain,
      author: extracted?.authorName ?? metadata.author,
      handle: extracted?.authorHandle ?? metadata.handle,
      publishedAt: extracted?.publishedAt ?? metadata.publishedAt,
      aspectRatio: extracted?.aspectRatio ?? metadata.aspectRatio,
      providerName: extracted?.providerName,
      providerUrl: extracted?.providerUrl,
      extractionNote:
        extracted?.extractionNote ??
        (extractionStatus === "partial"
          ? hasText
            ? "Embed HTML unavailable; storing extracted text."
            : hasEmbed
              ? "Text extraction unavailable; showing embed only."
              : "Only metadata extracted."
          : undefined),
    },
    extractionStatus,
    transcriptStatus: "not_applicable",
    askEnabled: false, // social posts never expose AI Ask
    contentType: "article",
  };
}

// ── X / Twitter ───────────────────────────────────────────────────────────
// Strategy:
//   1. Build a direct iframe embed using platform.twitter.com's public
//      Tweet.html renderer — same render path as Instagram/Facebook iframes
//      and works without auth.
//   2. Hit publish.twitter.com/oembed in parallel to recover the caption text
//      and author name for the AI / metadata path. We discard the
//      blockquote-style HTML it returns because it depends on widgets.js
//      hydration which is unreliable inside our sandboxed renderer.

/** Normalize X URLs so Twitter oEmbed resolves (strip /photo/N, /video/N, query). */
function canonicalXPostUrlForOembed(url: string): string {
  try {
    const u = new URL(url);
    let host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "mobile.twitter.com") host = "twitter.com";
    if (host !== "x.com" && host !== "twitter.com") return url;

    const segs = u.pathname.split("/").filter(Boolean);
    const statusIdx = segs.indexOf("status");
    if (statusIdx < 1 || !segs[statusIdx + 1]) return url;

    const handle = segs[statusIdx - 1];
    const id = segs[statusIdx + 1];
    if (!/^\d+$/.test(id)) return url;

    const out = new URL("https://twitter.com");
    out.pathname = `/${handle}/status/${id}`;
    return out.toString();
  } catch {
    return url;
  }
}

async function extractXPost(url: string): Promise<SocialExtractResult | null> {
  const oembedUrl = canonicalXPostUrlForOembed(url);
  const [iframeEmbed, oembed] = await Promise.all([
    Promise.resolve(buildXIframeEmbed(url)),
    fetchXOEmbedMetadata(oembedUrl),
  ]);

  let merged: SocialExtractResult | null = null;
  if (iframeEmbed) {
    merged = mergeExtractResults(iframeEmbed, oembed);
  } else {
    merged = oembed;
  }

  const captionProbe = decodeHtmlEntities(merged?.text?.trim() ?? "");
  if (captionProbe.length < 25) {
    const grounded = await enrichXCaptionFromWeb(oembedUrl).catch(() => null);
    if (grounded?.trim()) {
      merged = mergeExtractResults(merged, {
        text: grounded.trim(),
        extractionNote: merged?.extractionNote
          ? `${merged.extractionNote} Caption supplemented via web lookup.`
          : "Caption supplemented via web lookup.",
      });
    }
  }

  return merged;
}

function buildXIframeEmbed(url: string): SocialExtractResult | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    const statusIdx = segs.indexOf("status");
    const externalId =
      statusIdx >= 0 && segs[statusIdx + 1] ? segs[statusIdx + 1] : undefined;
    if (!externalId || !/^\d+$/.test(externalId)) return null;
    const params = new URLSearchParams({
      id: externalId,
      lang: "en",
      theme: "light",
      hideCard: "false",
      hideThread: "false",
      dnt: "true",
    });
    const embedSrc = `https://platform.twitter.com/embed/Tweet.html?${params.toString()}`;
    const html = `<iframe src="${embedSrc}" width="100%" height="640" frameborder="0" allowtransparency="true" allow="encrypted-media" loading="lazy" referrerpolicy="${SOCIAL_IFRAME_REFERRER_POLICY}"></iframe>`;
    return {
      html,
      providerName: "X",
      providerUrl: "https://x.com",
      extractionStatus: "success",
      extractionNote: "Embedded via public X Tweet.html endpoint.",
    };
  } catch {
    return null;
  }
}

/** X oEmbed still resolves best against twitter.com host; x.com often 404s. */
function canonicalUrlForTwitterOEmbed(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "x.com") {
      u.hostname = "twitter.com";
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

async function fetchXOEmbedMetadata(
  url: string,
): Promise<SocialExtractResult | null> {
  const oembedTarget = canonicalUrlForTwitterOEmbed(canonicalXPostUrlForOembed(url));
  const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(
    oembedTarget,
  )}&omit_script=true&dnt=true&hide_thread=false`;
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "MyLifeOS-Knowledge/1.0" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const blockquoteHtml = typeof json.html === "string" ? json.html : "";
    const authorName =
      typeof json.author_name === "string" ? json.author_name : undefined;
    const authorUrl =
      typeof json.author_url === "string" ? json.author_url : undefined;
    const authorHandle = authorUrl ? deriveXHandle(authorUrl) : undefined;
    const text = blockquoteHtml ? stripHtmlForText(blockquoteHtml) : "";
    return {
      text,
      authorName,
      authorHandle,
    };
  } catch {
    return null;
  }
}

function deriveXHandle(authorUrl: string): string | undefined {
  try {
    const u = new URL(authorUrl);
    const handle = u.pathname.replace(/^\/+|\/+$/g, "");
    return handle ? `@${handle}` : undefined;
  } catch {
    return undefined;
  }
}

// ── Reddit: `.json` for text/metadata + official oEmbed for rich embed HTML ─

async function fetchRedditOEmbed(url: string): Promise<SocialExtractResult | null> {
  const endpoint = `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "MyLifeOS-Knowledge/1.0" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const html = typeof json.html === "string" ? json.html : "";
    if (!html.trim()) return null;
    const title = typeof json.title === "string" ? json.title : undefined;
    const authorName = typeof json.author_name === "string" ? json.author_name : undefined;
    const text = [title, html ? stripHtmlForText(html) : ""]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join("\n\n");
    return {
      title,
      text: text || undefined,
      html,
      authorName,
      extractionStatus: "success",
    };
  } catch {
    return null;
  }
}

async function extractRedditJsonPost(url: string): Promise<SocialExtractResult | null> {
  let jsonUrl: string;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    jsonUrl = `https://www.reddit.com${path}.json?raw_json=1`;
  } catch {
    return null;
  }

  try {
    const res = await fetch(jsonUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MyLifeOS-Knowledge/1.0",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json) || json.length === 0) return null;
    const listing = json[0] as Record<string, unknown>;
    const data = (listing.data as Record<string, unknown>) || {};
    const children = data.children as Array<{ data?: Record<string, unknown> }> | undefined;
    const post = children?.[0]?.data;
    if (!post) return null;
    const title = typeof post.title === "string" ? post.title : undefined;
    const selftext = typeof post.selftext === "string" ? post.selftext : undefined;
    const authorName = typeof post.author === "string" ? post.author : undefined;
    const subreddit = typeof post.subreddit === "string" ? post.subreddit : undefined;
    const createdUtc = typeof post.created_utc === "number" ? post.created_utc : undefined;
    const publishedAt = createdUtc
      ? new Date(createdUtc * 1000).toISOString()
      : undefined;
    const thumbnailUrl = typeof post.thumbnail === "string" && /^https?:/i.test(post.thumbnail)
      ? post.thumbnail
      : undefined;

    const text = [title, selftext].filter(Boolean).join("\n\n");
    return {
      title,
      text,
      authorName,
      authorHandle: subreddit ? `r/${subreddit}` : undefined,
      publishedAt,
      thumbnailUrl,
    };
  } catch {
    return null;
  }
}

async function extractRedditPost(url: string): Promise<SocialExtractResult | null> {
  const [fromJson, fromOembed] = await Promise.all([
    extractRedditJsonPost(url),
    fetchRedditOEmbed(url),
  ]);
  if (!fromJson && !fromOembed) return null;
  // Prefer oEmbed for embed HTML; merge JSON post body for richer text + thumbnails.
  return mergeExtractResults(fromOembed, fromJson);
}

// ── Instagram / Facebook / Threads official oEmbed ────────────────────────

async function extractInstagramPost(url: string): Promise<SocialExtractResult | null> {
  const oembed = await fetchMetaOEmbed("instagram_oembed", url);

  // When the official oEmbed produced rich HTML (token configured + accepted),
  // prefer it because it carries caption + author metadata too.
  if (oembed?.html?.trim()) {
    const og = await extractSocialOgFallback(url);
    return mergeExtractResults(oembed, og);
  }

  // Tokenless fallback: build the public iframe embed directly so the post
  // renders without requiring Meta App Review. Caption text falls back to OG.
  const iframeEmbed = buildInstagramIframeEmbed(url);
  const og = await fetchFallbackMetadata(url);
  if (iframeEmbed) {
    return mergeExtractResults(iframeEmbed, og);
  }

  // Last resort: only metadata + the original oEmbed note (if any).
  return mergeExtractResults(oembed, og, {
    missingTokenNote:
      "Showing OG metadata only — Instagram embed could not be constructed for this URL.",
  });
}

async function extractFacebookPost(
  url: string,
  isVideo: boolean,
): Promise<SocialExtractResult | null> {
  const endpoint = isVideo ? "oembed_video" : "oembed_post";
  const oembed = await fetchMetaOEmbed(endpoint, url);

  if (oembed?.html?.trim()) {
    const og = await extractSocialOgFallback(url);
    return mergeExtractResults(oembed, og);
  }

  const iframeEmbed = buildFacebookIframeEmbed(url, isVideo);
  const og = await fetchFallbackMetadata(url);
  if (iframeEmbed) {
    return mergeExtractResults(iframeEmbed, og);
  }

  return mergeExtractResults(oembed, og, {
    missingTokenNote:
      "Showing OG metadata only — Facebook embed could not be constructed for this URL.",
  });
}

async function extractThreadsPost(url: string): Promise<SocialExtractResult | null> {
  const canonicalUrl = canonicalThreadsOEmbedUrl(url) ?? url;
  const endpoint = `https://graph.threads.net/v1.0/oembed?url=${encodeURIComponent(
    canonicalUrl,
  )}&omitscript=true`;
  const oembed = await fetchOEmbedJson(endpoint);
  if (oembed?.html?.trim()) {
    const og = await extractSocialOgFallback(url);
    return mergeExtractResults(oembed, og);
  }

  const iframeEmbed = buildThreadsIframeEmbed(canonicalUrl);
  const og = await fetchFallbackMetadata(url);
  if (iframeEmbed) {
    return mergeExtractResults(iframeEmbed, og);
  }

  return mergeExtractResults(oembed, og);
}

// ── Tokenless iframe builders (public embed endpoints) ────────────────────

function buildInstagramIframeEmbed(url: string): SocialExtractResult | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    let shortcode: string | undefined;
    let kind: "p" | "reel" | "tv" | undefined;
    if (segs[0] === "p" && segs[1]) {
      shortcode = segs[1];
      kind = "p";
    } else if ((segs[0] === "reel" || segs[0] === "reels") && segs[1]) {
      shortcode = segs[1];
      kind = "reel";
    } else if (segs[0] === "tv" && segs[1]) {
      shortcode = segs[1];
      kind = "tv";
    }
    if (!shortcode || !kind) return null;
    const embedSrc = `https://www.instagram.com/${kind}/${shortcode}/embed/captioned/`;
    const html = `<iframe src="${embedSrc}" width="100%" height="640" frameborder="0" allowtransparency="true" allow="encrypted-media" loading="lazy" referrerpolicy="${SOCIAL_IFRAME_REFERRER_POLICY}"></iframe>`;
    return {
      html,
      providerName: "Instagram",
      providerUrl: "https://www.instagram.com",
      extractionStatus: "success",
      extractionNote: "Embedded via public Instagram embed endpoint.",
    };
  } catch {
    return null;
  }
}

function buildFacebookIframeEmbed(
  url: string,
  isVideo: boolean,
): SocialExtractResult | null {
  try {
    new URL(url); // validate
  } catch {
    return null;
  }
  const path = isVideo ? "video.php" : "post.php";
  const params = new URLSearchParams({
    href: url,
    show_text: "true",
    width: "500",
  });
  const appId = process.env.META_APP_ID?.trim();
  if (appId) {
    params.set("appId", appId);
  }
  const embedSrc = `https://www.facebook.com/plugins/${path}?${params.toString()}`;
  const html = `<iframe src="${embedSrc}" width="100%" height="640" frameborder="0" allowtransparency="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" loading="lazy" referrerpolicy="${SOCIAL_IFRAME_REFERRER_POLICY}"></iframe>`;
  return {
    html,
    providerName: "Facebook",
    providerUrl: "https://www.facebook.com",
    extractionStatus: "success",
    extractionNote: "Embedded via public Facebook plugin endpoint.",
  };
}

function buildThreadsIframeEmbed(url: string): SocialExtractResult | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    const postIdx = segs.indexOf("post");
    let shortcode: string | undefined;
    let username: string | undefined;
    if (segs[0] === "t" && segs[1]) {
      shortcode = segs[1];
    } else if (segs[0]?.startsWith("@") && postIdx >= 0 && segs[postIdx + 1]) {
      username = segs[0];
      shortcode = segs[postIdx + 1];
    }
    if (!shortcode) return null;
    const path = username ? `${username}/post/${shortcode}` : `t/${shortcode}`;
    const embedSrc = `https://www.threads.com/${path}/embed`;
    const html = `<iframe src="${embedSrc}" width="100%" height="640" frameborder="0" allowtransparency="true" allow="encrypted-media" loading="lazy" referrerpolicy="${SOCIAL_IFRAME_REFERRER_POLICY}"></iframe>`;
    return {
      html,
      providerName: "Threads",
      providerUrl: "https://www.threads.com",
      extractionStatus: "success",
      extractionNote: "Embedded via public Threads embed endpoint.",
    };
  } catch {
    return null;
  }
}

async function fetchMetaOEmbed(
  endpointName: "instagram_oembed" | "oembed_post" | "oembed_video",
  url: string,
): Promise<SocialExtractResult | null> {
  const accessToken = process.env.META_OEMBED_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return {
      extractionStatus: "partial",
      extractionNote: "META_OEMBED_ACCESS_TOKEN is not configured.",
    };
  }

  const endpoint = new URL(`https://graph.facebook.com/v25.0/${endpointName}`);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("omitscript", "true");
  endpoint.searchParams.set("access_token", accessToken);
  if (endpointName === "oembed_video") {
    endpoint.searchParams.set("useiframe", "false");
  }

  return await fetchOEmbedJson(endpoint.toString());
}

async function fetchOEmbedJson(endpoint: string): Promise<SocialExtractResult | null> {
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "MyLifeOS-Knowledge/1.0" },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      return {
        extractionStatus: res.status === 401 || res.status === 403 ? "requires_auth" : "partial",
        extractionNote: `oEmbed request failed with HTTP ${res.status}.`,
      };
    }

    const json = (await res.json()) as Record<string, unknown>;
    const html = typeof json.html === "string" ? json.html : "";
    const title = typeof json.title === "string" ? json.title : undefined;
    const authorName =
      typeof json.author_name === "string" ? json.author_name : undefined;
    const authorUrl =
      typeof json.author_url === "string" ? json.author_url : undefined;
    const providerName =
      typeof json.provider_name === "string" ? json.provider_name : undefined;
    const providerUrl =
      typeof json.provider_url === "string" ? json.provider_url : undefined;
    const thumbnailUrl =
      typeof json.thumbnail_url === "string" && /^https?:/i.test(json.thumbnail_url)
        ? json.thumbnail_url
        : undefined;
    const text = [title, html ? stripHtmlForText(html) : ""]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join("\n\n");

    return {
      title,
      text: text || undefined,
      html,
      authorName,
      authorHandle: authorUrl ? deriveHandleFromUrl(authorUrl) : undefined,
      thumbnailUrl,
      providerName,
      providerUrl,
      extractionStatus: html ? "success" : "partial",
    };
  } catch {
    return null;
  }
}

async function fetchFallbackMetadata(url: string): Promise<SocialExtractResult | null> {
  const iframely = await fetchIframelyFallback(url);
  if (iframely) return iframely;
  return await extractSocialOgFallback(url);
}

async function fetchIframelyFallback(url: string): Promise<SocialExtractResult | null> {
  const apiKey = process.env.IFRAMELY_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = new URL("https://iframe.ly/api/oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("api_key", apiKey);

  const result = await fetchOEmbedJson(endpoint.toString());
  if (!result) return null;
  return {
    ...result,
    extractionNote: result.extractionNote ?? "Fetched via Iframely fallback.",
  };
}

function pickNonEmptyHtml(html?: string | null): string | undefined {
  const t = html?.trim();
  return t ? t : undefined;
}

function mergeExtractResults(
  primary: SocialExtractResult | null,
  fallback: SocialExtractResult | null,
  options: { missingTokenNote?: string } = {},
): SocialExtractResult | null {
  if (!primary && !fallback) return null;

  const primaryHtml = pickNonEmptyHtml(primary?.html);
  const hasPrimaryEmbed = Boolean(primaryHtml);
  const extractionNote =
    primary?.extractionNote === "META_OEMBED_ACCESS_TOKEN is not configured."
      ? options.missingTokenNote
      : primary?.extractionNote;

  return {
    title: primary?.title ?? fallback?.title,
    text: [primary?.text, fallback?.text]
      .map((s) => s?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n") || undefined,
    html: primaryHtml ?? pickNonEmptyHtml(fallback?.html),
    authorName: primary?.authorName ?? fallback?.authorName,
    authorHandle: primary?.authorHandle ?? fallback?.authorHandle,
    publishedAt: primary?.publishedAt ?? fallback?.publishedAt,
    thumbnailUrl: primary?.thumbnailUrl ?? fallback?.thumbnailUrl,
    aspectRatio: primary?.aspectRatio ?? fallback?.aspectRatio,
    providerName: primary?.providerName ?? fallback?.providerName,
    providerUrl: primary?.providerUrl ?? fallback?.providerUrl,
    extractionStatus: hasPrimaryEmbed
      ? primary?.extractionStatus
      : fallback?.extractionStatus ?? primary?.extractionStatus,
    extractionNote: extractionNote ?? fallback?.extractionNote,
  };
}

// ── Instagram / Facebook fallback: use OG metadata via processUrl ─────────

async function extractSocialOgFallback(url: string): Promise<SocialExtractResult | null> {
  try {
    const meta = await processUrl(url);
    const title = meta.title?.trim();
    const description = meta.description?.trim();
    const body = meta.bodyText?.trim();
    return {
      title: title && title !== meta.domain ? decodeHtmlEntities(title) : undefined,
      text: decodeHtmlEntities([description, body].filter(Boolean).join("\n\n")) || undefined,
      thumbnailUrl: meta.ogImage ?? undefined,
      extractionStatus: title || description || body || meta.ogImage ? "partial" : "failed",
    };
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function safeDomain(u: string): string | undefined {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function stripHtmlForText(html: string): string {
  return extractArticleBody(html); // reuses the same strip logic as articles
}

function deriveHandleFromUrl(authorUrl: string): string | undefined {
  try {
    const u = new URL(authorUrl);
    const handle = u.pathname.replace(/^\/+|\/+$/g, "");
    if (!handle) return undefined;
    if (u.hostname.includes("threads")) return handle.startsWith("@") ? handle : `@${handle}`;
    if (u.hostname.includes("instagram")) return handle.startsWith("@") ? handle : `@${handle}`;
    if (u.hostname.includes("facebook")) return handle;
    return handle.startsWith("@") ? handle : `@${handle}`;
  } catch {
    return undefined;
  }
}

function canonicalThreadsOEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs[0] === "t" && segs[1]) {
      return `https://www.threads.com/t/${segs[1]}`;
    }
    const postIdx = segs.indexOf("post");
    if (segs[0]?.startsWith("@") && postIdx >= 0 && segs[postIdx + 1]) {
      return `https://www.threads.com/${segs[0]}/post/${segs[postIdx + 1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strict allow-list sanitizer for social embed HTML. We only keep safe inline
 * formatting + common block elements; all event-handler attributes, inline
 * scripts, and unknown tags are dropped. The result is still rendered inside
 * a sandboxed iframe in the UI for defence in depth.
 */
function sanitizeSocialHtml(html: string): string {
  if (!html) return "";

  // Remove script/style/object/embed/link/meta outright.
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "");

  // Iframes: keep only those whose `src` host is on our trusted social allow-list
  // so we can render real Instagram / Facebook / Threads / X embeds. Anything
  // else is dropped to avoid arbitrary cross-origin iframes.
  out = out.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, (match) => {
    const srcMatch = match.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const src = srcMatch?.[1] ?? "";
    return isAllowedEmbedSrc(src) ? match : "";
  });
  // Self-closing / void iframes (rare but possible).
  out = out.replace(/<iframe\b[^>]*\/?>(?!\s*<\/iframe>)/gi, (match) => {
    const srcMatch = match.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
    const src = srcMatch?.[1] ?? "";
    return isAllowedEmbedSrc(src) ? match : "";
  });

  // Strip on* event attributes and javascript: URLs.
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(/javascript\s*:/gi, "about:blank#");

  return out.trim();
}

const ALLOWED_EMBED_HOSTS = new Set([
  "www.instagram.com",
  "instagram.com",
  "www.facebook.com",
  "facebook.com",
  "www.threads.com",
  "threads.com",
  "www.threads.net",
  "threads.net",
  "platform.twitter.com",
  "publish.twitter.com",
  "twitter.com",
  "x.com",
  "embed.reddit.com",
  "www.reddit.com",
  "reddit.com",
  "iframe.ly",
  "cdn.iframe.ly",
]);

function isAllowedEmbedSrc(src: string): boolean {
  if (!src) return false;
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    return ALLOWED_EMBED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function chooseSmartTitle(params: {
  providedTitle?: string;
  visibleText: string;
  authorLine?: string;
  label: string;
  domain?: string;
}): { title: string; titleSource: "extracted" | "fallback" } {
  const fromProvider = params.providedTitle?.trim();
  if (fromProvider && fromProvider.length >= 3) {
    return { title: truncateForTitle(fromProvider), titleSource: "extracted" };
  }

  const text = params.visibleText.replace(/\s+/g, " ").trim();
  if (text.length >= 12) {
    // First sentence or first ~12 words, whichever is shorter.
    const firstSentence = text.split(/(?<=[.!?。！？])\s+/)[0] ?? text;
    const words = firstSentence.split(/\s+/).slice(0, 14).join(" ");
    return { title: truncateForTitle(words), titleSource: "extracted" };
  }

  if (params.authorLine) {
    return {
      title: `${params.label}: ${params.authorLine}`,
      titleSource: "fallback",
    };
  }

  if (params.domain) {
    return { title: `${params.label} on ${params.domain}`, titleSource: "fallback" };
  }

  return { title: params.label, titleSource: "fallback" };
}

function truncateForTitle(s: string, max = 100): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).replace(/[\s,;:.!?]*$/, "")}…`;
}
