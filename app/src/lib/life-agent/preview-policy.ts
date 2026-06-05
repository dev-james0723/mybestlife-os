/** Max age for a pending action preview before confirm is rejected (24h). */
export const LIFE_AGENT_PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;

export function isPreviewExpired(
  createdAt: string,
  nowMs: number = Date.now(),
): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return true;
  return nowMs - created > LIFE_AGENT_PREVIEW_TTL_MS;
}
