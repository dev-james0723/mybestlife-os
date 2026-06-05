import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireLifeAgentUser } from "@/lib/life-agent/actions-api-shared";
import { analyzeLifeAgentUpload } from "@/lib/life-agent/upload-analyzer";
import {
  createLifeAgentUploadSignedUrl,
  uploadLifeAgentFileServer,
} from "@/lib/life-agent/upload-storage";
import type { AnalyzeUploadResponse } from "@/lib/life-agent/upload-types";
import { parseAppLocale } from "@/lib/i18n/app-locale";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireLifeAgentUser();
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form_data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const localeRaw = formData.get("locale");
  const locale =
    typeof localeRaw === "string" ? parseAppLocale(localeRaw) : parseAppLocale("en");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploadId = randomUUID();
  const mimeType = file.type || "application/octet-stream";
  const fileName = file.name || "upload";

  const { storagePath, error: uploadError } = await uploadLifeAgentFileServer(
    auth.supabase,
    auth.userId,
    uploadId,
    fileName,
    bytes,
    mimeType,
  );
  if (uploadError) {
    return NextResponse.json({ error: "upload_failed", detail: uploadError }, { status: 500 });
  }

  let analysis;
  try {
    analysis = await analyzeLifeAgentUpload({
      bytes,
      mimeType,
      fileName,
      locale,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    if (detail === "gemini_api_key_missing") {
      return NextResponse.json(
        { error: "ai_unavailable", detail: "Gemini API key not configured" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "analysis_failed", detail }, { status: 500 });
  }

  const { data: row, error: insertError } = await auth.supabase
    .from("life_agent_uploads")
    .insert({
      id: uploadId,
      user_id: auth.userId,
      file_url: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      file_size: file.size,
      upload_type: analysis.detectedType,
      analysis_json: analysis,
    })
    .select("id")
    .single();

  if (insertError || !row) {
    return NextResponse.json(
      { error: "record_failed", detail: insertError?.message },
      { status: 500 },
    );
  }

  const previewUrl =
    mimeType.startsWith("image/") ?
      (await createLifeAgentUploadSignedUrl(auth.supabase, storagePath)) ?? undefined
    : undefined;

  const body: AnalyzeUploadResponse = {
    uploadId,
    fileName,
    mimeType,
    previewUrl,
    analysis,
  };

  return NextResponse.json(body);
}
