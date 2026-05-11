/**
 * Shared contract for source-specific ingestion adapters.
 *
 * Each provider adapter takes an input (URL or raw text) and returns a
 * `NormalizedIngest` — the shape the normalization layer persists to
 * `knowledge_items`. Adapters MUST be resilient: on partial failure they
 * should still return a degraded-but-usable result (metadata only, etc.) and
 * set `extractionStatus` appropriately. They must never throw on public
 * network failures.
 */

import type { ContentType } from "@/types/knowledge";
import type {
  ExtractionStatus,
  KnowledgeCategory,
  PreviewStatus,
  Provider,
  RenderMode,
  SourceMetadata,
  SourceType,
  TranscriptStatus,
} from "@/types/knowledge-source";

/** Result returned by every provider adapter. */
export type NormalizedIngest = {
  sourceType: SourceType;
  provider: Provider;
  category: KnowledgeCategory;
  label: string;
  /** Extracted (preferred) or fallback title. */
  title: string;
  /** "extracted" when we pulled it from the provider; "fallback" otherwise. */
  titleSource: "extracted" | "fallback";
  /** Where the user pasted this from, when applicable. */
  sourceUrl?: string;
  sourceDomain?: string;
  /** Best available thumbnail (hero image, video thumb, etc.). */
  thumbnailUrl?: string;
  /** Raw extracted content for display and chat grounding. Encoded via
   *  code-content.ts when we want a preview/source toggle. */
  rawContent?: string;
  /** Plain-text content used as AI input (summary, insights). */
  aiInputText?: string;
  /** Sanitized provider embed HTML for in-app rendering (social posts). */
  embedHtml?: string;
  /** Provider metadata (author, channel, subreddit, etc.). */
  metadata: SourceMetadata;
  /** Outcome of the extraction pipeline (success | partial | failed | ...). */
  extractionStatus: ExtractionStatus;
  /** YouTube-specific transcript state (defaults to `not_applicable`). */
  transcriptStatus: TranscriptStatus;
  /** Whether Ask-the-Document/Video should be enabled for this item. */
  askEnabled: boolean;
  /** Default display mode (only meaningful for code/markup items). */
  displayModeDefault?: "preview" | "source";
  /** Legacy content_type (kept for backwards-compat filters). */
  contentType: ContentType;

  // ── Cascade-aware fields (added with the render-mode pipeline) ──
  // Required for results returned from the cascade; optional for legacy
  // adapters during the transition. The `promote()` helper in registry.ts
  // fills these in for adapters that haven't been updated yet.
  /** Which preview UI variant to render. */
  renderMode?: RenderMode;
  /** Precise 17-value preview outcome. Coexists with `extractionStatus`. */
  previewStatus?: PreviewStatus;
  /** RFC3339 timestamp of when the cascade resolved this URL. */
  checkedAt?: string;
  /** Direct iframe URL (when renderMode === "true_live_embed"). */
  iframeUrl?: string;
  /** Public widget hydration script (rare; e.g. widgets.js for X). */
  embedScriptUrl?: string;
  /** Public URL of the canonical snapshot image. */
  screenshotUrl?: string;
  /** Long-form readable text from the post body / OCR. */
  extractedText?: string;
  /** User-visible caption only (Meta posts), separated from author line. */
  caption?: string;
  /** Mirrors metadata.author for ergonomics. */
  authorName?: string;
  /** Mirrors metadata.handle for ergonomics. */
  authorHandle?: string;
  /** AI-suggested title (filled by AI job, not provider). */
  aiTitle?: string;
  /** AI-generated single-sentence summary. */
  oneSentenceSummary?: string;
  /** AI-generated 1–2 paragraph blurb. */
  shortDescription?: string;
  /** AI-suggested tags. */
  tags?: string[];
  /** Detected language tag (e.g. "zh-Hant", "en", "ja"). */
  detectedLanguage?: string;
  /** User-readable error message for failure states. */
  errorMessage?: string;
  /** Raw upstream payload (debug only). */
  rawProviderPayload?: unknown;
  /** Internal cascade flag — provider asks for snapshot follow-up.
   *  Stripped before persistence. */
  screenshotRequested?: boolean;
  /** Promoted from metadata.canonicalUrl for ergonomics. */
  canonicalUrl?: string;
};

/** Narrow helper: create a metadata-only degraded result. */
export function degradedResult(params: {
  sourceType: SourceType;
  provider: Provider;
  category: KnowledgeCategory;
  label: string;
  title: string;
  sourceUrl?: string;
  domain?: string;
  metadata?: SourceMetadata;
  extractionStatus?: ExtractionStatus;
  askEnabled: boolean;
  contentType: ContentType;
}): NormalizedIngest {
  return {
    sourceType: params.sourceType,
    provider: params.provider,
    category: params.category,
    label: params.label,
    title: params.title,
    titleSource: "fallback",
    sourceUrl: params.sourceUrl,
    sourceDomain: params.domain,
    metadata: {
      ...(params.metadata ?? {}),
      domain: params.domain ?? params.metadata?.domain,
    },
    extractionStatus: params.extractionStatus ?? "partial",
    transcriptStatus: "not_applicable",
    askEnabled: params.askEnabled,
    contentType: params.contentType,
  };
}
