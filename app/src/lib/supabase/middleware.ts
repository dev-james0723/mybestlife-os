import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readDevLoginBypassFromRequest } from "@/lib/dev-login-bypass";
import { getSupabaseKey, getSupabaseUrl } from "@/lib/supabase/env";
import { DEFAULT_LOCALE_SLUG } from "@/lib/i18n/locale-slug";
import { safeReturnPath } from "@/lib/auth-return-path";
import { isDisabledFeatureRoute } from "@/lib/features";
import { getLocaleSlugFromPathname, stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";

const protectedPrefixes = [
    "/dashboard",
    "/brain",
    "/life-agent",
    "/mind-council",
    "/tasks",
    "/projects",
    "/daily-planner",
    "/calendar",
    "/goals",
    "/knowledge-base",
    "/knowledge",
    "/notes",
    "/os-buddy",
    "/quick-save",
    "/weather",
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
    "/relationship",
    "/role-models",
    "/analytics",
    "/signals",
    "/weekly-review",
    "/business-analyst",
    "/ai-assistant",
    "/ai-knowledge",
    "/career",
    "/youtube-radar",
    "/google-calendar",
    "/garden",
    "/settings",
  ];

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rest = stripLeadingLocaleFromPathname(pathname);
  // Let the existing route gate render the same 404 before or after login.
  if (isDisabledFeatureRoute(rest)) return NextResponse.next({ request });
  const isProtectedRoute = protectedPrefixes.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`),
  );
  const localeSlug = getLocaleSlugFromPathname(pathname) ?? DEFAULT_LOCALE_SLUG;
  const requireLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = `/${localeSlug}/login`;
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  };

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseKey();
  const backendUnavailable = !supabaseUrl || !supabaseKey || supabaseUrl === "https://placeholder.supabase.co";
  if (backendUnavailable) {
    // Fixture credentials must never make a production route public.
    if (process.env.NODE_ENV !== "development" && isProtectedRoute) return requireLogin();
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

  if (isProtectedRoute && !sessionOk) return requireLogin();

  const isLoginRoute = rest === "/login" || rest.startsWith("/login/");
  if (isLoginRoute && sessionOk) {
    const url = request.nextUrl.clone();
    return NextResponse.redirect(new URL(safeReturnPath(request.nextUrl.searchParams.get("next"), `/${localeSlug}/dashboard`), url.origin));
  }

  return supabaseResponse;
}
