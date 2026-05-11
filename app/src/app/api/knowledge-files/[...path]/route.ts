import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Authenticated proxy for private `knowledge-files` objects so `<img src>` works
 * without exposing the bucket or relying on expiring signed URLs.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const storagePath = path.map((p) => decodeURIComponent(p)).join("/");
  if (!storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: blob, error } = await supabase.storage.from("knowledge-files").download(storagePath);

  if (error || !blob) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const mime = blob.type || "application/octet-stream";
  const buf = await blob.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": mime,
      "cache-control": "private, max-age=3600",
    },
  });
}
