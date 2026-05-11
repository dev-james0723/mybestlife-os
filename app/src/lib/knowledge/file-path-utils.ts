import type { KnowledgeItem } from "@/types/knowledge";

export function extFromKnowledgeFilePath(path: string | undefined | null): string {
  if (!path) return "";
  const base = path.split("/").pop() ?? "";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function isKnowledgePdfItem(item: Pick<KnowledgeItem, "filePath">): boolean {
  return extFromKnowledgeFilePath(item.filePath) === "pdf";
}

/** Editable Word path in the product (Mammoth + docx writer). */
export function isKnowledgeDocxItem(item: Pick<KnowledgeItem, "filePath">): boolean {
  const ext = extFromKnowledgeFilePath(item.filePath);
  return ext === "docx";
}

/** File uploads that can open the Doc Oracle route (workspace shows pending until analysis exists). */
const DOC_ORACLE_FILE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "md",
  "csv",
  "rtf",
]);

export function isKnowledgeOracleEligibleFile(
  item: Pick<KnowledgeItem, "sourceType" | "filePath" | "contentType">,
): boolean {
  if (!item.filePath?.trim()) return false;
  if (item.contentType === "photo") return false;
  const fromFileUpload =
    item.sourceType === "file_upload" || (item.sourceType == null && item.contentType === "file");
  if (!fromFileUpload) return false;
  return DOC_ORACLE_FILE_EXTENSIONS.has(extFromKnowledgeFilePath(item.filePath));
}
