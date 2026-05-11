/**
 * Human-readable labels + icons for `source_type === file_upload` knowledge items.
 * Uses filename extension and `content_type` so badges are not all generic "File".
 */

import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";
import type { LucideIconName } from "@/lib/knowledge/labels";
import type { KnowledgeItem } from "@/types/knowledge";

export type UploadKindLabelKey = keyof KnowledgeUiCopy["uploadKindLabels"];

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "svg",
  "heic",
  "heif",
  "tif",
  "tiff",
]);

function extractExtension(filePath?: string, title?: string): string {
  const seg = filePath?.split("/").pop();
  if (seg?.includes(".")) {
    return seg.split(".").pop()?.toLowerCase() ?? "";
  }
  if (title?.includes(".")) {
    const t = title.trim().split(".").pop()?.toLowerCase();
    if (t && t.length <= 12 && !t.includes(" ")) return t;
  }
  return "";
}

function classifyExtension(ext: string, contentType: KnowledgeItem["contentType"]): UploadKindLabelKey {
  if (!ext) return "genericFile";
  if (IMAGE_EXT.has(ext)) return "image";
  if (ext === "pdf") return "pdfFile";
  if (ext === "doc" || ext === "docx") return "wordFile";
  if (ext === "xls" || ext === "xlsx") return "excelFile";
  if (ext === "ppt" || ext === "pptx") return "powerpointFile";
  if (ext === "md" || ext === "markdown") return "markdownFile";
  if (ext === "txt" || ext === "rtf") return "textFile";
  if (ext === "csv") return "csvFile";
  if (["zip", "rar", "7z", "tar", "gz", "tgz"].includes(ext)) return "archiveFile";
  if (
    ["js", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java", "c", "cpp", "cs", "swift", "kt", "json", "yaml", "yml"].includes(
      ext,
    )
  ) {
    return "codeFile";
  }
  if (["mp3", "wav", "m4a", "aac", "flac", "ogg", "opus"].includes(ext)) return "audioFile";
  if (["mp4", "mov", "avi", "mkv", "m4v", "mpeg", "mpg"].includes(ext)) return "videoFile";
  if (ext === "webm") return contentType === "podcast" ? "audioFile" : "videoFile";
  return "genericFile";
}

const UPLOAD_KIND_ICONS: Record<UploadKindLabelKey, LucideIconName> = {
  image: "Image",
  pdfFile: "FileText",
  wordFile: "FileType2",
  excelFile: "FileSpreadsheet",
  powerpointFile: "Presentation",
  markdownFile: "FileCode",
  textFile: "FileText",
  csvFile: "FileSpreadsheet",
  audioFile: "Music",
  videoFile: "Film",
  archiveFile: "Archive",
  codeFile: "FileCode",
  genericFile: "Paperclip",
};

export function getKnowledgeUploadBadgePresentation(
  item: KnowledgeItem,
  labels: KnowledgeUiCopy["uploadKindLabels"],
): { label: string; iconName: LucideIconName } | null {
  if (item.sourceType !== "file_upload") return null;

  let key: UploadKindLabelKey;

  if (item.contentType === "photo") {
    key = "image";
  } else if (item.contentType === "video") {
    key = "videoFile";
  } else if (item.contentType === "podcast") {
    key = "audioFile";
  } else {
    const ext = extractExtension(item.filePath, item.title);
    key = classifyExtension(ext, item.contentType);
  }

  return {
    label: labels[key],
    iconName: UPLOAD_KIND_ICONS[key],
  };
}
