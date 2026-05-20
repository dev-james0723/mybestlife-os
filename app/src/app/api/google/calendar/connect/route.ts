import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { randomUrlSafeToken } from "@/lib/security/token-crypto";
import { buildGoogleCalendarAuthorizeUrl } from "@/lib/google/oauth";
import { safeGoogleCalendarOAuthReturnPath } from "@/lib/google/oauth-return-path";

const STATE_COOKIE = "google_cal_oauth_state";
const RETURN_COOKIE = "google_cal_oauth_return";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const state = randomUrlSafeToken(32);
    const cookieStore = await cookies();
    const returnTo = safeGoogleCalendarOAuthReturnPath(req.nextUrl.searchParams.get("returnTo"));
    if (returnTo) {
      cookieStore.set({
        name: RETURN_COOKIE,
        value: returnTo,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/google/calendar",
        maxAge: 60 * 10,
      });
    }
    cookieStore.set({
      name: STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google/calendar",
      maxAge: 60 * 10,
    });
    const switchAccount = req.nextUrl.searchParams.get("switchAccount") === "1";
    const url = buildGoogleCalendarAuthorizeUrl({
      state,
      prompt: switchAccount ? "select_account consent" : undefined,
    });
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "oauth_start_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
