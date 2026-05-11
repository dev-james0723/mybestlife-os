/**
 * Provider cascade — the entry point that replaces the if/else dispatch in
 * `mutations.ts`. Tries every matching provider in priority order until one
 * returns a success render mode; falls through to a clear "unavailable"
 * result if everything fails.
 *
 * Design reference: `app/docs/social-provider-design.md`.
 *
 * Wave 2 limitations (filled in by later tasks):
 *   - No connection store yet (Task #6) → providers with `requiresAuth`
 *     always see `connection: null` and are skipped.
 *   - No real screenshot service yet (Task #5) → ScreenshotService throws.
 *   - Snapshot chain after `authenticated_preview` is wired but the snapshot
 *     provider stub returns failure, so the cascade falls through to the
 *     next provider (typically GenericMetadataProvider).
 */

import type { ClassifyResult } from "@/lib/knowledge/classify";
import type {
  OAuthProvider,
  PreviewStatus,
  RenderMode,
} from "@/types/knowledge-source";
import { isOAuthProvider } from "@/types/knowledge-source";
import { getConnection } from "@/lib/social/connection-store";
import type { DecryptedConnection } from "@/types/social-connections";
import {
  REGISTRY,
  ScreenshotSnapshotProvider,
  defaultTimeoutFor,
  isSuccessRenderMode,
  makeFailureResult,
  NOOP_SCREENSHOT_SERVICE,
  type ProviderContext,
  type SocialProvider,
} from "./registry";
import type { NormalizedIngest } from "./types";

export type CascadeOptions = {
  userId: string;
  classification: ClassifyResult;
  /** Profile / UI locale, used as default targetLanguage downstream. */
  locale: string;
};

type Breadcrumb = {
  provider: string;
  status: PreviewStatus;
  msg?: string;
};

/**
 * Run every provider that matches `url` in priority order. Returns the first
 * success result; if none, returns an `unavailable` result that names every
 * provider that was tried.
 */
