/**
 * Knowledge file upload limits and validation (shared client + server).
 */

/** Video uploads are capped at 1 GB (bucket / product limit). */
export const KNOWLEDGE_VIDEO_MAX_BYTES = 1024 * 1024 * 1024;

/** Raster photo uploads (JPEG/PNG/HEIC/…) — keeps Gemini extraction + gallery UX predictable. */
export const KNOWLEDGE_PHOTO_MAX_BYTES = 25 * 1024 * 1024;

/** Ceiling for non-photo, non-video files (PDF, Office, audio, …). */
export const KNOWLEDGE_FILE_MAX_BYTES = KNOWLEDGE_VIDEO_MAX_BYTES;

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "webm",
  "avi",
  "mkv",
  "m4v",
  "mpeg",
  "mpg",
]);

export function isVideoExtension(ext: string): boolean {
  return VIDEO_EXTENSIONS.has(ext.toLowerCase());
}

/** Browser file input `accept` — broad MIME groups plus common extensions (incl. Office). */
export const KNOWLEDGE_FILE_INPUT_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "audio/*",
  "video/*",
  "image/*",
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".md",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".heic",
  ".heif",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  ".mp4",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
].join(",");

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  heic: "image/heic",
  heif: "image/heif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  aac: "audio/aac",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
};

export function guessMimeFromExtension(ext: string): string | undefined {
  const e = ext.toLowerCase();
  return MIME_BY_EXT[e];
}

const PHOTO_EXTENSIONS = new Set([
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

/** True when the selected file should use the upload itself as the card thumbnail (no AI style picker). */
export function isKnowledgePhotoFile(file: File): boolean {
  const t = file.type?.trim().toLowerCase() ?? "";
  if (t.startsWith("image/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return PHOTO_EXTENSIONS.has(ext);
}

export function clientValidateKnowledgeFileBeforeUpload(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type || "";
  const treatAsVideo =
    isVideoExtension(ext) || mime.startsWith("video/");
  if (treatAsVideo && file.size > KNOWLEDGE_VIDEO_MAX_BYTES) {
    return "VIDEO_TOO_LARGE";
  }

  const treatAsPhoto = isKnowledgePhotoFile(file);
  if (treatAsPhoto && file.size > KNOWLEDGE_PHOTO_MAX_BYTES) {
    return "PHOTO_TOO_LARGE";
  }

  if (!treatAsPhoto && !treatAsVideo && file.size > KNOWLEDGE_FILE_MAX_BYTES) {
    return "FILE_TOO_LARGE";
  }
  return null;
}
