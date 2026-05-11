/**
 * Article ingestion adapter.
 *
 * Wraps the existing `processUrl` helper with extraction-status tracking and
 * degrades gracefully when the upstream page blocks fetches (CDN 403, 404,
 * timeouts). We never throw — every path returns a usable NormalizedIngest.
 */

import { processUrl } from "@/lib/knowledge/ai/processUrl";
import type { NormalizedIngest } from "./types";
import { degradedResult } from "./types";

export async function ingestArticle(url: string): Promise<NormalizedIngest> {
  const domain = safeDomain(url);

  let urlMeta: Awaited<ReturnType<typeof processUrl>> | null = null;
  try {
    urlMeta = await processUrl(url);
  } catch {
    // fall through; we'll produce a degraded card below
  }

  if (!urlMeta) {
    return degradedResult({
      sourceType: "article_url",
      provider: "web",
      category: "article",
      label: "Article",
      title: fallbackTitleFromUrl(url),
      sourceUrl: url,
      domain,
      metadata: { domain },
      extractionStatus: "failed",
      askEnabled: true,
      contentType: "article",
    });
  }

  const hasBody = (urlMeta.bodyText ?? "").trim().length >= 200;
  const hasTitle = Boolean((urlMeta.title ?? "").trim());
  const hasMeta = Boolean((urlMeta.description ?? "").trim() || urlMeta.ogImage);

  const extractionStatus = hasBody
    ? "success"
    : hasTitle || hasMeta
      ? "partial"
      : "failed";

  const aiInput = [
    urlMeta.title,
    urlMeta.description,
    urlMeta.bodyText,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join("\n\n");

  const rawContent = urlMeta.bodyText?.trim() || urlMeta.description?.trim() || "";

  return {
    sourceType: "article_url",
    provider: "web",
    category: "article",
    label: "Article",
    title: hasTitle ? urlMeta.title : fallbackTitleFromUrl(url),
    titleSource: hasTitle ? "extracted" : "fallback",
    sourceUrl: url,
    sourceDomain: urlMeta.domain || domain,
    thumbnailUrl: urlMeta.ogImage ?? undefined,
    rawContent: rawContent || undefined,
    aiInputText: aiInput || undefined,
    metadata: {
      domain: urlMeta.domain || domain,
      canonicalUrl: url,
    },
    extractionStatus,
    transcriptStatus: "not_applicable",
    askEnabled: hasBody || hasMeta,
    contentType: "article",
  };
}

function safeDomain(u: string): string | undefined {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function fallbackTitleFromUrl(u: string): string {
  const d = safeDomain(u);
  if (!d) return "Article";
  return `Article from ${d}`;
}
