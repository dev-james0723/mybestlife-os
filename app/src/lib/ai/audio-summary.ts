export type AudioProviderInput = {
  text: string;
  language: "en" | "zh-Hant" | "auto";
  voiceGender: "male" | "female";
  format: "single_host" | "two_hosts";
  voiceMode?: "preset" | "reference_clone";
  voiceControl?: string | null;
  promptText?: string | null;
  referenceAudio?: {
    bytes: Buffer;
    mimeType: string;
    filename: string;
  } | null;
};

export type AudioProviderOutput = {
  audioBytes: Buffer;
  mimeType: string;
  provider: string;
  voiceName?: string;
};

export type DocOracleAudioProviderId = "voxcpm" | "elevenlabs";

export function getDocOracleAudioProvider(): DocOracleAudioProviderId {
  const v = process.env.DOCORACLE_AUDIO_PROVIDER?.trim().toLowerCase();
  if (v === "elevenlabs") return "elevenlabs";
  return "voxcpm";
}

export async function synthesizeDocOracleAudio(input: AudioProviderInput): Promise<AudioProviderOutput> {
  const p = getDocOracleAudioProvider();
  if (p === "voxcpm") {
    const { synthesizeWithVoxCpm } = await import("@/lib/ai/audio-providers/voxcpm");
    return synthesizeWithVoxCpm(input);
  }
  if (p === "elevenlabs") {
    const { synthesizeWithElevenLabs } = await import("@/lib/ai/audio-providers/elevenlabs");
    return synthesizeWithElevenLabs(input);
  }
  const { synthesizeWithVoxCpm } = await import("@/lib/ai/audio-providers/voxcpm");
  return synthesizeWithVoxCpm(input);
}

export function isAudioProviderConfigured(): boolean {
  const p = getDocOracleAudioProvider();
  if (p === "voxcpm") {
    return Boolean(process.env.VOXCPM_BASE_URL?.trim());
  }
  if (p === "elevenlabs") {
    return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  }
  return false;
}
