import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { KnowledgeFileImageTransform } from "@/lib/knowledge/storage-thumbnail-url";

export const runtime = "nodejs";

const MIN_DIMENSION = 1;
const MAX_THUMBNAIL_DIMENSION = 1200;
const MIN_QUALITY = 20;
const MAX_QUALITY = 85;

function parseBoundedInt(
  value: string | null,
  min: number,
  max: number,
): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

function parseResize(value: string | null): KnowledgeFileImageTransform["resize"] {
  return value === "contain" || value === "fill" || value === "cover" ? value : undefined;
}

function parseImageTransform(searchParams: URLSearchParams): KnowledgeFileImageTransform | undefined {
  const width = parseBoundedInt(
    searchParams.get("w") ?? searchParams.get("width"),
    MIN_DIMENSION,
    MAX_THUMBNAIL_DIMENSION,
  );
  const height = parseBoundedInt(
    searchParams.get("h") ?? searchParams.get("height"),
    MIN_DIMENSION,
    MAX_THUMBNAIL_DIMENSION,
  );
  const quality = parseBoundedInt(
    searchParams.get("q") ?? searchParams.get("quality"),
    MIN_QUALITY,
    MAX_QUALITY,
  );
  const resize = parseResize(searchParams.get("resize"));

  if (!width && !height && !quality && !resize) return undefined;

  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(quality ? { quality } : {}),
    ...(resize ? { resize } : {}),
  };
}

/**
 * Authenticated proxy for private `knowledge-files` objects so `<img src>` works
 * without exposing the bucket or relying on expiring signed URLs.
 */
export async function GET(
  request: Request,
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
  const allowedUserFile = storagePath.startsWith(`${user.id}/`);
  const allowedQuickSaveFile = storagePath.startsWith(`quick-save/${user.id}/`);
  if (!allowedUserFile && !allowedQuickSaveFile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const transform = parseImageTransform(new URL(request.url).searchParams);
  let { data: blob, error } = await supabase.storage
    .from("knowledge-files")
    .download(storagePath, transform ? { transform } : undefined);
  let servedTransform = Boolean(transform && !error);

  if (error && transform) {
    const fallback = await supabase.storage.from("knowledge-files").download(storagePath);
    blob = fallback.data;
    error = fallback.error;
    servedTransform = false;
  }

  if (error || !blob) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const mime = blob.type || "application/octet-stream";
  const buf = await blob.arrayBuffer();

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "content-type": mime,
      "cache-control": servedTransform
        ? "private, max-age=86400, stale-while-revalidate=604800"
        : "private, max-age=3600",
    },
  });
}
