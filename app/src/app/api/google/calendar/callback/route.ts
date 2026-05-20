import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeStringEqual } from "@/lib/security/token-crypto";
import {
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserEmail,
} from "@/lib/google/oauth";
import {
  getGoogleCalendarConnection,
  upsertGoogleCalendarConnection,
} from "@/lib/google/calendar-connection-store";
import { renewGoogleCalendarWatch } from "@/lib/google/calendar-watch";
import { DEFAULT_LOCALE_SLUG } from "@/lib/i18n/locale-slug";
import { safeGoogleCalendarOAuthReturnPath } from "@/lib/google/oauth-return-path";

const STATE_COOKIE = "google_cal_oauth_state";
const RETURN_COOKIE = "google_cal_oauth_return";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expected = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  const returnRaw = cookieStore.get(RETURN_COOKIE)?.value;
  cookieStore.delete(RETURN_COOKIE);
  const returnPath =
    safeGoogleCalendarOAuthReturnPath(returnRaw) ?? `/${DEFAULT_LOCALE_SLUG}/settings`;

  const redirectSettings = (q: string) => {
    const target = new URL(returnPath, req.nextUrl.origin);
    const qs = new URLSearchParams(q);
    qs.forEach((v, k) => target.searchParams.set(k, v));
    return NextResponse.redirect(target);
  };

  if (err) {
    return redirectSettings(`google_cal_err=${encodeURIComponent(err)}`);
  }
  if (!code || !state || !expected || !safeStringEqual(state, expected)) {
    return redirectSettings("google_cal_err=state_mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirectSettings("google_cal_err=not_signed_in");
  }

  try {
    const token = await exchangeGoogleAuthorizationCode(code);
    const existing = await getGoogleCalendarConnection(supabase, user.id);
    const refresh = token.refresh_token ?? existing?.refreshToken;
    if (!refresh) {
      return redirectSettings("google_cal_err=missing_refresh_token");
    }
    const expiresAt =
      typeof token.expires_in === "number"
        ? new Date(Date.now() + token.expires_in * 1000)
        : null;
    const scopes = token.scope
      ? token.scope.split(/[\s,]+/).filter(Boolean)
      : ["https://www.googleapis.com/auth/calendar.events"];
    const email = await fetchGoogleUserEmail(token.access_token);
    await upsertGoogleCalendarConnection(supabase, {
      userId: user.id,
      googleAccountEmail: email,
      accessToken: token.access_token,
      refreshToken: refresh,
      expiresAt,
      scopes,
    });
    try {
      await renewGoogleCalendarWatch({ supabase, userId: user.id });
    } catch (watchErr) {
      console.warn("[google-calendar/callback] watch register failed:", watchErr);
    }
    return redirectSettings("google_cal=connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return redirectSettings(`google_cal_err=${encodeURIComponent(msg)}`);
  }
}
