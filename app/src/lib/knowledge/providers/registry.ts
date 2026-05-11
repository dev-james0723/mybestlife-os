/**
 * Provider registry + interface contracts for the cascade-based ingestion
 * pipeline.
 *
 * Design reference: `app/docs/social-provider-design.md`.
 *
 * Each provider is matched against an incoming URL by `match()`. The cascade
 * (in `./cascade.ts`) sorts the matches by `priority` (lower runs first) and
 * tries each in turn until one returns a success render mode. Providers MUST
 * NOT throw on network failures — they should return a failure result with an
 * appropriate `previewStatus` so the cascade can fall through cleanly.
 *
 * Wave 2 scope (this file): X, Reddit, YouTube, GitHub, Threads (tokenless),
 * GenericMetadata. Meta / Snapshot / UserSnapshot are stubbed out — real
 * impls land in Tasks #5, #8, #10 and replace these stubs.
 */

import type { ClassifyResult } from "@/lib/knowledge/classify";
import type {
  PreviewStatus,
  RenderMode,
} from "@/types/knowledge-source";
import type { DecryptedConnection } from "@/types/social-connections";
import type { NormalizedIngest } from "./types";
import { ingestArticle } from "./article";
import { ingestGitHubRepo } from "./github-provider";
import { ingestSocialPost } from "./social";
import { ingestYouTube } from "./youtube-provider";
import { MetaEmbedProviderImpl } from "./social/meta";

/* ───────────────────────────── interfaces ──────────────────────────────── */

/** Server-only screenshot service. Real impl lands in Task #5. */
export interface ScreenshotService {
  capture(input: {
    url: string;
    mode: "post" | "fullpage";
    viewport?: { width: number; height: number };
    waitForSelector?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  }): Promise<{
    storagePath: string;
    publicUrl: string;
    width: number;
    height: number;
    capturedAt: string;
  }>;
}

/** What every provider receives from the cascade. */
export interface ProviderContext {
  userId: string;
  /** Decrypted OAuth connection if `requiresAuth` is set; null otherwise. */
  connection: DecryptedConnection | null;
  /** UI / profile locale, passed through to the AI summarizer downstream. */
  locale: string;
  /** Hard wall-clock budget for this provider's `extract` call. */
  timeoutMs: number;
  /** Injected screenshot service. Wave 2 provides a no-op stub. */
  screenshot: ScreenshotService;
  /** Pre-computed classification, for free. */
  classification: ClassifyResult;
  /** Raw URL the user pasted (pre-canonicalization). */
  rawUrl: string;
}

/** The provider contract. All adapters implement this. */
export interface SocialProvider {
  /** Stable identifier — used in logs and breadcrumbs. */
  name: string;
  /** Lower runs first. Ties broken by registration order. */
  priority: number;
  /** Synchronous match. Reuses `ClassifyResult` rather than re-parsing. */
  match(url: URL, classification: ClassifyResult): boolean;
  /** Returns a fully-formed result. MUST NOT throw on network errors. */
  extract(url: string, ctx: ProviderContext): Promise<NormalizedIngest>;
  /** Set when the provider needs a non-null `ctx.connection`. */
  requiresAuth?: boolean;
  /** Optional post-extract validation. False = treat as failure, fall through. */
  healthCheck?(result: NormalizedIngest): boolean;
}

/* ─────────────────────── render-mode helpers ───────────────────────────── */

const SUCCESS_RENDER_MODES: ReadonlySet<RenderMode> = new Set([
  "true_live_embed",
  "authenticated_preview",
  "auto_snapshot",
  "metadata_preview",
  "user_snapshot",
]);

export function isSuccessRenderMode(mode: RenderMode): boolean {
  return SUCCESS_RENDER_MODES.has(mode);
}

/* ───────────── provider wrappers — Wave 2: thin shims around existing
   ingest functions, adding renderMode/previewStatus/checkedAt ─────────── */

function nowIso() {
  return new Date().toISOString();
}

function deriveRenderModeForExisting(ingest: NormalizedIngest): RenderMode {
  if (ingest.embedHtml && ingest.embedHtml.length > 0) {
    return "true_live_embed";
  }
  return "metadata_preview";
}

function deriveSuccessPreviewStatus(mode: RenderMode): PreviewStatus {
  switch (mode) {
    case "true_live_embed":
      return "embed_success";
    case "authenticated_preview":
      return "authenticated_data_success";
    case "auto_snapshot":
      return "auto_snapshot_success";
    case "metadata_preview":
      return "metadata_success";
    case "user_snapshot":
      return "user_snapshot_success";
    case "unavailable":
      return "extraction_failed";
  }
}

function deriveFailurePreviewStatus(
  ingest: NormalizedIngest,
): PreviewStatus {
  switch (ingest.extractionStatus) {
    case "failed":
      return "extraction_failed";
    case "blocked":
      return "private_or_restricted";
    case "requires_auth":
      return "login_required";
    case "unsupported":
      return "unsupported_url";
    case "partial":
      return "metadata_unavailable";
    default:
      return "extraction_failed";
  }
}

