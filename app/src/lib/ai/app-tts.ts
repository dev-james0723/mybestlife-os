import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getDocOracleAudioProvider,
  isAudioProviderConfigured,
  synthesizeDocOracleAudio,
  type AudioProviderInput,
  type AudioProviderOutput,
} from "@/lib/ai/audio-summary";
import {
  DEFAULT_TTS_PRESET_ID,
  getTtsPreset,
  type TtsPresetId,
  type TtsVoiceMode,
} from "@/lib/ai/tts-presets";

export type UserTtsPreferences = {
  user_id: string;
  provider: "voxcpm";
  voice_mode: TtsVoiceMode;
  preset_id: TtsPresetId;
  active_voice_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

export type UserTtsVoiceProfile = {
  id: string;
  user_id: string;
  label: string;
  kind: "reference_clone";
  reference_storage_path: string;
  reference_transcript: string | null;
  consent_confirmed_at: string;
  sample_duration_seconds: number | null;
  mime_type: string | null;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type AppSpeechInput = {
  supabase: SupabaseClient;
  userId: string;
  text: string;
  language: AudioProviderInput["language"];
  voiceGender: AudioProviderInput["voiceGender"];
  format: AudioProviderInput["format"];
  styleInstruction?: string;
};

export type AppTtsSettings = {
  provider: ReturnType<typeof getDocOracleAudioProvider>;
  configured: boolean;
  preferences: UserTtsPreferences;
  activeVoiceProfile: UserTtsVoiceProfile | null;
};

export function defaultTtsPreferences(userId: string): UserTtsPreferences {
  return {
    user_id: userId,
    provider: "voxcpm",
    voice_mode: "preset",
    preset_id: DEFAULT_TTS_PRESET_ID,
    active_voice_profile_id: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

export async function loadAppTtsSettings(params: {
  supabase: SupabaseClient;
  userId: string;
}): Promise<AppTtsSettings> {
  const { data: prefRow, error: prefError } = await params.supabase
    .from("user_tts_preferences")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (prefError) throw prefError;

  const preferences = (prefRow as UserTtsPreferences | null) ?? defaultTtsPreferences(params.userId);
  let activeVoiceProfile: UserTtsVoiceProfile | null = null;
  if (preferences.active_voice_profile_id) {
    const { data: profileRow, error: profileError } = await params.supabase
      .from("user_tts_voice_profiles")
      .select("*")
      .eq("id", preferences.active_voice_profile_id)
      .eq("user_id", params.userId)
      .eq("status", "active")
      .maybeSingle();
    if (profileError) throw profileError;
    activeVoiceProfile = (profileRow as UserTtsVoiceProfile | null) ?? null;
  }

  return {
    provider: getDocOracleAudioProvider(),
    configured: isAudioProviderConfigured(),
    preferences,
    activeVoiceProfile,
  };
}

async function downloadReferenceAudio(params: {
  supabase: SupabaseClient;
  profile: UserTtsVoiceProfile;
}): Promise<AudioProviderInput["referenceAudio"]> {
  const { data, error } = await params.supabase.storage
    .from("knowledge-files")
    .download(params.profile.reference_storage_path);
  if (error || !data) {
    throw new Error(`tts_reference_download_failed:${error?.message ?? "missing_blob"}`);
  }

  return {
    bytes: Buffer.from(await data.arrayBuffer()),
    mimeType: data.type || params.profile.mime_type || "audio/wav",
    filename: params.profile.reference_storage_path.split("/").pop() || "reference.wav",
  };
}

export async function synthesizeAppSpeech(
  input: AppSpeechInput,
): Promise<AudioProviderOutput> {
  const settings = await loadAppTtsSettings({
    supabase: input.supabase,
    userId: input.userId,
  });
  if (!settings.configured) {
    throw new Error(
      settings.provider === "voxcpm"
        ? "VoxCPM TTS is not configured. Set VOXCPM_BASE_URL."
        : "TTS provider is not configured.",
    );
  }

  const preset = getTtsPreset(settings.preferences.preset_id);
  let useReference =
    settings.preferences.voice_mode === "reference_clone" &&
    settings.activeVoiceProfile != null;
  let referenceAudio: AudioProviderInput["referenceAudio"] = null;
  if (useReference) {
    try {
      referenceAudio = await downloadReferenceAudio({
        supabase: input.supabase,
        profile: settings.activeVoiceProfile!,
      });
    } catch (error) {
      // Keep generation available by falling back to preset voice when reference audio is missing.
      console.warn("[tts] reference voice unavailable, fallback to preset", error);
      useReference = false;
      referenceAudio = null;
    }
  }

  const out = await synthesizeDocOracleAudio({
    text: input.text,
    language: input.language === "auto" ? preset.language : input.language,
    voiceGender: preset.voiceGender ?? input.voiceGender,
    format: input.format,
    voiceMode: useReference ? "reference_clone" : "preset",
    voiceControl: input.styleInstruction ?? preset.control,
    promptText: settings.activeVoiceProfile?.reference_transcript ?? null,
    referenceAudio,
  });

  return {
    ...out,
    voiceName: useReference
      ? settings.activeVoiceProfile?.label ?? out.voiceName
      : preset.label,
  };
}
