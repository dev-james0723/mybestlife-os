export type ContentType =
  | "article"
  | "link"
  | "video"
  | "social"
  | "podcast"
  | "document"
  | "paper"
  | "book"
  | "code"
  | "repository"
  | "dataset"
  | "presentation"
  | "photo"
  | "quote"
  | "note"
  | "file";

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

export const CONTENT_TYPES: ContentType[] = [
  "article",
  "link",
  "video",
  "social",
  "podcast",
  "document",
  "paper",
  "book",
  "code",
  "repository",
  "dataset",
  "presentation",
  "photo",
  "quote",
  "note",
  "file",
];

export function isContentType(value: unknown): value is ContentType {
  return typeof value === "string" && (CONTENT_TYPES as readonly string[]).includes(value);
}

export function normalizeContentType(value: unknown): ContentType {
  return isContentType(value) ? value : "file";
}

export function contentTypeForSourceType(sourceType: SourceType | undefined | null): ContentType {
  switch (sourceType) {
    case "youtube_video":
    case "youtube_shorts":
      return "video";
    case "social_x_post":
    case "social_facebook_post":
    case "social_facebook_video_post":
    case "social_instagram_post":
    case "social_instagram_reel":
    case "social_threads_post":
    case "social_reddit_post":
      return "social";
    case "github_repository":
      return "repository";
    case "html_input":
    case "code_python":
    case "code_javascript":
    case "code_typescript":
    case "code_java":
    case "code_php":
    case "code_css":
    case "code_sql":
    case "code_bash":
    case "code_json":
      return "code";
    case "markdown_input":
    case "plain_text":
      return "note";
    case "voice_memo":
      return "podcast";
    case "url_other":
      return "link";
    case "article_url":
      return "article";
    case "file_upload":
    default:
      return "file";
  }
}

export function contentTypeForUrlHint(rawUrl: string, fallback: ContentType = "article"): ContentType {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return fallback;
  }

  const domain = url.hostname.replace(/^www\./, "").toLowerCase();
  const lower = url.toString().toLowerCase();

  if (
    domain.includes("arxiv.org") ||
    domain.includes("doi.org") ||
    domain.includes("pubmed.ncbi.nlm.nih.gov") ||
    domain.includes("semanticscholar.org") ||
    domain.includes("biorxiv.org") ||
    domain.includes("medrxiv.org") ||
    domain.includes("ssrn.com")
  ) {
    return "paper";
  }
  if (domain.includes("books.google.") || domain.includes("goodreads.com")) {
    return "book";
  }
  if (domain.includes("docs.google.com")) {
    if (lower.includes("/presentation/")) return "presentation";
    if (lower.includes("/spreadsheets/")) return "dataset";
    return "document";
  }
  if (
    domain.includes("youtube.com") ||
    domain.includes("youtu.be") ||
    domain.includes("vimeo.com")
  ) {
    return "video";
  }
  if (
    domain.includes("spotify.com") ||
    domain.includes("podcasts.apple.com") ||
    domain.includes("overcast.fm")
  ) {
    return "podcast";
  }
  if (/\.(mp4|mov|avi|webm|mkv|m4v|mpeg|mpg)(\?|$)/.test(lower)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)(\?|$)/.test(lower)) return "podcast";
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|heif|tif|tiff)(\?|$)/.test(lower)) return "photo";
  if (/\.(pdf|doc|docx|rtf|txt|md|markdown)(\?|$)/.test(lower)) return "document";
  if (/\.(ppt|pptx|key)(\?|$)/.test(lower)) return "presentation";
  if (/\.(csv|tsv|xls|xlsx|numbers|jsonl)(\?|$)/.test(lower)) return "dataset";
  if (/\.(epub|mobi|azw3)(\?|$)/.test(lower)) return "book";
  if (/\.(js|jsx|ts|tsx|py|rb|go|rs|java|php|css|sql|sh|bash|json|yaml|yml)(\?|$)/.test(lower)) {
    return "code";
  }
  if (/\.(zip|rar|7z|tar|gz|tgz)(\?|$)/.test(lower)) return "file";

  return fallback;
}

export const typeColors: Record<ContentType, {
  bg: string; text: string; border: string; darkBg: string; darkText: string; icon: string;
}> = {
  article:  { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    darkBg: "dark:bg-teal-900/40",    darkText: "dark:text-teal-300",    icon: "📄" },
  link:     { bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200",     darkBg: "dark:bg-sky-900/40",     darkText: "dark:text-sky-300",     icon: "🔗" },
  video:    { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  darkBg: "dark:bg-orange-900/40",  darkText: "dark:text-orange-300",  icon: "🎬" },
  social:   { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    darkBg: "dark:bg-rose-900/40",    darkText: "dark:text-rose-300",    icon: "💬" },
  podcast:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  darkBg: "dark:bg-violet-900/40",  darkText: "dark:text-violet-300",  icon: "🎙️" },
  document: { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    darkBg: "dark:bg-blue-900/40",    darkText: "dark:text-blue-300",    icon: "📑" },
  paper:    { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    darkBg: "dark:bg-cyan-900/40",    darkText: "dark:text-cyan-300",    icon: "🔬" },
  book:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", darkBg: "dark:bg-emerald-900/40", darkText: "dark:text-emerald-300", icon: "📚" },
  code:     { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200",  darkBg: "dark:bg-indigo-900/40",  darkText: "dark:text-indigo-300",  icon: "💻" },
  repository: { bg: "bg-zinc-100", text: "text-zinc-700", border: "border-zinc-200", darkBg: "dark:bg-zinc-800/60", darkText: "dark:text-zinc-200", icon: "🧩" },
  dataset:  { bg: "bg-lime-50",    text: "text-lime-700",    border: "border-lime-200",    darkBg: "dark:bg-lime-900/40",    darkText: "dark:text-lime-300",    icon: "📊" },
  presentation: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", darkBg: "dark:bg-fuchsia-900/40", darkText: "dark:text-fuchsia-300", icon: "📽️" },
  photo:    { bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   darkBg: "dark:bg-amber-900/40",   darkText: "dark:text-amber-300",   icon: "📷" },
  quote:    { bg: "bg-stone-100",   text: "text-stone-700",   border: "border-stone-200",   darkBg: "dark:bg-stone-800/60",   darkText: "dark:text-stone-200",   icon: "❞" },
  note:     { bg: "bg-gray-50",     text: "text-gray-600",    border: "border-gray-200",    darkBg: "dark:bg-gray-800/40",    darkText: "dark:text-gray-400",    icon: "📝" },
  file:     { bg: "bg-slate-50",    text: "text-slate-700",   border: "border-slate-200",   darkBg: "dark:bg-slate-800/60",   darkText: "dark:text-slate-300",   icon: "📁" },
};
