import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE_SLUG,
  isLocaleUrlSlug,
  normalizeLocaleSlug,
} from "./locale-slug";
import { defaultLocalizedPath, stripLeadingLocaleFromPathname } from "./locale-path";

const SKIP_LOCALE_PREFIX = new Set<string>(["callback", "share", "share-target"]);

function firstPathSegment(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts[0] ?? null;
}

/**
 * Ensures UI routes live under `/{localeSlug}/…`. OAuth stays at `/callback`.
 */
export function applyLocalePrefixRedirect(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) return null;

  const seg0 = firstPathSegment(pathname);
  if (seg0 && SKIP_LOCALE_PREFIX.has(seg0)) return null;

  const slug = seg0 ? normalizeLocaleSlug(seg0) : null;

  if (!slug) {
    const target =
      pathname === "/" || pathname === ""
        ? defaultLocalizedPath("/dashboard")
        : defaultLocalizedPath(pathname);
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  const rest = stripLeadingLocaleFromPathname(pathname);
  if (rest === "/" && pathname.split("/").filter(Boolean).length === 1) {
    const url = request.nextUrl.clone();
    url.pathname = `/${slug}/dashboard`;
    return NextResponse.redirect(url);
  }

  if (seg0 && !isLocaleUrlSlug(seg0)) {
    const url = request.nextUrl.clone();
    url.pathname = defaultLocalizedPath(pathname);
    return NextResponse.redirect(url);
  }

  return null;
}

export function defaultLocaleSlug(): typeof DEFAULT_LOCALE_SLUG {
  return DEFAULT_LOCALE_SLUG;
}
