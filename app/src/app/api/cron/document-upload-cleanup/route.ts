import { NextResponse, type NextRequest } from "next/server";

import { cleanupStaleDocumentUploadsGlobally } from "@/lib/documents/document-upload-reservations";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 120;

const STALE_UPLOAD_AGE_MS = 24 * 60 * 60 * 1_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await cleanupStaleDocumentUploadsGlobally({
    supabase: createServiceRoleSupabaseClient(),
    olderThanIso: new Date(Date.now() - STALE_UPLOAD_AGE_MS).toISOString(),
  });

  if (result.error) {
    return NextResponse.json(
      { error: "document_upload_cleanup_failed", failed: result.failed },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true, ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
