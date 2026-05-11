/**
 * Source-aware types for Knowledge ingestion.
 *
 * These live alongside the existing `ContentType` in @/types/knowledge to avoid
 * breaking the legacy card types. `SourceType` is fine-grained (used by
 * detection, extraction, and rendering layers); `KnowledgeCategory` is the
 * sidebar grouping; `Provider` identifies the upstream service.
 */

export type SourceType =
  | "article_url"
  | "youtube_video"
  | "youtube_shorts"
  | "social_x_post"
  | "social_facebook_post"
  | "social_facebook_video_post"
  | "social_instagram_post"
  | "social_instagram_reel"
  | "social_threads_post"
  | "social_reddit_post"
  | "github_repository"
  | "html_input"
  | "markdown_input"
  | "code_python"
  | "code_javascript"
  | "code_typescript"
  | "code_java"
  | "code_php"
  | "code_css"
  | "code_sql"
  | "code_bash"
  | "code_json"
  | "plain_text"
  | "file_upload"
  | "voice_memo"
  | "url_other";

export type Provider =
  | "web"
  | "youtube"
  | "x"
  | "facebook"
  | "instagram"
  | "threads"
  | "reddit"
  | "github"
  | "local";

export type KnowledgeCategory =
  | "article"
  | "video"
  | "audio"
  | "image"
  | "social_media"
  | "repository"
  | "code"
  | "markup"
  | "note"
  | "file";

export type ExtractionStatus =
  | "success"
  | "partial"
  | "failed"
  | "blocked"
  | "requires_auth"
  | "unsupported";

/**
 * Which preview UI variant a card renders. Set by the ingestion cascade and
 * persisted on knowledge_items. NULL/undefined for legacy non-preview items
 * (article, code, file, note) — those keep their existing rendering paths.
 *
 * - `true_live_embed`        — official iframe / oEmbed renders inline (X, Reddit, YouTube, Threads-public)
 * - `authenticated_preview`  — provider data via OAuth (Meta data, GitHub repo); visual filled by snapshot
 * - `auto_snapshot`          — server-side Playwright screenshot of the public page
 * - `metadata_preview`       — OG image + title + description only
 * - `user_snapshot`          — user-uploaded screenshot + pasted caption
 * - `unavailable`            — every fallback failed; show clear reason + manual options
 */
export type RenderMode =
  | "true_live_embed"
  | "authenticated_preview"
  | "auto_snapshot"
  | "metadata_preview"
  | "user_snapshot"
  | "unavailable";

/**
 * Precise 17-value preview outcome. Coexists with the legacy 6-value
 * `ExtractionStatus` for backwards compatibility — new code sets both.
 */
export type PreviewStatus =
  // success-side
  | "embed_success"
  | "authenticated_data_success"
  | "auto_snapshot_success"
  | "metadata_success"
  | "user_snapshot_success"
  // restricted / error-side
  | "login_required"
  | "private_or_restricted"
  | "age_restricted"
  | "geo_restricted"
  | "deleted_or_unavailable"
  | "unsupported_url"
  | "api_permission_missing"
  | "app_review_required"
  | "rate_limited"
  | "metadata_unavailable"
  | "screenshot_failed"
  | "extraction_failed";

export const RENDER_MODES = [
  "true_live_embed",
  "authenticated_preview",
  "auto_snapshot",
  "metadata_preview",
  "user_snapshot",
  "unavailable",
] as const satisfies readonly RenderMode[];

export const PREVIEW_STATUSES = [
  "embed_success",
  "authenticated_data_success",
  "auto_snapshot_success",
  "metadata_success",
  "user_snapshot_success",
  "login_required",
  "private_or_restricted",
  "age_restricted",
  "geo_restricted",
  "deleted_or_unavailable",
  "unsupported_url",
  "api_permission_missing",
  "app_review_required",
  "rate_limited",
  "metadata_unavailable",
  "screenshot_failed",
  "extraction_failed",
] as const satisfies readonly PreviewStatus[];

export function isRenderMode(value: unknown): value is RenderMode {
  return typeof value === "string" && (RENDER_MODES as readonly string[]).includes(value);
}

export function isPreviewStatus(value: unknown): value is PreviewStatus {
  return typeof value === "string" && (PREVIEW_STATUSES as readonly string[]).includes(value);
}

/**
 * OAuth provider umbrella for the `social_connections` table. Distinct from
 * `Provider` (which is per-source) because one Meta OAuth connection covers
 * Instagram + Facebook + Threads.
 */
