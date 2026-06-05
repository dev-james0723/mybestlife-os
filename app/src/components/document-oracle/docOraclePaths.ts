const DOC_ORACLE_FIXTURE_ASSET_PREFIX = "doc-oracle-fixture/";

export function knowledgeFilesApiHref(filePath: string): string {
  if (filePath.startsWith(DOC_ORACLE_FIXTURE_ASSET_PREFIX)) {
    const fixturePath = filePath.slice(DOC_ORACLE_FIXTURE_ASSET_PREFIX.length);
    return `/api/document-brain/fixture-assets/${fixturePath.split("/").map(encodeURIComponent).join("/")}`;
  }
  return `/api/knowledge-files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

/** PDF viewer fragment used by Doc Oracle source iframe and deep links. */
export function sourcePdfHref(filePath: string | null | undefined, page?: number | null): string | null {
  if (!filePath?.trim()) return null;
  const base = knowledgeFilesApiHref(filePath.trim());
  if (page != null && Number.isFinite(page) && page > 0) return `${base}#page=${Math.floor(page)}`;
  return base;
}
