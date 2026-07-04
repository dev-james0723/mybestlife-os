import type { ContentType, KnowledgeItem } from "@/types/knowledge";

const EXTENSION_TYPE_MAP: Record<string, ContentType> = {
  pdf: "document",
  doc: "document",
  docx: "document",
  rtf: "document",
  txt: "document",
  md: "document",
  markdown: "document",
  csv: "dataset",
  tsv: "dataset",
  xls: "dataset",
  xlsx: "dataset",
  numbers: "dataset",
  ppt: "presentation",
  pptx: "presentation",
  key: "presentation",
};

function extensionFromPathOrTitle(filePath?: string, title?: string): string {
  const fileName = filePath?.split("/").pop() ?? title;
  const ext = fileName?.trim().split(".").pop()?.toLowerCase() ?? "";
  return ext.length <= 12 ? ext : "";
}

export function getKnowledgeDisplayContentType(
  item: Pick<KnowledgeItem, "contentType" | "sourceType" | "filePath" | "title">,
): ContentType {
  if (item.contentType !== "file") {
    return item.contentType;
  }

  const ext = extensionFromPathOrTitle(item.filePath, item.title);
  return EXTENSION_TYPE_MAP[ext] ?? item.contentType;
}
