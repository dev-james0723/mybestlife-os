import type { AudioProviderInput, AudioProviderOutput } from "@/lib/ai/audio-summary";

const ELEVEN_URL = "https://api.elevenlabs.io/v1/text-to-speech";

export async function synthesizeWithElevenLabs(input: AudioProviderInput): Promise<AudioProviderOutput> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("elevenlabs_not_configured");
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const maleId = process.env.ELEVENLABS_MALE_VOICE_ID?.trim();
  const femaleId = process.env.ELEVENLABS_FEMALE_VOICE_ID?.trim();
  const voiceId = input.voiceGender === "male" ? maleId : femaleId;
  if (!voiceId) {
    throw new Error("elevenlabs_voice_ids_missing");
  }

  const text = input.text.trim().slice(0, 12_000);
  if (!text) {
    throw new Error("empty_script");
  }

  const url = `${ELEVEN_URL}/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: modelId,
      text,
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`elevenlabs_http_${res.status}:${errText.slice(0, 120)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 32) {
    throw new Error("elevenlabs_empty_audio");
  }

  return {
    audioBytes: buf,
    mimeType: "audio/mpeg",
    provider: "elevenlabs",
    voiceName: voiceId,
  };
}
