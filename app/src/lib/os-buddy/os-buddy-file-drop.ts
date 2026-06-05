import type { Json } from "@/types/database";

export type OSBuddyDropDestination = "knowledge" | "idea" | "both";

export type OSBuddyDroppedFileKind =
  | "document"
  | "image"
  | "audio"
  | "video"
  | "spreadsheet"
  | "unknown";

export type OSBuddyDroppedFileStatus =
  | "queued"
  | "uploading"
  | "saving"
  | "done"
  | "failed";

export type OSBuddyDroppedFileItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  mime: string | null;
  kind: OSBuddyDroppedFileKind;
  destination: OSBuddyDropDestination;
  status: OSBuddyDroppedFileStatus;
  error?: string | null;
  knowledgeItemId?: string | null;
  ideaId?: string | null;
};

export type OSBuddyFileAttachmentInput = {
  storagePath: string;
  name: string;
  mimeType: string | null;
  size: number;
  kind: OSBuddyDroppedFileKind;
};

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "txt",
  "md",
  "rtf",
  "json",
  "epub",
]);

const SPREADSHEET_EXTENSIONS = new Set(["xls", "xlsx", "csv", "tsv", "ods", "numbers"]);
const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "heic",
  "heif",
  "avif",
  "bmp",
  "tif",
  "tiff",
]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac", "webm"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "webm", "mkv", "m4v", "mpeg", "mpg"]);

export const OS_BUDDY_DROP_DESTINATION_LABELS: Record<OSBuddyDropDestination, string> = {
  knowledge: "Knowledge Base",
  idea: "Idea Capture",
  both: "Both",
};

export const OS_BUDDY_FILE_KIND_LABELS: Record<OSBuddyDroppedFileKind, string> = {
  document: "Document",
  image: "Image",
  audio: "Audio",
  video: "Video",
  spreadsheet: "Spreadsheet",
  unknown: "File",
};

export function getOSBuddyFileExtension(name: string): string {
  const ext = name.split(".").pop()?.trim().toLowerCase() ?? "";
  return /^[a-z0-9]{1,12}$/.test(ext) ? ext : "";
}

export function classifyOSBuddyDroppedFile(input: {
  name: string;
  mime?: string | null;
}): OSBuddyDroppedFileKind {
  const mime = input.mime?.trim().toLowerCase() ?? "";
  const ext = getOSBuddyFileExtension(input.name);

  if (mime.startsWith("image/") || IMAGE_EXTENSIONS.has(ext)) return "image";
  if (mime.startsWith("audio/") || AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (mime.startsWith("video/") || VIDEO_EXTENSIONS.has(ext)) return "video";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv" ||
    SPREADSHEET_EXTENSIONS.has(ext)
  ) {
    return "spreadsheet";
  }
  if (
    mime === "application/pdf" ||
    mime.includes("wordprocessingml") ||
    mime.includes("presentationml") ||
    mime.startsWith("text/") ||
    DOCUMENT_EXTENSIONS.has(ext)
  ) {
    return "document";
  }

  return "unknown";
}

export function defaultOSBuddyDropDestinationForKind(
  kind: OSBuddyDroppedFileKind,
): OSBuddyDropDestination {
  return kind === "image" ? "idea" : "knowledge";
}

export function createOSBuddyDroppedFileItem(
  file: File,
  idFactory: () => string = () => crypto.randomUUID(),
): OSBuddyDroppedFileItem {
  const kind = classifyOSBuddyDroppedFile({
    name: file.name,
    mime: file.type || null,
  });
  return {
    id: idFactory(),
    file,
    name: file.name || "Untitled file",
    size: file.size,
    mime: file.type || null,
    kind,
    destination: defaultOSBuddyDropDestinationForKind(kind),
    status: "queued",
    error: null,
    knowledgeItemId: null,
    ideaId: null,
  };
}

export function groupOSBuddyDroppedFilesByKind(items: OSBuddyDroppedFileItem[]) {
  const groups = new Map<OSBuddyDroppedFileKind, OSBuddyDroppedFileItem[]>();
  for (const item of items) {
    const existing = groups.get(item.kind) ?? [];
    existing.push(item);
    groups.set(item.kind, existing);
  }
  return Array.from(groups.entries()).map(([kind, files]) => ({ kind, files }));
}

export function buildOSBuddyIdeaAttachment(input: OSBuddyFileAttachmentInput): Json {
  return {
    type: "os_buddy_file",
    bucket: "knowledge-files",
    storage_path: input.storagePath,
    name: input.name,
    mime_type: input.mimeType,
    size: input.size,
    kind: input.kind,
  };
}

export function buildOSBuddyIdeaContent(input: {
  name: string;
  kind: OSBuddyDroppedFileKind;
  knowledgeItemId?: string | null;
}): string {
  const lines = [
    `File captured by OSBuddy: ${input.name}`,
    `Type: ${OS_BUDDY_FILE_KIND_LABELS[input.kind]}`,
  ];
  if (input.knowledgeItemId) {
    lines.push(`Linked Knowledge Base item: ${input.knowledgeItemId}`);
  }
  return lines.join("\n");
}

export function formatOSBuddyFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  const formatted = value.toFixed(precision).replace(/\.0$/, "");
  return `${formatted} ${units[unitIndex]}`;
}
