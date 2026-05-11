import { normalizeThumbnailStyle } from "@/lib/knowledge/thumbnail-style-config";
import { rewriteStoredKnowledgeThumbnailUrl } from "@/lib/knowledge/storage-thumbnail-url";
import type {
  ContentType,
  DepthIndicator,
  ItemStatus,
  KnowledgeItem,
} from "@/types/knowledge";
import type {
  DisplayMode,
  ExtractionStatus,
  KnowledgeCategory,
  PreviewStatus,
  Provider,
  RenderMode,
  SourceMetadata,
  SourceType,
  TitleSource,
  TranscriptStatus,
} from "@/types/knowledge-source";

/** Maps a Supabase row (snake_case) to the client-side KnowledgeItem (camelCase). */
export function mapRowToItem(row: Record<string, unknown>): KnowledgeItem {
  const errorDetails = row.error_details as { step?: string; error?: string } | null;
  const rawMeta = row.source_metadata;
  const sourceMetadata: SourceMetadata | undefined =
    rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)
      ? (rawMeta as SourceMetadata)
      : undefined;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    contentType: row.content_type as ContentType,
    sourceUrl: (row.source_url as string) || undefined,
    sourceDomain: (row.source_domain as string) || undefined,
    filePath: (row.file_path as string) || undefined,
    thumbnailUrl: rewriteStoredKnowledgeThumbnailUrl(row.thumbnail_url as string | undefined),
    thumbnailStyle: row.thumbnail_style
      ? normalizeThumbnailStyle(row.thumbnail_style)
      : undefined,
    aiTldr: (row.ai_tldr as string) || undefined,
    aiSummary: (row.ai_summary as string) || undefined,
    aiContentOverview: (row.ai_content_overview as string) || undefined,
    aiTags: (row.ai_tags as string[]) ?? [],
    manualTags: (row.manual_tags as string[]) ?? [],
    aiKeyInsights: (row.ai_key_insights as string[]) ?? [],
    aiKeyQuotes: (row.ai_key_quotes as string[]) ?? [],
    aiQuestionsAnswered: (row.ai_questions_answered as string[]) ?? [],
    aiActionItems: (row.ai_action_items as string[]) ?? [],
    depthIndicator: (row.depth_indicator as DepthIndicator) || undefined,
    rawContent: (row.raw_content as string) || undefined,
    youtubeTranscript: (row.youtube_transcript as string) || undefined,
    aiVideoChatStarters: (row.ai_video_chat_starters as string[]) ?? [],
    status: row.status as ItemStatus,
    processingStep: (row.processing_step as string) || undefined,
    errorDetails: errorDetails?.step
      ? { step: errorDetails.step, error: errorDetails.error ?? "Unknown error" }
      : undefined,
    dateAdded: row.date_added as string,
    dateModified: row.date_modified as string,

    sourceType: (row.source_type as SourceType) || undefined,
    provider: (row.provider as Provider) || undefined,
    label: (row.label as string) || undefined,
    category: (row.category as KnowledgeCategory) || undefined,
    sourceMetadata,
    embedHtml: (row.embed_html as string) || undefined,
    extractionStatus: (row.extraction_status as ExtractionStatus) || undefined,
    transcriptStatus: (row.transcript_status as TranscriptStatus) || undefined,
    askEnabled:
      typeof row.ask_enabled === "boolean" ? (row.ask_enabled as boolean) : undefined,
    displayModeDefault: (row.display_mode_default as DisplayMode) || undefined,
    titleSource: (row.title_source as TitleSource) || undefined,
    generatedTitle: (row.generated_title as string) || undefined,

    renderMode: (row.render_mode as RenderMode) || undefined,
    previewStatus: (row.preview_status as PreviewStatus) || undefined,
    checkedAt: (row.checked_at as string) || undefined,
    screenshotUrl: (row.screenshot_url as string) || undefined,
  };
}
