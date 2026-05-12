export function knowledgeFilesApiHref(filePath: string): string {
  return `/api/knowledge-files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}
