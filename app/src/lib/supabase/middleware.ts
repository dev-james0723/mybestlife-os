import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readDevLoginBypassFromRequest } from "@/lib/dev-login-bypass";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";
import { DEFAULT_LOCALE_SLUG } from "@/lib/i18n/locale-slug";
import { getLocaleSlugFromPathname, stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";

export async function updateSession(request: NextRequest) {
  // DEV MODE: skip auth when using placeholder Supabase credentials
  const isDevBypass =
    process.env.NEXT_PUBLIC_SUPABASE_URL === "https://placeholder.supabase.co";

  if (isDevBypass) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
  } catch {
    user = null;
  }

  const devBypassActive = readDevLoginBypassFromRequest((name) =>
    request.cookies.get(name)?.value
  );
  const sessionOk = !!user || devBypassActive;

  const pathname = request.nextUrl.pathname;
  const rest = stripLeadingLocaleFromPathname(pathname);

  const protectedPrefixes = [
    "/dashboard",
    "/tasks",
    "/projects",
    "/daily-planner",
    "/goals",
    "/notes",
    "/knowledge-base",
    "/ideas",
    "/japanese-study",
    "/journal",
    "/health",
    "/habits",
    "/grateful-things",
    "/quote-library",
    "/bucket-list",
    "/about-me",
    "/finance",
    "/resources",
    "/software-vault",
    "/vault",
    "/knowledge/software-vault",
    "/relationships",
    "/role-models",
    "/analytics",
    "/weekly-review",
    "/business-analyst",
    "/ai-assistant",
    "/ai-knowledge",
    "/career",
    "/youtube-radar",
    "/google-calendar",
    "/garden",
    "/settings",
    "/privacy",
  ];

  const isProtectedRoute = protectedPrefixes.some(
    (p) => rest === p || rest.startsWith(`${p}/`),
  );

  const localeSlug = getLocaleSlugFromPathname(pathname) ?? DEFAULT_LOCALE_SLUG;

  if (isProtectedRoute && !sessionOk) {
    const url = request.nextUrl.clone();
    url.pathname = `/${localeSlug}/login`;
    return NextResponse.redirect(url);
  }

  const isLoginRoute = rest === "/login" || rest.startsWith("/login/");
  if (isLoginRoute && sessionOk) {
    const url = request.nextUrl.clone();
    url.pathname = `/${localeSlug}/dashboard`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
