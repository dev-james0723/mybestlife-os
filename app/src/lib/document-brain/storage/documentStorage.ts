/**
 * User-scoped storage prefixes under the `knowledge-files` bucket.
 * documentId === knowledge_items.id
 */
export function docBrainRootPrefix(userId: string, documentId: string): string {
  return `${userId}/documents/${documentId}`;
}

export function docBrainSourceOriginalPath(userId: string, documentId: string, ext: string): string {
  return `${docBrainRootPrefix(userId, documentId)}/source/original.${ext}`;
}

export function docBrainMineruRawPrefix(userId: string, documentId: string): string {
  return `${docBrainRootPrefix(userId, documentId)}/mineru/raw`;
}

export function docBrainPageImagePath(
  userId: string,
  documentId: string,
  pageIndex1: number,
  ext = "png",
): string {
  const n = String(pageIndex1).padStart(4, "0");
  return `${docBrainRootPrefix(userId, documentId)}/pages/page_${n}.${ext}`;
}

export function docBrainNormalizedJsonPath(userId: string, documentId: string): string {
  return `${docBrainRootPrefix(userId, documentId)}/docoracle/normalized.json`;
}
