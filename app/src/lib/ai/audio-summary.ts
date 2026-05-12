export type AudioProviderInput = {
  text: string;
  language: "en" | "zh-Hant" | "auto";
  voiceGender: "male" | "female";
  format: "single_host" | "two_hosts";
};

export type AudioProviderOutput = {
  audioBytes: Buffer;
  mimeType: string;
  provider: string;
  voiceName?: string;
};

export type DocOracleAudioProviderId = "gemini_tts" | "elevenlabs";

export function getDocOracleAudioProvider(): DocOracleAudioProviderId {
  const v = process.env.DOCORACLE_AUDIO_PROVIDER?.trim().toLowerCase();
  if (v === "elevenlabs") return "elevenlabs";
  return "gemini_tts";
}

export async function synthesizeDocOracleAudio(input: AudioProviderInput): Promise<AudioProviderOutput> {
  const p = getDocOracleAudioProvider();
  if (p === "elevenlabs") {
    const { synthesizeWithElevenLabs } = await import("@/lib/ai/audio-providers/elevenlabs");
    return synthesizeWithElevenLabs(input);
  }
  const { synthesizeWithGeminiTts } = await import("@/lib/ai/audio-providers/gemini-tts");
  return synthesizeWithGeminiTts(input);
}

export function isAudioProviderConfigured(): boolean {
  const p = getDocOracleAudioProvider();
  if (p === "elevenlabs") {
    return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  }
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}
