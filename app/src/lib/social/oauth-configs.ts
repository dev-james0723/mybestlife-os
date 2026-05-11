/**
 * OAuth provider configurations for Meta / Reddit / GitHub.
 *
 * Each config tells the connect/callback routes how to assemble the
 * authorization URL, exchange a code for a token, and fetch account info
 * after success. All client secrets live in env vars and are read here only.
 *
 * Required env vars:
 *   META_APP_ID
 *   META_APP_SECRET
 *   REDDIT_CLIENT_ID
 *   REDDIT_CLIENT_SECRET
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *   APP_BASE_URL  — fully qualified (e.g. https://app.example.com)
 *                   used to construct redirect_uri unless overridden
 *
 * When env is unset, `redirectUriFor` / `buildSettingsSocialOAuthReturnUrl`
 * fall back to `request.nextUrl.origin` so production (e.g. Vercel) still works
 * and error handlers never throw while building a redirect. Register that exact
 * callback URL in the Meta / GitHub / Reddit app (including www vs apex).
 */

import type { NextRequest } from "next/server";
import { defaultLocalizedPath } from "@/lib/i18n/locale-path";
import type { OAuthProvider } from "@/types/knowledge-source";

export type OAuthAccountInfo = {
  providerAccountId?: string;
  accountName?: string;
  accountHandle?: string;
};

export type OAuthProviderConfig = {
  name: OAuthProvider;
  authorizeUrl: string;
  tokenUrl: string;
  /** Scopes appended to the authorize URL. Comma-separated (Reddit) or
   *  space-separated (Meta/GitHub) per provider convention. */
  scopes: string[];
  /** Joiner for the `scope` parameter. Differs per provider. */
  scopeJoiner: string;
  /** Whether the token endpoint expects HTTP Basic Auth (Reddit). */
  basicAuth?: boolean;
  /** Extra query params to add to the authorize URL. */
  extraAuthParams?: Record<string, string>;
  /** Optional account-info fetcher run after token exchange. */
  fetchAccountInfo?: (accessToken: string) => Promise<OAuthAccountInfo>;
};

type OAuthRequestHint = Pick<NextRequest, "nextUrl">;

/**
 * Canonical site origin for OAuth `redirect_uri` and post-login redirects.
 * Prefer env when set (stable across internal fetches); otherwise use the
 * incoming request origin so localhost and deployed hosts work without env.
 */
export function resolveOAuthAppBaseUrl(request?: OAuthRequestHint): string {
  const fromEnv = (process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_BASE_URL)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (request?.nextUrl?.origin) {
    return request.nextUrl.origin.replace(/\/+$/, "");
  }
  throw new Error(
    "Set APP_BASE_URL or NEXT_PUBLIC_APP_BASE_URL, or call OAuth routes with a full request URL.",
  );
}

export function redirectUriFor(
  provider: OAuthProvider,
  request?: OAuthRequestHint,
): string {
  return `${resolveOAuthAppBaseUrl(request)}/api/social/callback/${provider}`;
}

/** After OAuth, send the user to Settings → Social Integrations (locale-prefixed). */
export function buildSettingsSocialOAuthReturnUrl(
  request: OAuthRequestHint,
  args: { status: "connected" | "error"; provider: string; msg?: string },
): URL {
  const base = resolveOAuthAppBaseUrl(request);
  const path = defaultLocalizedPath("/settings");
  const url = new URL(path, `${base}/`);
  url.searchParams.set("provider", args.provider);
  url.searchParams.set("status", args.status);
  if (args.msg) url.searchParams.set("msg", args.msg);
  url.hash = "social-integrations";
  return url;
}

export function clientIdFor(provider: OAuthProvider): string {
  switch (provider) {
    case "meta":
      return required("META_APP_ID");
    case "reddit":
      return required("REDDIT_CLIENT_ID");
    case "github":
      return required("GITHUB_CLIENT_ID");
    case "x":
      return required("X_CLIENT_ID"); // not currently wired for OAuth
  }
}

export function clientSecretFor(provider: OAuthProvider): string {
  switch (provider) {
    case "meta":
      return required("META_APP_SECRET");
    case "reddit":
      return required("REDDIT_CLIENT_SECRET");
    case "github":
      return required("GITHUB_CLIENT_SECRET");
    case "x":
      return required("X_CLIENT_SECRET");
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required.`);
  return v;
}

/* ───────────────────────── per-provider configs ────────────────────────── */

const meta: OAuthProviderConfig = {
  name: "meta",
  authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
  scopes: [
    "public_profile",
    "instagram_basic",
    "instagram_oembed",
    "pages_read_engagement",
  ],
  scopeJoiner: ",",
  async fetchAccountInfo(accessToken) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return {};
      const json = (await res.json()) as { id?: string; name?: string };
      return {
        providerAccountId: json.id,
        accountName: json.name,
      };
    } catch {
      return {};
    }
  },
};

const reddit: OAuthProviderConfig = {
  name: "reddit",
  authorizeUrl: "https://www.reddit.com/api/v1/authorize",
  tokenUrl: "https://www.reddit.com/api/v1/access_token",
  scopes: ["read", "identity"],
  scopeJoiner: " ",
  basicAuth: true,
  extraAuthParams: {
    duration: "permanent",
    response_type: "code",
  },
  async fetchAccountInfo(accessToken) {
    try {
      const res = await fetch("https://oauth.reddit.com/api/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "MyLifeOS-Knowledge/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return {};
      const json = (await res.json()) as { id?: string; name?: string };
      return {
        providerAccountId: json.id,
        accountName: json.name,
        accountHandle: json.name ? `u/${json.name}` : undefined,
      };
    } catch {
      return {};
    }
  },
};

const github: OAuthProviderConfig = {
  name: "github",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scopes: ["read:user", "public_repo"],
  scopeJoiner: " ",
  async fetchAccountInfo(accessToken) {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MyLifeOS-Knowledge/1.0",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return {};
      const json = (await res.json()) as { id?: number; login?: string; name?: string };
      return {
        providerAccountId: json.id ? String(json.id) : undefined,
        accountName: json.name ?? json.login,
        accountHandle: json.login ? `@${json.login}` : undefined,
      };
    } catch {
      return {};
    }
  },
};

export const OAUTH_CONFIGS: Record<OAuthProvider, OAuthProviderConfig> = {
  meta,
  reddit,
  github,
  // X OAuth is intentionally not wired in this pass — X's tokenless
  // publish.twitter.com/oembed already covers public posts.
  x: {
    name: "x",
    authorizeUrl: "",
    tokenUrl: "",
    scopes: [],
    scopeJoiner: " ",
  },
};

export function getOAuthConfig(provider: OAuthProvider): OAuthProviderConfig {
  const cfg = OAUTH_CONFIGS[provider];
  if (!cfg.authorizeUrl) {
    throw new Error(`OAuth not configured for provider: ${provider}`);
  }
  return cfg;
}
