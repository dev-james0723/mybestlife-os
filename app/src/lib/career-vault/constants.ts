import type { CareerVaultCategory } from "@/types/career-vault";

export const CAREER_VAULT_BUCKET = "career-vault";

export const CAREER_VAULT_MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export const CAREER_VAULT_CATEGORIES = [
  "resume",
  "cover_letter",
  "photo",
  "bio",
  "portfolio",
  "credential",
  "reference",
  "application",
] as const satisfies readonly CareerVaultCategory[];

/** Category → emoji used in pill filters, badges, empty state suggestions. */
export const CAREER_VAULT_CATEGORY_EMOJI: Record<CareerVaultCategory, string> = {
  resume: "📄",
  cover_letter: "✉️",
  photo: "📸",
  bio: "✍️",
  portfolio: "🎨",
  credential: "🎓",
  reference: "📋",
  application: "💼",
};

/** Extensions users can drop in. Kept in sync with storage bucket allowed_mime_types. */
export const CAREER_VAULT_ACCEPTED_MIME: Record<string, readonly string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/markdown": [".md", ".markdown"],
  "text/plain": [".txt"],
};

export const CAREER_VAULT_ACCEPTED_MIME_TYPES: readonly string[] =
  Object.keys(CAREER_VAULT_ACCEPTED_MIME);

/** Best-effort MIME detection when a browser hands us an empty `type` (common for .md). */
export function inferMimeFromFilename(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "md":
    case "markdown":
      return "text/markdown";
    case "txt":
      return "text/plain";
    default:
      return null;
  }
}
