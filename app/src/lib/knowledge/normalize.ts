/**
 * Normalization layer.
 *
 * Converts a {@link NormalizedIngest} + derivative AI result into the
 * snake_case row shape that the `knowledge_items` table expects. Centralizing
 * this keeps the mutation code short and makes it trivial to add a new
 * provider without touching every persistence site.
 */

import type { ThumbnailStyle } from "@/types/knowledge";
import type { NormalizedIngest } from "./providers/types";
import type { DerivativeResult } from "./derivatives";

export type KnowledgeInsertPayload = {
  user_id: string;
  title: string;
  content_type: string;
  source_url?: string | null;
  source_domain?: string | null;
  thumbnail_url?: string | null;
  thumbnail_style: ThumbnailStyle;
  raw_content?: string | null;
  status: "processing" | "ready" | "error";
  processing_step?: string | null;
  // source-aware columns
  source_type?: string | null;
  provider?: string | null;
  label?: string | null;
  category?: string | null;
  source_metadata?: Record<string, unknown> | null;
  embed_html?: string | null;
  extraction_status?: string | null;
  transcript_status?: string | null;
  ask_enabled?: boolean | null;
  display_mode_default?: string | null;
  title_source?: string | null;
  generated_title?: string | null;
  // YouTube-specific
  youtube_transcript?: string | null;
  // Cascade-aware preview fields (migration 20270602000000)
  render_mode?: string | null;
  preview_status?: string | null;
  checked_at?: string | null;
  screenshot_url?: string | null;
};

export function buildInsertPayload(params: {
  userId: string;
  ingest: NormalizedIngest;
  thumbnailStyle: ThumbnailStyle;
  initialStatus?: "processing" | "ready";
  processingStep?: string | null;
  thumbnailOverride?: string | null;
  /** Raw transcript text (YouTube only) to store on insert if available. */
  transcriptText?: string | null;
}): KnowledgeInsertPayload {
  const { ingest } = params;
  const thumbnail =
    params.thumbnailStyle === "na"
      ? null
      : (params.thumbnailOverride ?? ingest.thumbnailUrl ?? null);

  return {
    user_id: params.userId,
    title: ingest.title,
    content_type: ingest.contentType,
    source_url: ingest.sourceUrl ?? null,
    source_domain: ingest.sourceDomain ?? null,
    thumbnail_url: thumbnail,
    thumbnail_style: params.thumbnailStyle,
    raw_content: ingest.rawContent ?? null,
    status: params.initialStatus ?? "processing",
    processing_step: params.processingStep ?? null,
    source_type: ingest.sourceType,
    provider: ingest.provider,
    label: ingest.label,
    category: ingest.category,
    source_metadata: isEmptyMetadata(ingest.metadata) ? null : ingest.metadata,
    embed_html: ingest.embedHtml ?? null,
    extraction_status: ingest.extractionStatus,
    transcript_status: ingest.transcriptStatus,
    ask_enabled: ingest.askEnabled,
    display_mode_default: ingest.displayModeDefault ?? null,
    title_source: ingest.titleSource,
    generated_title: null,
    youtube_transcript: params.transcriptText ?? null,
    render_mode: ingest.renderMode ?? null,
    preview_status: ingest.previewStatus ?? null,
    checked_at: ingest.checkedAt ?? null,
    screenshot_url: ingest.screenshotUrl ?? null,
  };
}

export function buildDerivativeUpdatePayload(params: {
  ingest: NormalizedIngest;
  derivatives: DerivativeResult;
  allowTitleOverride: boolean;
}): Record<string, unknown> {
  const { derivatives } = params;
  const update: Record<string, unknown> = {
    date_modified: new Date().toISOString(),
  };

  if (derivatives.tldr) update.ai_tldr = derivatives.tldr;
  if (derivatives.summary) update.ai_summary = derivatives.summary;
  if (derivatives.contentOverview) update.ai_content_overview = derivatives.contentOverview;
  if (derivatives.keyInsights) update.ai_key_insights = derivatives.keyInsights;
  if (derivatives.keyQuotes) update.ai_key_quotes = derivatives.keyQuotes;
  if (derivatives.actionItems) update.ai_action_items = derivatives.actionItems;
  if (derivatives.questionsAnswered) update.ai_questions_answered = derivatives.questionsAnswered;
  if (derivatives.chatStarters) update.ai_video_chat_starters = derivatives.chatStarters;
  // Only persist when we have real tags. Empty arrays are truthy in JS; writing
  // [] here used to wipe ai_tags before the taxonomy step, leaving cards
  // untagged when taxonomy failed or was skipped.
  if (Array.isArray(derivatives.tags) && derivatives.tags.length > 0) {
    update.ai_tags = derivatives.tags;
  }
  if (derivatives.depthIndicator) update.depth_indicator = derivatives.depthIndicator;

  if (params.allowTitleOverride && derivatives.suggestedTitle) {
    update.title = derivatives.suggestedTitle;
    update.generated_title = derivatives.suggestedTitle;
    update.title_source = "generated";
  } else if (derivatives.suggestedTitle) {
    update.generated_title = derivatives.suggestedTitle;
  }

  return update;
}

function isEmptyMetadata(meta: Record<string, unknown> | undefined): boolean {
  if (!meta) return true;
  return Object.values(meta).every(
    (v) => v === undefined || v === null || (typeof v === "string" && v.length === 0),
  );
}
