import { type NextRequest } from "next/server";
import { applyLocalePrefixRedirect } from "@/lib/i18n/locale-middleware";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const localeRedirect = applyLocalePrefixRedirect(request);
  if (localeRedirect) return localeRedirect;
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|lottie|webmanifest)$).*)",
  ],
};
