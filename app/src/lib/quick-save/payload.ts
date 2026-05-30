import type {
  Json,
  QuickSaveCapture,
  QuickSaveCaptureDestination,
  QuickSaveCaptureStatus,
  QuickSaveDefaultDestination,
  QuickSaveFileRef,
} from "@/types/database";

export const QUICK_SAVE_TEXT_LIMIT = 20_000;
export const QUICK_SAVE_TITLE_LIMIT = 300;

const HTTP_URL_RE = /https?:\/\/[^\s<>"']+/i;

export function normalizeQuickSaveDestination(
  value: unknown,
): QuickSaveDefaultDestination {
  if (value === "knowledge" || value === "idea" || value === "review") return value;
  return "review";
}

export function extractFirstHttpUrl(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const match = value.match(HTTP_URL_RE);
    if (!match?.[0]) continue;
    const candidate = match[0].replace(/[),.;\]}>]+$/g, "");
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}

export function cleanSharedString(value: FormDataEntryValue | null, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\u0000/g, "").trim();
  if (!trimmed) return null;
  return trimmed.slice(0, limit);
}

export function sanitizeSharedFilename(name: string): string {
  const trimmed = name.trim().replace(/[/\\]+/g, "-");
  const cleaned = trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 140);
  return cleaned || `shared-file-${crypto.randomUUID()}`;
}

export function quickSaveFileRefsToJson(fileRefs: QuickSaveFileRef[]): Json[] {
  return fileRefs.map((file) => ({
    type: "quick_save_file",
    name: file.name,
    mime_type: file.mime_type,
    size: file.size,
    storage_path: file.storage_path,
    public_url: file.public_url ?? null,
  }));
}

function coerceFileRefs(value: unknown): QuickSaveFileRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
    const storagePath =
      typeof row.storage_path === "string" && row.storage_path.trim()
        ? row.storage_path.trim()
        : null;
    const size = typeof row.size === "number" && Number.isFinite(row.size) ? row.size : 0;
    if (!name || !storagePath) return [];
    return [
      {
        name,
        mime_type:
          typeof row.mime_type === "string" && row.mime_type.trim()
            ? row.mime_type.trim()
            : null,
        size,
        storage_path: storagePath,
        public_url:
          typeof row.public_url === "string" && row.public_url.trim()
            ? row.public_url.trim()
            : null,
      },
    ];
  });
}

function coerceStatus(value: unknown): QuickSaveCaptureStatus {
  if (value === "pending" || value === "saved" || value === "discarded" || value === "failed") {
    return value;
  }
  return "pending";
}

function coerceCaptureDestination(value: unknown): QuickSaveCaptureDestination | null {
  if (value === "knowledge" || value === "idea") return value;
  return null;
}

function coerceNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeQuickSaveCapture(row: unknown): QuickSaveCapture {
  const r = (row ?? {}) as Record<string, unknown>;
  const now = new Date().toISOString();
  return {
    id: typeof r.id === "string" ? r.id : "",
    user_id: typeof r.user_id === "string" ? r.user_id : "",
    title: coerceNullableString(r.title),
    text: coerceNullableString(r.text),
    url: coerceNullableString(r.url),
    normalized_url: coerceNullableString(r.normalized_url),
    file_refs: coerceFileRefs(r.file_refs),
    status: coerceStatus(r.status),
    destination: coerceCaptureDestination(r.destination),
    error_message: coerceNullableString(r.error_message),
    created_at: typeof r.created_at === "string" ? r.created_at : now,
    updated_at: typeof r.updated_at === "string" ? r.updated_at : now,
  };
}

export function buildQuickSaveIdeaContent(input: {
  title: string | null;
  text: string | null;
  normalizedUrl: string | null;
  fileRefs: QuickSaveFileRef[];
}): string {
  const parts = [
    input.title ? `Title: ${input.title}` : "",
    input.text,
    input.normalizedUrl ? `URL: ${input.normalizedUrl}` : "",
    input.fileRefs.length > 0
      ? `Files: ${input.fileRefs.map((file) => file.name).join(", ")}`
      : "",
    "Source: Quick Save share sheet",
  ].filter((part): part is string => Boolean(part && part.trim()));

  return parts.join("\n\n") || "Shared from Quick Save";
}
