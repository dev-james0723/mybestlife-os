import { NextResponse } from "next/server";
import { z } from "zod";

import { loadAppTtsSettings } from "@/lib/ai/app-tts";
import { pingVoxCpm } from "@/lib/ai/audio-providers/voxcpm";
import { DEFAULT_TTS_PRESET_ID, TTS_PRESETS } from "@/lib/ai/tts-presets";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const updateSchema = z.object({
  voiceMode: z.enum(["preset", "reference_clone"]),
  presetId: z.string().optional(),
  activeVoiceProfileId: z.string().uuid().nullable().optional(),
});

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { ok: true as const, supabase, user };
}

async function listVoiceProfiles(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string) {
  const { data, error } = await supabase
    .from("user_tts_voice_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

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

const TTS_SCHEMA_MISSING_DETAIL =
  "Missing tts tables. Apply the VoxCPM TTS migration in app/supabase/migrations and reload Settings.";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const [settings, voiceProfiles] = await Promise.all([
      loadAppTtsSettings({ supabase: auth.supabase, userId: auth.user.id }),
      listVoiceProfiles(auth.supabase, auth.user.id),
    ]);
    const runtime =
      settings.provider === "voxcpm"
        ? await pingVoxCpm()
        : { ok: false, modelLoaded: false, error: "provider_not_voxcpm" };

    return NextResponse.json({
      ...settings,
      voiceProfiles,
      presets: TTS_PRESETS,
      runtime,
    });
  } catch (error) {
    if (isMissingTtsSchemaError(error)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
        },
        { status: 503 },
      );
    }
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "tts_preferences_load_failed", detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_tts_preferences", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const presetId = TTS_PRESETS.some((preset) => preset.id === parsed.data.presetId)
    ? parsed.data.presetId!
    : DEFAULT_TTS_PRESET_ID;
  const activeVoiceProfileId =
    parsed.data.voiceMode === "reference_clone"
      ? parsed.data.activeVoiceProfileId ?? null
      : null;

  if (parsed.data.voiceMode === "reference_clone" && !activeVoiceProfileId) {
    return NextResponse.json(
      { error: "active_voice_profile_required" },
      { status: 400 },
    );
  }

  if (activeVoiceProfileId) {
    const { data: activeProfile, error: activeProfileError } = await auth.supabase
      .from("user_tts_voice_profiles")
      .select("id")
      .eq("id", activeVoiceProfileId)
      .eq("user_id", auth.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (activeProfileError) {
      if (isMissingTtsSchemaError(activeProfileError)) {
        return NextResponse.json(
          {
            error: "tts_schema_missing",
            detail: TTS_SCHEMA_MISSING_DETAIL,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "voice_profile_lookup_failed", detail: activeProfileError.message },
        { status: 502 },
      );
    }
    if (!activeProfile) {
      return NextResponse.json(
        { error: "active_voice_profile_invalid" },
        { status: 400 },
      );
    }
  }

  const { data, error } = await auth.supabase
    .from("user_tts_preferences")
    .upsert(
      {
        user_id: auth.user.id,
        provider: "voxcpm",
        voice_mode: parsed.data.voiceMode,
        preset_id: presetId,
        active_voice_profile_id: activeVoiceProfileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) {
    if (isMissingTtsSchemaError(error)) {
      return NextResponse.json(
        {
          error: "tts_schema_missing",
          detail: TTS_SCHEMA_MISSING_DETAIL,
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "tts_preferences_save_failed", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ preferences: data });
}
