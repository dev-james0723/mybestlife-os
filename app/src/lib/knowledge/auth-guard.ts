/**
 * Shared auth guard for knowledge AI API routes.
 *
 * Distinguishes between:
 *   - `no_session`        : no Supabase cookies at all (probably logged out)
 *   - `dev_bypass_only`   : the dev `mylifeos_dev_bypass` cookie is set but no
 *                           real Supabase session exists. Middleware lets the
 *                           user onto pages, but AI routes need a real user
 *                           id for RLS-safe reads. Tell them to log in with a
 *                           real account.
 *   - `session_invalid`   : Supabase cookie present but `getUser()` failed —
 *                           usually expired / refresh failed. Ask to re-login.
 *
 * Returns either a resolved `user` or a typed failure that callers turn into a
 * NextResponse with a stable error-code in the body. UI components then map
 * the code to a friendly message.
 */

import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DEV_LOGIN_BYPASS_COOKIE,
  isDevLoginBypassFeatureEnabled,
} from "@/lib/dev-login-bypass";

export type KnowledgeAuthReason =
  | "no_session"
  | "dev_bypass_only"
  | "session_invalid";

export type KnowledgeAuthGuardResult =
  | { ok: true; user: { id: string; email: string | null } }
  | { ok: false; reason: KnowledgeAuthReason; detail: string };

const FRIENDLY_DETAIL: Record<KnowledgeAuthReason, string> = {
  no_session:
    "You need to sign in to use this AI feature. Open the login page and continue with Google or email.",
  dev_bypass_only:
    "You're using the Dev / Skip login mode. AI features need a real account — please log in with Google or email.",
  session_invalid:
    "Your session has expired. Log out and log back in, then try again.",
};

export async function requireKnowledgeUser(): Promise<KnowledgeAuthGuardResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.getUser();
  if (data?.user) {
    return { ok: true, user: { id: data.user.id, email: data.user.email ?? null } };
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const hasDevBypass =
    isDevLoginBypassFeatureEnabled() &&
    allCookies.some((c) => c.name === DEV_LOGIN_BYPASS_COOKIE && c.value === "1");
  const hasSupabaseCookie = allCookies.some((c) => /^sb-/.test(c.name));

  let reason: KnowledgeAuthReason;
  if (hasSupabaseCookie) {
    reason = "session_invalid";
  } else if (hasDevBypass) {
    reason = "dev_bypass_only";
  } else {
    reason = "no_session";
  }

  return {
    ok: false,
    reason,
    detail: error?.message
      ? `${FRIENDLY_DETAIL[reason]} (${error.message})`
      : FRIENDLY_DETAIL[reason],
  };
}

/**
 * Error-payload shape that every knowledge AI route emits for auth failures.
 * Stable across routes so UI components can map `reason` → friendly copy.
 */
export type KnowledgeAuthErrorPayload = {
  error: "unauthorized";
  reason: KnowledgeAuthReason;
  detail: string;
};

export function unauthorizedPayload(
  result: Extract<KnowledgeAuthGuardResult, { ok: false }>,
): KnowledgeAuthErrorPayload {
  return {
    error: "unauthorized",
    reason: result.reason,
    detail: result.detail,
  };
}
