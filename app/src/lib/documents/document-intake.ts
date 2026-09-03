import type { LifeAgentUploadAnalysis } from "@/lib/life-agent/upload-types";

export const DOCUMENT_FILES_BUCKET = "document-files";
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 5 * 60;

export const DOCUMENT_UPLOAD_MIME_TYPES: Readonly<Record<string, string>> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  rtf: "application/rtf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
};

export const DOCUMENT_SUPPORTED_FORMATS = [
  {
    group: "Documents",
    extensions: ["pdf", "docx", "txt", "md", "csv"],
    aiReady: true,
  },
  {
    group: "Images",
    extensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
    aiReady: true,
  },
  {
    group: "Store only",
    extensions: ["xlsx", "pptx", "rtf", "odt", "ods", "odp", "gif", "tif", "tiff", "bmp"],
    aiReady: false,
  },
] as const;

export type DocumentIntakeAiStatus =
  | "not_requested"
  | "skipped"
  | "complete"
  | "failed";

export type DocumentIntakeResponse = {
  uploadId: string;
  storageBucket: typeof DOCUMENT_FILES_BUCKET;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  previewUrl?: string;
  analysis?: LifeAgentUploadAnalysis;
  aiStatus: DocumentIntakeAiStatus;
  warnings: string[];
};

export type DocumentIntakeAnalyzeResponse = {
  analysis?: LifeAgentUploadAnalysis;
  aiStatus: Extract<DocumentIntakeAiStatus, "skipped" | "complete" | "failed">;
  warnings: string[];
};

export type DocumentIntakeReservationResponse = {
  uploadId: string;
  storagePath: string;
  uploadUrl: string;
};

export type DocumentIntakeDeleteRequest = {
  uploadId?: string;
  documentId?: string;
};

export type DocumentIntakeDeleteResponse = {
  deleted: true;
  uploadId?: string;
  documentId?: string;
};

export type DocumentIntakeSignedUrlResponse = {
  url: string;
};

export type DocumentFileValidationErrorCode =
  | "file_empty"
  | "file_too_large"
  | "file_name_invalid"
  | "unsupported_extension"
  | "archive_not_allowed"
  | "executable_not_allowed"
  | "macro_document_not_allowed"
  | "mime_type_mismatch"
  | "file_signature_mismatch"
  | "encrypted_document_not_allowed"
  | "invalid_office_container"
  | "unsafe_office_container";

export type DocumentFileValidationResult =
  | {
      ok: true;
      extension: string;
      mimeType: string;
      aiReady: boolean;
      warnings: string[];
    }
  | {
      ok: false;
      code: DocumentFileValidationErrorCode;
      message: string;
    };

/**
 * Keep the user's readable name while removing path separators, control
 * characters, and characters that are unreliable in object-storage keys.
 */
export function sanitizeDocumentFileName(fileName: string): string {
  const leaf = fileName.split(/[\\/]/).pop()?.normalize("NFKC").trim() ?? "";
  const cleaned = leaf
    .replace(/[\u0000-\u001f\u007f]/g, "_")
    .replace(/[^\p{L}\p{N}._() +\-]/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .trim();

  if (!cleaned) return "document";
  const characters = Array.from(cleaned);
  if (characters.length <= 160) return cleaned;

  const lastDot = cleaned.lastIndexOf(".");
  const extension = lastDot > 0 ? cleaned.slice(lastDot).slice(0, 16) : "";
  const stemLimit = Math.max(1, 160 - Array.from(extension).length);
  return `${characters.slice(0, stemLimit).join("")}${extension}`;
}

export function buildDocumentStoragePath(
  userId: string,
  uploadId: string,
  fileName: string,
): string {
  return `${userId}/${uploadId}/${sanitizeDocumentFileName(fileName)}`;
}

/**
 * RLS remains the source of truth. This is an additional route-level guard so
 * the API never attempts to sign or delete a path outside the signed-in user.
 */
export function isOwnedDocumentStoragePath(
  storagePath: string,
  userId: string,
): boolean {
  if (!storagePath || !userId || storagePath.startsWith("/") || storagePath.includes("\\")) {
    return false;
  }
  if (/[\u0000-\u001f\u007f]/.test(storagePath)) return false;

  const segments = storagePath.split("/");
  if (segments.length < 3 || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return false;
  }

  return segments[0] === userId;
}

export function parseDocumentAnalyzeField(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

export function normalizeDocumentUploadId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uploadId = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    uploadId,
  )
    ? uploadId
    : null;
}

export function normalizeDocumentId(value: unknown): string | null {
  return normalizeDocumentUploadId(value);
}

export function normalizeDocumentLocale(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "en";
  const locale = value.trim();
  return /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8}){0,3}$/.test(locale)
    ? locale.slice(0, 35)
    : "en";
}
