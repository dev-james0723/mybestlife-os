/**
 * GET /api/social/callback/[provider]
 *
 * OAuth callback. Verifies state, exchanges code for token, encrypts and
 * saves, then redirects to the Settings → Social Integrations page with a
 * status flag.
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOAuthProvider } from "@/types/knowledge-source";
import { safeStringEqual } from "@/lib/security/token-crypto";
import {
  buildSettingsSocialOAuthReturnUrl,
  clientIdFor,
  clientSecretFor,
  getOAuthConfig,
  redirectUriFor,
} from "@/lib/social/oauth-configs";
import { saveConnection } from "@/lib/social/connection-store";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      buildSettingsSocialOAuthReturnUrl(req, {
        status: "error",
        provider,
        msg: "not_signed_in",
      }),
    );
  }

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_description") ?? error ?? undefined;

  // Always clear the state cookie on the way out — even if we error.
  const cookieStore = await cookies();
  const cookieName = `social_oauth_state_${provider}`;
  const expected = cookieStore.get(cookieName)?.value;
  cookieStore.delete(cookieName);

  if (error) {
    return NextResponse.redirect(
      buildSettingsSocialOAuthReturnUrl(req, {
        status: "error",
        provider,
        msg: errorReason,
      }),
    );
  }
  if (!code || !state || !expected || !safeStringEqual(state, expected)) {
    return NextResponse.redirect(
      buildSettingsSocialOAuthReturnUrl(req, {
        status: "error",
        provider,
        msg: "state_mismatch",
      }),
    );
  }

  const cfg = getOAuthConfig(provider);
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientIdFor(provider),
    redirect_uri: redirectUriFor(provider, req),
  });
  if (!cfg.basicAuth) {
    tokenBody.set("client_secret", clientSecretFor(provider));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "User-Agent": "MyLifeOS-Knowledge/1.0",
  };
  if (cfg.basicAuth) {
    const basic = Buffer.from(
      `${clientIdFor(provider)}:${clientSecretFor(provider)}`,
    ).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  }

  let tokenJson: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    error?: string;
    error_description?: string;
  };
  try {
    const res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers,
      body: tokenBody.toString(),
      signal: AbortSignal.timeout(10_000),
    });
    tokenJson = (await res.json()) as typeof tokenJson;
    if (!res.ok || tokenJson.error || !tokenJson.access_token) {
      const reason = tokenJson.error_description ?? tokenJson.error ?? `http_${res.status}`;
      return NextResponse.redirect(
        buildSettingsSocialOAuthReturnUrl(req, { status: "error", provider, msg: reason }),
      );
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token_exchange_failed";
    return NextResponse.redirect(
      buildSettingsSocialOAuthReturnUrl(req, { status: "error", provider, msg: reason }),
    );
  }

  const accessToken = tokenJson.access_token!;
  const refreshToken = tokenJson.refresh_token;
  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : undefined;
  const scopes = tokenJson.scope
    ? tokenJson.scope.split(/[\s,]+/).filter(Boolean)
    : cfg.scopes;

  const account = cfg.fetchAccountInfo ? await cfg.fetchAccountInfo(accessToken) : {};

  try {
    await saveConnection({
      userId: user.id,
      provider,
      accessToken,
      refreshToken,
      expiresAt,
      scopes,
      providerAccountId: account.providerAccountId,
      accountName: account.accountName,
      accountHandle: account.accountHandle,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "save_failed";
    return NextResponse.redirect(
      buildSettingsSocialOAuthReturnUrl(req, { status: "error", provider, msg: reason }),
    );
  }

  return NextResponse.redirect(
    buildSettingsSocialOAuthReturnUrl(req, { status: "connected", provider }),
  );
}
