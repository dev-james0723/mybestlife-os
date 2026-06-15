import type { ContentType, KnowledgeItem } from "@/types/knowledge";
import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";

const INTERNAL_TAG_RE =
  /\b(minoru|mineru|gemini|openai|anthropic|supabase|parser|pipeline|normalizer|embedding|vendor|model|metadata[-_]?preview|true[-_]?live[-_]?embed|document[-_](?:analyses|pages|sections|glossary[-_]terms|visual[-_]assets|chunks)|raw[-_][a-z0-9_-]+|parser[-_][a-z0-9_-]+|chunk|chunks)\b/i;

const HASH_LIKE_RE = /^[a-f0-9]{12,}(?:[-_.][a-z0-9]+)?$/i;
const FILE_LIKE_RE = /\.(?:png|jpe?g|webp|gif|svg|pdf|json|md|txt)$/i;
const CJK_RE = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/;

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  article: "Article",
  book: "Book",
  contract: "Contract",
  dataset: "Dataset",
  document: "Document",
  file: "File",
  form: "Form",
  invoice: "Invoice",
  letter: "Letter",
  manual: "Manual",
  memo: "Memo",
  note: "Note",
  paper: "Research Paper",
  presentation: "Presentation",
  receipt: "Receipt",
  report: "Report",
  research: "Research Paper",
  research_paper: "Research Paper",
  statement: "Statement",
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  article: "Article",
  link: "Link",
  video: "Video",
  social: "Social Post",
  podcast: "Audio",
  document: "Document",
  paper: "Research Paper",
  book: "Book",
  code: "Code",
  repository: "Repository",
  dataset: "Dataset",
  presentation: "Presentation",
  photo: "Photo",
  quote: "Quote",
  note: "Note",
  file: "File",
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/[._\s]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function titleCaseAscii(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^(pdf|api|url|ui|qa|id)$/i.test(word)) return word.toUpperCase();
      return `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

export function getDisplayLanguage(languageCodeOrSlug: string | null | undefined): string {
  if (!languageCodeOrSlug?.trim()) return "Unknown";
  const raw = languageCodeOrSlug.trim();
  const key = normalizeKey(raw);

  if (["mixed", "multi", "multilingual", "multiple", "multiple-languages"].includes(key)) return "多語言";
  if (["traditional-chinese", "chinese-traditional", "zh-hant", "zh-tw", "zh-hk", "zh-mo"].includes(key)) {
    return "繁體中文";
  }
  if (["simplified-chinese", "chinese-simplified", "zh-hans", "zh-cn", "zh-sg"].includes(key)) {
    return "簡體中文";
  }
  if (["zh", "zho", "chi", "chinese", "cn"].includes(key)) return "中文";
  if (["en", "eng", "english"].includes(key)) return "English";
  if (["ja", "jp", "jpn", "japanese"].includes(key)) return "日本語";
  if (["ko", "kor", "korean"].includes(key)) return "한국어";
  if (["fr", "fra", "fre", "french"].includes(key)) return "Français";
  if (["de", "deu", "ger", "german"].includes(key)) return "Deutsch";
  if (["es", "spa", "spanish"].includes(key)) return "Español";
  if (["it", "ita", "italian"].includes(key)) return "Italiano";
  if (["pt", "por", "portuguese"].includes(key)) return "Português";
  if (["vi", "vie", "vietnamese"].includes(key)) return "Tiếng Việt";
  if (["th", "tha", "thai"].includes(key)) return "ไทย";
  if (["ar", "ara", "arabic"].includes(key)) return "العربية";

  const cleaned = raw.replace(/[_-]+/g, " ").trim();
  if (!cleaned || /^[a-z]{2,3}(?:[-_][a-z]{2,4})?$/i.test(raw)) return "Unknown";
  return CJK_RE.test(cleaned) ? cleaned : titleCaseAscii(cleaned);
}

export function getDisplayStatus(status: string | null | undefined): "Ready" | "Processing" | "Failed" | "Unknown" {
  const key = normalizeKey(status ?? "");
  if (!key) return "Unknown";
  if (["completed", "complete", "ready", "success", "succeeded", "done"].includes(key)) return "Ready";
  if (["failed", "failure", "error", "errored", "blocked"].includes(key)) return "Failed";
  if (["processing", "running", "queued", "pending", "started", "in-progress", "retrying"].includes(key)) {
    return "Processing";
  }
  return "Processing";
}

export function getDisplayDocumentType(
  documentType: string | null | undefined,
  fallbackContentType?: ContentType | null,
): string {
  const key = normalizeKey(documentType ?? "");
  if (key && !INTERNAL_TAG_RE.test(key)) {
    const underscored = key.replace(/-/g, "_");
    if (DOCUMENT_TYPE_LABELS[underscored]) return DOCUMENT_TYPE_LABELS[underscored];
    if (DOCUMENT_TYPE_LABELS[key]) return DOCUMENT_TYPE_LABELS[key];
    return titleCaseAscii(key.replace(/-/g, " "));
  }
  return fallbackContentType ? CONTENT_TYPE_LABELS[fallbackContentType] : "Document";
}

export function getDisplayVisualCategory(value: string | null | undefined): string {
  const key = normalizeKey(value ?? "");
  if (!key || INTERNAL_TAG_RE.test(key)) return "Generated image";
  if (/\b(table|spreadsheet|matrix)\b/.test(key)) return "Table";
  if (/\b(chart|graph|plot|histogram)\b/.test(key)) return "Chart";
  if (/\b(diagram|flowchart|schematic|wireframe|map)\b/.test(key)) return "Diagram";
  if (/\b(photo|photograph|picture|image)\b/.test(key)) return "Image";
  if (/\b(figure|fig)\b/.test(key)) return "Figure";
  if (/\b(formula|equation)\b/.test(key)) return "Formula";
  if (/\b(sketch|illustration)\b/.test(key)) return "Illustration";
  return titleCaseAscii(key.replace(/-/g, " "));
}

export function sanitizeDisplayTag(value: string | null | undefined, maxLen = 28): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim().replace(/^#+/, "");
  const key = normalizeKey(raw);
  if (!key || INTERNAL_TAG_RE.test(key) || HASH_LIKE_RE.test(key) || FILE_LIKE_RE.test(raw)) return null;
  if (/^https?:\/\//i.test(raw)) return null;

  const mapped =
    key === "toc"
      ? "Contents"
      : key === "visual" || key === "visuals" || key === "images"
        ? "Images"
        : key === "chart" || key === "charts"
          ? "Charts"
          : key === "table" || key === "tables"
            ? "Tables"
            : key === "handwriting" || key === "handwritten"
              ? "Handwriting"
              : null;

  const label = mapped ?? (CJK_RE.test(raw) ? raw.replace(/[_-]+/g, " ") : titleCaseAscii(key.replace(/-/g, " ")));
  const compact = label.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function cleanDisplayTags(values: readonly (string | null | undefined)[], limit = 5): { tags: string[]; overflow: number } {
  const all: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const label = sanitizeDisplayTag(value);
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(label);
  }
  return {
    tags: all.slice(0, limit),
    overflow: Math.max(0, all.length - limit),
  };
}

export function buildPrimaryDocumentTags(params: {
  item: KnowledgeItem;
  documentType: string | null | undefined;
  pages: DocOraclePageRow[];
  visualCount: number;
  status: string | null | undefined;
}): { tags: string[]; overflow: number } {
  const { item, documentType, pages, visualCount, status } = params;
  const pageHasTables = pages.some((page) => normalizeKey(page.page_type ?? "").includes("table"));
  const pageHasHandwriting = pages.some((page) => {
    const blob = [page.page_type, ...(Array.isArray(page.keywords) ? page.keywords : [])].join(" ");
    return /\b(handwriting|handwritten)\b/i.test(blob);
  });
  const candidates = [
    getDisplayDocumentType(documentType, item.contentType),
    ...item.manualTags,
    ...item.aiTags,
    visualCount > 0 ? "Images" : null,
    pageHasTables ? "Tables" : null,
    pageHasHandwriting ? "Handwriting" : null,
    getDisplayStatus(status),
  ];
  return cleanDisplayTags(candidates, 5);
}
