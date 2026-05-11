import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isValidPublicUrl } from "@/lib/vault/safe-fetch";

export const runtime = "nodejs";

const MAX_BYTES = 1 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(png|jpeg|webp|svg\+xml|gif|x-icon|vnd\.microsoft\.icon)$/i;

/**
 * Authenticated image proxy for third-party logo sources that block cross-origin
 * browser fetches (Brandfetch / Clearbit mirror). The proxy streams the bytes
 * back with a short cache and strips cookies to avoid tracking.
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url") ?? "";
  if (!target || !isValidPublicUrl(target)) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const res = await fetch(target, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MyLifeOSVaultBot/1.0)",
      accept: "image/*",
    },
    signal: AbortSignal.timeout(6000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!ALLOWED_MIME.test(contentType)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
