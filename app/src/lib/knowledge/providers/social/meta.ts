/**
 * MetaEmbedProvider — Instagram + Facebook (post + video).
 *
 * Returns `renderMode: "authenticated_preview"` and `screenshotRequested: true`
 * because Meta's iframe HTML, even when valid, won't render inside our
 * `allow-scripts` sandbox (widgets.js relies on document.domain + cross-origin
 * postMessage). The cascade chains `ScreenshotSnapshotProvider` to fill in
 * the visual.
 *
 * Endpoints used (require user-connected Meta token):
 *   - Instagram:    graph.facebook.com/v19.0/instagram_oembed
 *   - Facebook post: graph.facebook.com/v19.0/oembed_post
 *   - Facebook video: graph.facebook.com/v19.0/oembed_video
 *
 * Error subcode mapping (per Meta API docs):
 *   - subcode 1357007    → login_required
 *   - code 100 / sub 33  → api_permission_missing
 *   - code 200 / sub 458 → app_review_required (dev-mode token + non-tester)
 *   - code 4 / HTTP 429  → rate_limited
 *   - HTTP 404 / 410     → deleted_or_unavailable
 */

import type { ClassifyResult } from "@/lib/knowledge/classify";
import type {
  PreviewStatus,
} from "@/types/knowledge-source";
import { markStatus } from "@/lib/social/connection-store";
import {
  makeFailureResult,
  type ProviderContext,
  type SocialProvider,
} from "../registry";
import type { NormalizedIngest } from "../types";

const META_OEMBED_HOST = "https://graph.facebook.com/v19.0";

type MetaOEmbedResponse = {
  type?: string;
  version?: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  width?: number;
  height?: number;
  html?: string;
  // Error envelope
  error?: {
    code?: number;
    error_subcode?: number;
    message?: string;
    type?: string;
  };
};

function pickEndpoint(classification: ClassifyResult): string | null {
  switch (classification.sourceType) {
    case "social_instagram_post":
    case "social_instagram_reel":
      return `${META_OEMBED_HOST}/instagram_oembed`;
    case "social_facebook_post":
      return `${META_OEMBED_HOST}/oembed_post`;
    case "social_facebook_video_post":
      return `${META_OEMBED_HOST}/oembed_video`;
    default:
      return null;
  }
}

function mapMetaError(httpStatus: number, error?: MetaOEmbedResponse["error"]): PreviewStatus {
  if (httpStatus === 429 || error?.code === 4) return "rate_limited";
  if (httpStatus === 404 || httpStatus === 410) return "deleted_or_unavailable";

  const sub = error?.error_subcode;
  const code = error?.code;
  if (sub === 1357007) return "login_required";
  if (code === 100 && sub === 33) return "api_permission_missing";
  if (code === 200 && sub === 458) return "app_review_required";
  if (httpStatus === 401 || httpStatus === 403) return "api_permission_missing";

  return "extraction_failed";
}

function deriveHandle(authorUrl?: string): string | undefined {
  if (!authorUrl) return undefined;
  try {
    const u = new URL(authorUrl);
    const handle = u.pathname.replace(/^\/+|\/+$/g, "");
    return handle ? `@${handle}` : undefined;
  } catch {
    return undefined;
  }
}

export const MetaEmbedProviderImpl: SocialProvider = {
  name: "meta",
  priority: 30,
  requiresAuth: true,
  match: (_url, c) =>
    c.provider === "instagram" || c.provider === "facebook",
  async extract(url, ctx: ProviderContext): Promise<NormalizedIngest> {
    const connection = ctx.connection;
    if (!connection) {
      // Cascade should never call us without a connection (requiresAuth: true),
      // but be defensive.
      return makeFailureResult({
        classification: ctx.classification,
        url,
        previewStatus: "api_permission_missing",
        errorMessage: "No Meta connection available.",
      });
    }

    const endpoint = pickEndpoint(ctx.classification);
    if (!endpoint) {
      return makeFailureResult({
        classification: ctx.classification,
        url,
        previewStatus: "unsupported_url",
        errorMessage: `MetaEmbedProvider: no endpoint for ${ctx.classification.sourceType}`,
      });
    }

    const apiUrl =
      `${endpoint}?url=${encodeURIComponent(url)}` +
      `&access_token=${encodeURIComponent(connection.accessToken)}` +
      `&omitscript=true`;

    let res: Response;
    try {
      res = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "MyLifeOS-Knowledge/1.0",
        },
        signal: AbortSignal.timeout(ctx.timeoutMs),
      });
    } catch (err) {
      return makeFailureResult({
        classification: ctx.classification,
        url,
        previewStatus: "extraction_failed",
        errorMessage: err instanceof Error ? err.message : "fetch_failed",
      });
    }

    let json: MetaOEmbedResponse;
    try {
      json = (await res.json()) as MetaOEmbedResponse;
    } catch {
      return makeFailureResult({
        classification: ctx.classification,
        url,
        previewStatus: "extraction_failed",
        errorMessage: "Non-JSON response from Meta oEmbed.",
      });
    }

    if (!res.ok || json.error) {
      const status = mapMetaError(res.status, json.error);
      // Mark connection state so the UI can prompt "Reconnect".
      if (
        status === "login_required" ||
        status === "api_permission_missing" ||
        status === "app_review_required"
      ) {
        try {
          await markStatus(connection.userId, "meta", "expired");
        } catch {
          // best-effort
        }
      }
      return makeFailureResult({
        classification: ctx.classification,
        url,
        previewStatus: status,
        errorMessage: json.error?.message ?? `http_${res.status}`,
      });
    }

    // Success — build authenticated_preview result.
    const authorHandle = deriveHandle(json.author_url);
    const bodyText = json.title?.trim() ?? "";
    const authorLine = json.author_name?.trim();
    const aiInput = [bodyText, authorLine ? `Posted by ${authorLine}` : ""]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const ingest: NormalizedIngest = {
      sourceType: ctx.classification.sourceType,
      provider: ctx.classification.provider,
      category: ctx.classification.category,
      label: ctx.classification.label,
      title: json.title?.trim() || ctx.classification.label,
      titleSource: json.title ? "extracted" : "fallback",
      sourceUrl: url,
      sourceDomain: ctx.classification.metadata.domain,
      thumbnailUrl: json.thumbnail_url,
      rawContent: bodyText || undefined,
      aiInputText: aiInput || ctx.classification.label,
      metadata: {
        ...ctx.classification.metadata,
        author: json.author_name,
        handle: authorHandle,
        providerName: json.provider_name,
        providerUrl: json.provider_url,
        aspectRatio:
          json.width && json.height
            ? `${json.width}/${json.height}`
            : ctx.classification.metadata.aspectRatio,
      },
      extractionStatus: "success",
      transcriptStatus: "not_applicable",
      askEnabled: false,
      contentType: "social",
      // Cascade-aware fields
      renderMode: "authenticated_preview",
      previewStatus: "authenticated_data_success",
      checkedAt: new Date().toISOString(),
      authorName: json.author_name,
      authorHandle,
      // The HTML is intentionally not used as embedHtml — it won't render
      // in our sandbox. We keep it in rawProviderPayload for debugging.
      rawProviderPayload: json,
      // Ask the cascade to chain a snapshot to fill in the visual.
      screenshotRequested: true,
    };

    return ingest;
  },
};
