export type ContentType = "podcast" | "article" | "video" | "file" | "photo" | "note";

export type {
  ThumbnailStyle,
  GeneratableThumbnailStyle,
} from "@/lib/knowledge/thumbnail-style-config";
export {
  THUMBNAIL_STYLES,
  normalizeThumbnailStyle,
  parseThumbnailStyle,
} from "@/lib/knowledge/thumbnail-style-config";

export type ItemStatus = "processing" | "ready" | "error";

export type DepthIndicator = "intro" | "intermediate" | "technical" | "reference";

import type { ThumbnailStyle } from "@/lib/knowledge/thumbnail-style-config";
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
} from "./knowledge-source";
import type { DocumentBrainJobSummary } from "@/lib/document-brain/map-extraction-job-row";

export type KnowledgeItem = {
  id: string;
  userId: string;
  title: string;
  contentType: ContentType;
  sourceUrl?: string;
  sourceDomain?: string;
  filePath?: string;
  thumbnailUrl?: string;
  thumbnailStyle?: ThumbnailStyle;
  aiTldr?: string;
  aiSummary?: string;
  /** High-level narrative of scope, structure, and audience (especially for video). */
  aiContentOverview?: string;
  aiTags: string[];
  manualTags: string[];
  aiKeyInsights: string[];
  aiKeyQuotes: string[];
  aiQuestionsAnswered: string[];
  aiActionItems: string[];
  depthIndicator?: DepthIndicator;
  rawContent?: string;
  /** Captions-based transcript when user generates or when available from processing. */
  youtubeTranscript?: string;
  /** Short suggested questions for “Ask about this video”. */
  aiVideoChatStarters: string[];
  status: ItemStatus;
  processingStep?: string;
  errorDetails?: { step: string; error: string };
  /** Latest MinerU / Doc Brain extraction job for this knowledge card (PDF pipeline). */
  documentBrainJob?: DocumentBrainJobSummary;

  dateAdded: string;
  dateModified: string;
  connections?: KnowledgeConnection[];

  // ── Source-aware ingestion fields (see migration 20260503000000) ──
  /** Fine-grained source type used by the rendering / interaction layers. */
  sourceType?: SourceType;
  /** Upstream provider (`youtube`, `x`, `github`, …). */
  provider?: Provider;
  /** Human-facing label ("X Post", "GitHub Repository", "Python"). */
  label?: string;
  /** Broader grouping for sidebar/filter ("social_media", "repository", …). */
  category?: KnowledgeCategory;
  /** Provider-specific metadata (author, channel, subreddit, repo stars, …). */
  sourceMetadata?: SourceMetadata;
  /** Sanitized provider embed HTML (social posts, etc.). */
  embedHtml?: string;
  /** Extraction pipeline outcome. */
  extractionStatus?: ExtractionStatus;
  /** YouTube transcript pipeline state. */
  transcriptStatus?: TranscriptStatus;
  /** Whether `Ask the Document` / `Ask the Video` should be shown. */
  askEnabled?: boolean;
  /** Default display mode for code/markup cards. */
  displayModeDefault?: DisplayMode;
  /** How the stored `title` was obtained. */
  titleSource?: TitleSource;
  /** AI-suggested title preserved separately from the editable `title`. */
  generatedTitle?: string;

  // ── Render-mode-aware preview fields (migration 20270602000000) ──
  /** Which preview UI variant to render. NULL for legacy non-preview items. */
  renderMode?: RenderMode;
  /** Precise 17-value preview outcome (coexists with extractionStatus). */
  previewStatus?: PreviewStatus;
  /** Last time the cascade verified this preview is still valid. */
  checkedAt?: string;
  /** Public URL of the canonical snapshot image (mirrored from knowledge_assets). */
  screenshotUrl?: string;
};

export type KnowledgeConnection = {
  id: string;
  sourceItemId: string;
  targetItemId: string;
  relevanceScore: number;
  reason: string;
};

export type SmartCollection = {
  id: string;
  userId: string;
  name: string;
  description: string;
  itemIds: string[];
  createdAt: string;
  updatedAt: string;
};

export { mapRowToItem } from "@/lib/knowledge/map-row-to-item";

export function mapRowToConnection(row: Record<string, unknown>): KnowledgeConnection {
  return {
    id: row.id as string,
    sourceItemId: row.source_item_id as string,
    targetItemId: row.target_item_id as string,
    relevanceScore: row.relevance_score as number,
    reason: row.reason as string,
  };
}

export function mapRowToCollection(row: Record<string, unknown>): SmartCollection {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    itemIds: (row.item_ids as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const CONTENT_TYPES: ContentType[] = ["podcast", "article", "video", "file", "photo", "note"];

export const typeColors: Record<ContentType, {
  bg: string; text: string; border: string; darkBg: string; darkText: string; icon: string;
}> = {
  podcast:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  darkBg: "dark:bg-violet-900/40",  darkText: "dark:text-violet-300",  icon: "🎙️" },
  article:  { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    darkBg: "dark:bg-teal-900/40",    darkText: "dark:text-teal-300",    icon: "📄" },
  video:    { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  darkBg: "dark:bg-orange-900/40",  darkText: "dark:text-orange-300",  icon: "🎬" },
  file:     { bg: "bg-blue-50",     text: "text-blue-700",    border: "border-blue-200",    darkBg: "dark:bg-blue-900/40",    darkText: "dark:text-blue-300",    icon: "📁" },
  photo:    { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   darkBg: "dark:bg-amber-900/40",   darkText: "dark:text-amber-300",   icon: "📷" },
  note:     { bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-200",    darkBg: "dark:bg-gray-800/40",    darkText: "dark:text-gray-400",    icon: "📝" },
};
