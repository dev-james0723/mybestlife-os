import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MAX_ICON_BYTES, uploadVaultIconFromBytes } from "@/lib/vault/icon-storage";

export const runtime = "nodejs";

const ALLOWED_UPLOAD_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/gif",
]);

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!isUploadFile(file)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const contentType = file.type.trim().toLowerCase();
  if (!ALLOWED_UPLOAD_MIME.has(contentType)) {
    return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
  }

  if (file.size <= 0 || file.size > MAX_ICON_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const buffer = await file.arrayBuffer();
  const publicUrl = await uploadVaultIconFromBytes(supabase, user.id, buffer, contentType);
  if (!publicUrl) {
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  return NextResponse.json({ icon_url: publicUrl });
}
