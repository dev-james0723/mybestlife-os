import { GOOGLE_CALENDAR_EVENTS_SCOPE } from "@/lib/google-calendar/constants";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export function googleCalendarRedirectUri(): string {
  const u = process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim();
  if (!u) {
    throw new Error("GOOGLE_CALENDAR_REDIRECT_URI is not set");
  }
  return u;
}

export function buildGoogleCalendarAuthorizeUrl(args: {
  state: string;
  includeGrantedScopes?: boolean;
  /** e.g. `select_account consent` to let the user pick another Google account */
  prompt?: string;
}): string {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleCalendarRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: args.prompt?.trim() || "consent",
    scope: GOOGLE_CALENDAR_EVENTS_SCOPE,
    state: args.state,
  });
  if (args.includeGrantedScopes !== false) {
    params.set("include_granted_scopes", "true");
  }
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGoogleAuthorizationCode(
  code: string,
): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: googleCalendarRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `token_exchange_failed_${res.status}`);
  }
  return json;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");
  }
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `refresh_failed_${res.status}`);
  }
  return json;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { email?: string };
    return typeof j.email === "string" ? j.email : null;
  } catch {
    return null;
  }
}
