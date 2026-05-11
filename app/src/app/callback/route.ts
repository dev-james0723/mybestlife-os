import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultLocalizedPath, ensureUrlPathHasLocale } from "@/lib/i18n/locale-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? defaultLocalizedPath("/dashboard");
  const next = ensureUrlPathHasLocale(nextRaw);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${defaultLocalizedPath("/login")}?error=auth_failed`);
}
