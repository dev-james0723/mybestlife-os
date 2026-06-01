import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { loadAppTtsSettings } from "@/lib/ai/app-tts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_REFERENCE_BYTES = 25 * 1024 * 1024;
const ACCEPTED_AUDIO_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
]);

const TTS_SCHEMA_MISSING_DETAIL =
  "Missing tts tables. Apply the VoxCPM TTS migration in app/supabase/migrations and reload Settings.";

function isMissingTtsSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  const details = String((error as { details?: unknown }).details ?? "").toLowerCase();
  const combined = `${message} ${details}`;
  return (
    combined.includes("user_tts_preferences") ||
    combined.includes("user_tts_voice_profiles")
  ) && (
    combined.includes("schema cache") ||
    combined.includes("relation") ||
    combined.includes("does not exist") ||
    combined.includes("could not find")
  );
}

function mimeTypeFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/x-m4a";
  if (lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".webm")) return "audio/webm";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "audio/wav";
}

function normalizeMimeType(rawMimeType: string, fileName: string): string {
  const base = rawMimeType.split(";")[0]?.trim().toLowerCase();
  if (base) return base;
  return mimeTypeFromFileName(fileName);
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogg";
  return "wav";
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_form" }, { status: 400 });

  const file = form.get("referenceAudio");
  const label = String(form.get("label") ?? "My voice").trim().slice(0, 80) || "My voice";
  const referenceTranscript = String(form.get("referenceTranscript") ?? "").trim() || null;
  const consent = String(form.get("consent") ?? "") === "true";
  if (!consent) {
    return NextResponse.json({ error: "voice_consent_required" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "reference_audio_required" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_REFERENCE_BYTES) {
    return NextResponse.json(
      {
        error: "reference_audio_size_invalid",
        detail: `File size must be between 1 byte and ${MAX_REFERENCE_BYTES} bytes.`,
      },
      { status: 400 },
    );
  }
  const mimeType = normalizeMimeType(file.type || "", file.name || "");
  if (!ACCEPTED_AUDIO_TYPES.has(mimeType)) {
    return NextResponse.json(
      {
        error: "reference_audio_type_invalid",
        detail: `Unsupported audio type: ${file.type || "unknown"}`,
      },
      { status: 400 },
    );
  }

  const profileId = randomUUID();
  const ext = extFromMime(mimeType);
  const storagePath = `${user.id}/tts/voice-profiles/${profileId}/reference.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("knowledge-files")
    .upload(storagePath, bytes, {
      contentType: mimeType,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "voice_reference_upload_failed", detail: uploadError.message },
      { status: 502 },
    );
  }

  const { data: profile, error: insertError } = await supabase
    .from("user_tts_voice_profiles")
    .insert({
      id: profileId,
      user_id: user.id,
      label,
      kind: "reference_clone",
      reference_storage_path: storagePath,
      reference_transcript: referenceTranscript,
      consent_confirmed_at: new Date().toISOString(),
      mime_type: mimeType,
      status: "active",
    })
    .select()
    .single();
  if (insertError) {
    await supabase.storage.from("knowledge-files").remove([storagePath]);
    if (isMissingTtsSchemaError(insertError)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "voice_profile_save_failed", detail: insertError.message },
      { status: 502 },
    );
  }

  const { error: prefError } = await supabase
    .from("user_tts_preferences")
    .upsert(
      {
        user_id: user.id,
        provider: "voxcpm",
        voice_mode: "reference_clone",
        active_voice_profile_id: profileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (prefError) {
    if (isMissingTtsSchemaError(prefError)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
          profile,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "voice_profile_saved_preferences_failed",
        detail: prefError.message,
        profile,
      },
      { status: 502 },
    );
  }

  let settings;
  try {
    settings = await loadAppTtsSettings({ supabase, userId: user.id });
  } catch (error) {
    if (isMissingTtsSchemaError(error)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
          profile,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        error: "voice_profile_saved_settings_load_failed",
        detail: error instanceof Error ? error.message : String(error),
        profile,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ profile, settings });
}
