/**
 * GET /api/social/connect/[provider]
 *
 * Starts the OAuth flow. Generates a CSRF state, sets it in an http-only
 * cookie, and 302-redirects to the provider's authorize URL.
 *
 * The callback route will verify the state cookie matches the `state`
 * query param before exchanging the code for a token.
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOAuthProvider } from "@/types/knowledge-source";
import {
  buildSettingsSocialOAuthReturnUrl,
  clientIdFor,
  getOAuthConfig,
  redirectUriFor,
} from "@/lib/social/oauth-configs";
import { randomUrlSafeToken } from "@/lib/security/token-crypto";

function oauthStartErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "oauth_start_failed";
  const m = err.message;
  if (m.includes("META_APP_ID")) return "missing_meta_app_id";
  if (m.includes("META_APP_SECRET")) return "missing_meta_app_secret";
  if (m.includes("REDDIT_CLIENT_ID")) return "missing_reddit_client_id";
  if (m.includes("REDDIT_CLIENT_SECRET")) return "missing_reddit_client_secret";
  if (m.includes("GITHUB_CLIENT_ID")) return "missing_github_client_id";
  if (m.includes("GITHUB_CLIENT_SECRET")) return "missing_github_client_secret";
  if (m.includes("APP_BASE_URL") || m.includes("NEXT_PUBLIC_APP_BASE_URL")) {
    return "missing_app_base_url";
  }
  if (m.includes("OAuth not configured")) return "provider_not_configured";
  return m.length > 180 ? `${m.slice(0, 180)}…` : m;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  try {
    // Require an authenticated user — connections are per-user.
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const back = buildSettingsSocialOAuthReturnUrl(req, {
        status: "error",
        provider,
        msg: "not_signed_in",
      });
      return NextResponse.redirect(back);
    }

    const cfg = getOAuthConfig(provider);
    const state = randomUrlSafeToken(32);
    const cookieStore = await cookies();
    cookieStore.set({
      name: `social_oauth_state_${provider}`,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/social",
      maxAge: 60 * 10, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: clientIdFor(provider),
      redirect_uri: redirectUriFor(provider, req),
      response_type: "code",
      scope: cfg.scopes.join(cfg.scopeJoiner),
      state,
      ...(cfg.extraAuthParams ?? {}),
    });

    const authorizeUrl = `${cfg.authorizeUrl}?${params.toString()}`;
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    const msg = oauthStartErrorMessage(err);
    const back = buildSettingsSocialOAuthReturnUrl(req, {
      status: "error",
      provider,
      msg,
    });
    return NextResponse.redirect(back);
  }
}