export async function runProviderCascade(
  rawUrl: string,
  opts: CascadeOptions,
): Promise<NormalizedIngest> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return makeFailureResult({
      classification: opts.classification,
      url: rawUrl,
      previewStatus: "unsupported_url",
      errorMessage: "Invalid URL.",
    });
  }

  const candidates = REGISTRY
    .filter((p) => safeMatch(p, url, opts.classification))
    .slice() // copy before sort
    .sort((a, b) => a.priority - b.priority);

  if (candidates.length === 0) {
    return makeFailureResult({
      classification: opts.classification,
      url: rawUrl,
      previewStatus: "unsupported_url",
      errorMessage: `No provider matched ${url.hostname}.`,
    });
  }

  const errors: Breadcrumb[] = [];

  for (const provider of candidates) {
    // Connection lookup — Wave 2 always returns null. Task #6 wires this up.
    const connection = provider.requiresAuth ? await loadConnection(opts.userId, provider.name) : null;

    if (provider.requiresAuth && !connection) {
      errors.push({ provider: provider.name, status: "api_permission_missing" });
      continue;
    }

    const ctx: ProviderContext = {
      userId: opts.userId,
      connection,
      locale: opts.locale,
      timeoutMs: defaultTimeoutFor(provider.name),
      screenshot: NOOP_SCREENSHOT_SERVICE,
      classification: opts.classification,
      rawUrl,
    };

    let result: NormalizedIngest;
    try {
      result = await provider.extract(rawUrl, ctx);
    } catch (err) {
      errors.push({
        provider: provider.name,
        status: "extraction_failed",
        msg: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    if (provider.healthCheck && !provider.healthCheck(result)) {
      errors.push({ provider: provider.name, status: "extraction_failed", msg: "healthCheck failed" });
      continue;
    }

    const mode: RenderMode = result.renderMode ?? "unavailable";

    if (isSuccessRenderMode(mode)) {
      // Snapshot chain: providers can request a screenshot follow-up to fill
      // in the visual (used by MetaEmbedProvider, Task #8). Wave 2 stub
      // always fails; result is preserved as-is.
      if (mode === "authenticated_preview" || result.screenshotRequested) {
        const snap = await tryChainSnapshot(rawUrl, ctx);
        if (snap?.screenshotUrl) {
          return mergeAuthDataWithSnapshot(result, snap);
        }
        // Snapshot failed — keep authenticated_preview as-is. UI handles
        // the "data, no visual" case.
      }
      return stripInternalFlags(result);
    }

    // Failure result — record breadcrumb, try next provider.
    errors.push({
      provider: provider.name,
      status: result.previewStatus ?? "extraction_failed",
      msg: result.errorMessage,
    });
  }

  return makeFailureResult({
    classification: opts.classification,
    url: rawUrl,
    previewStatus: pickWorstStatus(errors),
    errorMessage: summarizeBreadcrumbs(errors),
  });
}

/* ───────────────────────── helpers ─────────────────────────────────────── */

function safeMatch(p: SocialProvider, url: URL, c: ClassifyResult): boolean {
  try {
    return p.match(url, c);
  } catch {
    return false;
  }
}

/**
 * Look up a decrypted connection for a provider, or return null if no usable
 * connection exists. Provider names that don't map to an OAuth provider
 * (e.g. "x", which is an OAuth provider; "snapshot", which is not) are
 * resolved here — the cascade only calls this for `requiresAuth` providers.
 */
async function loadConnection(
  userId: string,
  providerName: string,
): Promise<DecryptedConnection | null> {
  if (!isOAuthProvider(providerName)) return null;
  return getConnection(userId, providerName as OAuthProvider);
}

async function tryChainSnapshot(
  rawUrl: string,
  ctx: ProviderContext,
): Promise<NormalizedIngest | null> {
  try {
    const snap = await ScreenshotSnapshotProvider.extract(rawUrl, ctx);
    if (snap.renderMode === "auto_snapshot" && snap.screenshotUrl) {
      return snap;
    }
    return null;
  } catch {
    return null;
  }
}

function mergeAuthDataWithSnapshot(
  data: NormalizedIngest,
  snap: NormalizedIngest,
): NormalizedIngest {
  return stripInternalFlags({
    ...data,
    // Keep authenticated_preview as the render mode — the visual is the
    // snapshot but the UI uses the rich data layout.
    screenshotUrl: snap.screenshotUrl,
    thumbnailUrl: data.thumbnailUrl ?? snap.thumbnailUrl,
  });
}

/** Drop internal cascade flags before the result is persisted. */
function stripInternalFlags(r: NormalizedIngest): NormalizedIngest {
  if (!r.screenshotRequested) return r;
  const { screenshotRequested: _drop, ...rest } = r;
  void _drop;
  return rest;
}

/**
 * Pick the most informative status from a list of breadcrumbs. Prefers
 * specific failure modes (login_required, app_review_required, etc.) over
 * generic ones (extraction_failed, api_permission_missing).
 */
function pickWorstStatus(errors: readonly Breadcrumb[]): PreviewStatus {
  if (errors.length === 0) return "extraction_failed";

  const PRIORITY: PreviewStatus[] = [
    "login_required",
    "private_or_restricted",
    "age_restricted",
    "geo_restricted",
    "deleted_or_unavailable",
    "app_review_required",
    "rate_limited",
    "api_permission_missing",
    "screenshot_failed",
    "metadata_unavailable",
    "extraction_failed",
    "unsupported_url",
  ];

  for (const status of PRIORITY) {
    if (errors.some((e) => e.status === status)) return status;
  }
  return errors[0]!.status;
}

function summarizeBreadcrumbs(errors: readonly Breadcrumb[]): string {
  if (errors.length === 0) return "No providers matched.";
  return errors
    .map((e) => (e.msg ? `${e.provider}: ${e.status} (${e.msg})` : `${e.provider}: ${e.status}`))
    .join(" | ");
}