/**
 * Promote an existing NormalizedIngest into a render-mode-aware one. The old
 * adapters didn't set renderMode / previewStatus / checkedAt — we fill them
 * in based on what the adapter produced.
 */
function promote(ingest: NormalizedIngest, fallbackMode: RenderMode): NormalizedIngest {
  if (ingest.renderMode && ingest.previewStatus && ingest.checkedAt) {
    return ingest; // already promoted
  }
  const isSuccess =
    ingest.extractionStatus === "success" ||
    ingest.extractionStatus === "partial";
  const renderMode: RenderMode = isSuccess
    ? deriveRenderModeForExisting(ingest)
    : "unavailable";
  const previewStatus: PreviewStatus = isSuccess
    ? deriveSuccessPreviewStatus(renderMode)
    : deriveFailurePreviewStatus(ingest);
  return {
    ...ingest,
    renderMode: ingest.renderMode ?? (isSuccess ? renderMode : fallbackMode),
    previewStatus: ingest.previewStatus ?? previewStatus,
    checkedAt: ingest.checkedAt ?? nowIso(),
  };
}

/* ─────────────────────────── provider list ─────────────────────────────── */

const XEmbedProvider: SocialProvider = {
  name: "x",
  priority: 10,
  match: (_url, c) => c.provider === "x",
  async extract(url, ctx) {
    const ingest = await ingestSocialPost(url, ctx.classification);
    return promote(ingest, "metadata_preview");
  },
  healthCheck: (r) =>
    r.renderMode !== "true_live_embed" || (r.embedHtml ?? "").includes("platform.twitter.com/embed"),
};

const RedditEmbedProvider: SocialProvider = {
  name: "reddit",
  priority: 10,
  match: (_url, c) => c.provider === "reddit",
  async extract(url, ctx) {
    const ingest = await ingestSocialPost(url, ctx.classification);
    return promote(ingest, "metadata_preview");
  },
};

const YouTubeProvider: SocialProvider = {
  name: "youtube",
  priority: 10,
  match: (_url, c) => c.provider === "youtube",
  async extract(url, ctx) {
    const result = await ingestYouTube(url, {
      withTranscript: false,
      isShorts: ctx.classification.sourceType === "youtube_shorts",
    });
    // Strip transient transcriptText (handled separately by mutations.ts).
    const { transcriptText: _drop, ...rest } = result;
    void _drop;
    return promote(rest as NormalizedIngest, "metadata_preview");
  },
};

const GitHubProvider: SocialProvider = {
  name: "github",
  priority: 20,
  match: (_url, c) => c.provider === "github",
  async extract(url) {
    const ingest = await ingestGitHubRepo(url);
    // GitHub renders as data card, not iframe — force metadata_preview even
    // if extractionStatus says "success" (no embed_html present anyway).
    return {
      ...ingest,
      renderMode: ingest.renderMode ?? "metadata_preview",
      previewStatus: ingest.previewStatus ?? "metadata_success",
      checkedAt: ingest.checkedAt ?? nowIso(),
    };
  },
};

const ThreadsTokenlessProvider: SocialProvider = {
  name: "threads-public",
  priority: 35,
  match: (_url, c) => c.provider === "threads",
  async extract(url, ctx) {
    const ingest = await ingestSocialPost(url, ctx.classification);
    return promote(ingest, "metadata_preview");
  },
};

/** Real Meta provider — see ./social/meta.ts. */
const MetaEmbedProvider: SocialProvider = MetaEmbedProviderImpl;

/**
 * Instagram / Facebook when the user has no Meta OAuth connection (or Meta API
 * failed). Uses public iframe embeds + OG via {@link ingestSocialPost}.
 *
 * Must run before {@link ScreenshotSnapshotProvider}: otherwise every https IG/FB
 * URL short-circuits on `auto_snapshot` with no embed or AI text, triggering
 * `content_extraction` failures downstream.
 */
const MetaPublicTokenlessProvider: SocialProvider = {
  name: "meta-public",
  priority: 32,
  match: (_url, c) => c.provider === "instagram" || c.provider === "facebook",
  async extract(url, ctx) {
    const ingest = await ingestSocialPost(url, ctx.classification);
    return promote(ingest, "metadata_preview");
  },
};

/**
 * ScreenshotSnapshotProvider — returns a placeholder result so the row is
 * inserted immediately; the actual Playwright capture happens in the
 * `after()` callback in `mutations.ts`, which UPDATEs the row's
 * `screenshot_url` once the capture completes. This pattern keeps the
 * synchronous insert path fast (no 3–5s chromium cold start) while still
 * surfacing an `auto_snapshot` render mode to the UI right away.
 */
