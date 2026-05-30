import { NextResponse } from "next/server";
import { z } from "zod";

import { loadAppTtsSettings } from "@/lib/ai/app-tts";
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

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const [settings, voiceProfiles] = await Promise.all([
    loadAppTtsSettings({ supabase: auth.supabase, userId: auth.user.id }),
    listVoiceProfiles(auth.supabase, auth.user.id),
  ]);

  return NextResponse.json({
    ...settings,
    voiceProfiles,
    presets: TTS_PRESETS,
  });
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
    return NextResponse.json(
      { error: "tts_preferences_save_failed", detail: error.message },
      { status: 502 },
    );
  }

  return NextResponse.json({ preferences: data });
}