export type OAuthProvider = "meta" | "x" | "reddit" | "github";

export type SocialConnectionStatus = "active" | "expired" | "disconnected" | "error";

export const OAUTH_PROVIDERS = ["meta", "x", "reddit", "github"] as const satisfies readonly OAuthProvider[];

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Asset stored in `knowledge_assets`. Every snapshot, AI thumbnail, and OG
 * image cache lives here — knowledge_items.screenshot_url mirrors the most
 * recent canonical snapshot for fast card rendering without a join.
 */
export type KnowledgeAssetType =
  | "auto_snapshot"
  | "user_snapshot"
  | "og_image"
  | "ai_thumbnail"
  | "media_thumbnail";

export type KnowledgeAssetSource =
  | "playwright"
  | "screenshot_service"
  | "user_upload"
  | "og_meta"
  | "ai_gen"
  | "provider_api";

export type TranscriptStatus =
  | "not_applicable"
  | "not_requested"
  | "generated"
  | "unavailable"
  | "failed";

export type DisplayMode = "preview" | "source";

export type TitleSource = "extracted" | "generated" | "fallback";

/** All SourceType values as a tuple for runtime iteration / validation. */
export const SOURCE_TYPES = [
  "article_url",
  "youtube_video",
  "youtube_shorts",
  "social_x_post",
  "social_facebook_post",
  "social_facebook_video_post",
  "social_instagram_post",
  "social_instagram_reel",
  "social_reddit_post",
  "github_repository",
  "html_input",
  "markdown_input",
  "code_python",
  "code_javascript",
  "code_typescript",
  "code_java",
  "code_php",
  "code_css",
  "code_sql",
  "code_bash",
  "code_json",
  "plain_text",
  "file_upload",
  "voice_memo",
  "url_other",
] as const satisfies readonly SourceType[];

export function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && (SOURCE_TYPES as readonly string[]).includes(value);
}

/** Provider-specific metadata stored as JSONB. Each field is optional. */
export type SourceMetadata = {
  /** Upstream display name for the author (channel, handle, repo owner, etc.). */
  author?: string;
  /** Machine handle (e.g. `@username`, `r/subreddit`, repo `owner/name`). */
  handle?: string;
  /** Human-readable publication or upload date. */
  publishedAt?: string;
  /** Channel name for video providers. */
  channel?: string;
  /** Subreddit name for Reddit posts. */
  subreddit?: string;
  /** Repository owner. */
  owner?: string;
  /** Repository short name. */
  repo?: string;
  /** Primary language (for GitHub / code). */
  language?: string;
  /** Star count for repositories. */
  stars?: number;
  /** Fork count for repositories. */
  forks?: number;
  /** Source domain (host) for articles. */
  domain?: string;
  /** oEmbed provider display name, when returned upstream. */
  providerName?: string;
  /** oEmbed provider home URL, when returned upstream. */
  providerUrl?: string;
  /** Duration in seconds for videos / audio. */
  durationSeconds?: number;
  /** Canonical URL (e.g. watch?v=... vs shorts/). */
  canonicalUrl?: string;
  /** Post id within provider (e.g. Reddit permalink id, X status id). */
  externalId?: string;
  /** Notes about why extraction was partial/blocked/unsupported. */
  extractionNote?: string;
  /** Detected language code for code cards (python, javascript, …). */
  codeLanguage?: string;
  /** Aspect ratio of the embed if known (social embeds). */
  aspectRatio?: string;

  // ── Cascade-produced fields (added with the render-mode pipeline) ──
  /** Caption / body text from the social post (Instagram, FB, Threads, X). */
  caption?: string;
  /** Plain-text extracted from the post body or screenshot OCR. */
  extractedText?: string;
  /** Direct iframe URL when the provider returns one (separate from embedHtml). */
  iframeUrl?: string;
  /** Content type within the platform: post / video / reel / thread / repository / article. */
  contentKind?: "post" | "video" | "reel" | "thread" | "repository" | "article" | "webpage" | "unknown";
  /** Detected primary language tag (e.g. "zh-Hant", "zh-Hans", "en", "ja"). */
  detectedLanguage?: string;
  /** User-facing reason for `unavailable` / restricted states. */
  errorMessage?: string;
  /** Raw upstream payload kept for debugging / future re-parse. */
  rawProviderPayload?: unknown;
  /** OG site name (e.g. "Instagram", "GitHub"). */
  siteName?: string;
};
