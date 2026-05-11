/**
 * Maps `{ error, reason, detail }` payloads from knowledge AI routes into
 * the right user-facing copy string.
 *
 * Usage:
 *   const msg = friendlyAuthError(data, copy) ?? data.detail ?? data.error
 *             ?? fallbackGenericError;
 */

import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";

type MaybeAuthPayload = {
  error?: string;
  reason?: string;
  detail?: string;
};

export function friendlyAuthError(
  data: MaybeAuthPayload | undefined,
  copy: KnowledgeUiCopy["detail"],
): string | null {
  if (!data || data.error !== "unauthorized") return null;
  switch (data.reason) {
    case "session_invalid":
      return copy.authErrorSessionInvalid;
    case "dev_bypass_only":
      return copy.authErrorDevBypass;
    case "no_session":
      return copy.authErrorNoSession;
    default:
      return copy.authErrorUnknown;
  }
}
