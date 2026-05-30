import type { AppLocale } from "@/lib/i18n/app-locale";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getDocOracleAudioProvider,
  isAudioProviderConfigured,
  synthesizeDocOracleAudio,
  type AudioProviderInput,
} from "@/lib/ai/audio-summary";
import { synthesizeAppSpeech } from "@/lib/ai/app-tts";

export type JournalTtsVoice = "male" | "female";

export type JournalTtsInput = {
  text: string;
  locale: AppLocale;
  voice?: JournalTtsVoice;
  supabase?: SupabaseClient;
  userId?: string;
  /** Accepted for future provider-level prosody control; current VoxCPM path ignores speed. */
  speed?: number;
};

export type JournalTtsOutput = {
  audioBytes: Buffer;
  mimeType: string;
  provider: string;
  voiceUsed?: string;
};

function localeToTtsLanguage(locale: AppLocale): AudioProviderInput["language"] {
  if (locale === "en") return "en";
  if (locale === "zh-TW" || locale === "zh-CN") return "zh-Hant";
  return "auto";
}

export function isJournalTtsConfigured(): boolean {
  return isAudioProviderConfigured();
}

export function getJournalTtsProvider(): string {
  return getDocOracleAudioProvider();
}

export async function synthesizeJournalSpeech(input: JournalTtsInput): Promise<JournalTtsOutput> {
  if (!isJournalTtsConfigured()) {
    throw new Error(
      "Journal TTS is not configured. Set VOXCPM_BASE_URL.",
    );
  }

  const voiceGender: JournalTtsVoice = input.voice === "female" ? "female" : "male";
  const ttsText = `Say in a warm, calm, conversational voice-note tone (single narrator). Do not read stage directions aloud.\n\n${input.text.trim()}`;

  const out =
    input.supabase && input.userId
      ? await synthesizeAppSpeech({
          supabase: input.supabase,
          userId: input.userId,
          text: ttsText.slice(0, 14_000),
          language: localeToTtsLanguage(input.locale),
          voiceGender,
          format: "single_host",
          styleInstruction:
            "Warm, calm, conversational voice-note tone, direct and emotionally aware",
        })
      : await synthesizeDocOracleAudio({
          text: ttsText.slice(0, 14_000),
          language: localeToTtsLanguage(input.locale),
          voiceGender,
          format: "single_host",
        });

  return {
    audioBytes: out.audioBytes,
    mimeType: out.mimeType,
    provider: out.provider,
    voiceUsed: out.voiceName,
  };
}

export function audioMimeToExtension(mimeType: string): "mp3" | "wav" {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "wav";
}
