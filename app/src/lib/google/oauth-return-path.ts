/**
 * Validates a post-OAuth browser redirect path (pathname only).
 * Prevents open redirects while allowing locale slug + `/settings` (any nested
 * settings route) or `/daily-planner`.
 */
export function safeGoogleCalendarOAuthReturnPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!path.startsWith("/") || path.includes("//") || path.includes("..")) return null;
  const normalized = path.replace(/\/$/, "") || "/";
  // Locale URL slugs are lowercase alphanumerics + hyphen (e.g. zh-hk, zh-cn).
  const settingsTree = /^\/[a-z0-9-]+\/settings(?:\/[a-z0-9-]+)*$/i;
  const plannerOnly = /^\/[a-z0-9-]+\/daily-planner$/i;
  if (!settingsTree.test(normalized) && !plannerOnly.test(normalized)) return null;
  return normalized;
}
