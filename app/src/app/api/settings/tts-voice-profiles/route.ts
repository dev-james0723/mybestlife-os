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
    return NextResponse.json({ error: "reference_audio_size_invalid" }, { status: 400 });
  }
  const mimeType = file.type || "audio/wav";
  if (!ACCEPTED_AUDIO_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "reference_audio_type_invalid" }, { status: 400 });
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
    return NextResponse.json(
      {
        error: "voice_profile_saved_preferences_failed",
        detail: prefError.message,
        profile,
      },
      { status: 502 },
    );
  }

  const settings = await loadAppTtsSettings({ supabase, userId: user.id });
  return NextResponse.json({ profile, settings });
}