export const ScreenshotSnapshotProvider: SocialProvider = {
  name: "snapshot",
  priority: 80,
  match: (url) => url.protocol === "https:",
  async extract(url, ctx): Promise<NormalizedIngest> {
    return {
      sourceType: ctx.classification.sourceType,
      provider: ctx.classification.provider,
      category: ctx.classification.category,
      label: ctx.classification.label,
      title: ctx.classification.label,
      titleSource: "fallback",
      sourceUrl: url,
      sourceDomain: ctx.classification.metadata.domain,
      metadata: ctx.classification.metadata,
      extractionStatus: "success",
      transcriptStatus: "not_applicable",
      askEnabled: ctx.classification.askEnabled,
      contentType: "article",
      renderMode: "auto_snapshot",
      previewStatus: "auto_snapshot_success",
      checkedAt: new Date().toISOString(),
      // screenshotUrl filled in by the after() callback in mutations.ts
    };
  },
};

const GenericMetadataProvider: SocialProvider = {
  name: "metadata",
  priority: 90,
  match: (url) => url.protocol === "https:" || url.protocol === "http:",
  async extract(url) {
    const ingest = await ingestArticle(url);
    return promote(ingest, "metadata_preview");
  },
};

/**
 * Stub: real impl lands in Task #10. Never matches automatically (manual
 * upload flow only).
 */
export const UserSnapshotProvider: SocialProvider = {
  name: "user-snapshot",
  priority: 100,
  match: () => false,
  async extract(url, ctx) {
    void url;
    void ctx;
    return makeFailureResult({
      classification: ctx.classification,
      url: ctx.rawUrl,
      previewStatus: "extraction_failed",
      errorMessage: "User snapshot provider not implemented yet (Task #10).",
    });
  },
};

/* ─────────────────────────── exports ───────────────────────────────────── */

/**
 * Active provider registry, ordered by priority.
 *
 * The cascade tries each matching provider in turn:
 *   X / Reddit / YouTube      (10) — tokenless live embed
 *   GitHub                    (20) — repo metadata
 *   Meta                      (30) — Instagram / Facebook (user OAuth)
 *   Meta public               (32) — IG / FB iframe + OG when OAuth skipped/failed
 *   Threads (public)          (35) — tokenless oEmbed for Threads
 *   Snapshot                  (80) — server-side screenshot (any URL)
 *   Generic metadata          (90) — OG / Twitter Card fallback (any URL)
 *
 * UserSnapshotProvider is intentionally absent — it never matches
 * automatically; the manual upload flow constructs its result directly.
 */
export const REGISTRY: readonly SocialProvider[] = [
  XEmbedProvider,
  RedditEmbedProvider,
  YouTubeProvider,
  GitHubProvider,
  MetaEmbedProvider,
  MetaPublicTokenlessProvider,
  ThreadsTokenlessProvider,
  ScreenshotSnapshotProvider,
  GenericMetadataProvider,
];

/* ─────────────────────────── helpers ───────────────────────────────────── */

/**
 * Build a failure-shaped NormalizedIngest. Used by providers that need to
 * report a precise error status without throwing, and by the cascade itself
 * when all providers fail.
 */
export function makeFailureResult(args: {
  classification: ClassifyResult;
  url: string;
  previewStatus: PreviewStatus;
  errorMessage?: string;
}): NormalizedIngest {
  const { classification, url, previewStatus, errorMessage } = args;
  return {
    sourceType: classification.sourceType,
    provider: classification.provider,
    category: classification.category,
    label: classification.label,
    title: classification.label,
    titleSource: "fallback",
    sourceUrl: url,
    sourceDomain: classification.metadata.domain,
    metadata: {
      ...classification.metadata,
      errorMessage,
    },
    extractionStatus: deriveLegacyExtractionStatus(previewStatus),
    transcriptStatus: "not_applicable",
    askEnabled: classification.askEnabled,
    contentType: "article",
    renderMode: "unavailable",
    previewStatus,
    checkedAt: nowIso(),
    errorMessage,
  };
}

function deriveLegacyExtractionStatus(s: PreviewStatus) {
  switch (s) {
    case "embed_success":
    case "authenticated_data_success":
    case "auto_snapshot_success":
    case "user_snapshot_success":
      return "success" as const;
    case "metadata_success":
      return "partial" as const;
    case "login_required":
    case "private_or_restricted":
    case "api_permission_missing":
    case "app_review_required":
      return "requires_auth" as const;
    case "age_restricted":
    case "geo_restricted":
    case "deleted_or_unavailable":
      return "blocked" as const;
    case "rate_limited":
    case "screenshot_failed":
    case "metadata_unavailable":
    case "extraction_failed":
      return "failed" as const;
    case "unsupported_url":
      return "unsupported" as const;
  }
}

/** Wave-2 no-op screenshot service. Replaced by real impl in Task #5. */
export const NOOP_SCREENSHOT_SERVICE: ScreenshotService = {
  async capture() {
    throw new Error("ScreenshotService not yet implemented (Task #5).");
  },
};

/** Default per-provider timeouts (ms). */
export function defaultTimeoutFor(name: string): number {
  switch (name) {
    case "x":
    case "reddit":
    case "meta":
    case "threads-public":
      return 9000;
    case "github":
      return 10000;
    case "youtube":
      return 12000;
    case "snapshot":
      return 30000; // deferred; this is the after() job budget
    case "metadata":
      return 8000;
    default:
      return 9000;
  }
}
