import { GoogleGenAI, Modality } from "@google/genai";
import { pcm16leMonoToWav } from "@/lib/audio/pcmToWav";
import type { AudioProviderInput, AudioProviderOutput } from "@/lib/ai/audio-summary";

const MALE_VOICE = "Charon";
const FEMALE_VOICE = "Kore";

function extractInlineAudioFromResponse(response: unknown): { data: string; mimeType: string } | null {
  if (!response || typeof response !== "object") return null;
  const r = response as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    }>;
  };
  const parts = r.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    const id = p.inlineData;
    if (!id || typeof id !== "object") continue;
    const data = typeof id.data === "string" ? id.data : "";
    const mimeType = typeof id.mimeType === "string" && id.mimeType ? id.mimeType : "audio/L16";
    if (data.length > 0) return { data, mimeType };
  }
  return null;
}

export function getDocOracleTtsModel(): string {
  return process.env.DOCORACLE_TTS_MODEL?.trim() || "gemini-2.5-flash-preview-tts";
}

export async function synthesizeWithGeminiTts(input: AudioProviderInput): Promise<AudioProviderOutput> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "";
  if (!apiKey) {
    throw new Error("gemini_api_key_missing");
  }

  const model = getDocOracleTtsModel();
  const ai = new GoogleGenAI({ apiKey });
  const maleVoice = process.env.DOCORACLE_GEMINI_TTS_MALE_VOICE?.trim() || MALE_VOICE;
  const femaleVoice = process.env.DOCORACLE_GEMINI_TTS_FEMALE_VOICE?.trim() || FEMALE_VOICE;
  const voiceName = input.voiceGender === "male" ? maleVoice : femaleVoice;

  if (input.format === "two_hosts") {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: input.text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: "Host A",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: maleVoice } },
              },
              {
                speaker: "Host B",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: femaleVoice } },
              },
            ],
          },
        },
      },
    });
    const inline = extractInlineAudioFromResponse(response);
    if (!inline) throw new Error("gemini_tts_missing_audio");
    let audioBytes = Buffer.from(inline.data, "base64");
    let mimeType = inline.mimeType || "audio/L16";
    if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
      audioBytes = Buffer.concat([pcm16leMonoToWav(audioBytes, 24_000)]);
      mimeType = "audio/wav";
    }
    return {
      audioBytes,
      mimeType,
      provider: "gemini_tts",
      voiceName: `${maleVoice}+${femaleVoice}`,
    };
  }

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: input.text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });
  const inline = extractInlineAudioFromResponse(response);
  if (!inline) throw new Error("gemini_tts_missing_audio");
  let audioBytes = Buffer.from(inline.data, "base64");
  let mimeType = inline.mimeType || "audio/L16";
  if (mimeType.includes("L16") || mimeType.includes("pcm") || mimeType.includes("raw")) {
    audioBytes = Buffer.concat([pcm16leMonoToWav(audioBytes, 24_000)]);
    mimeType = "audio/wav";
  }
  return {
    audioBytes,
    mimeType,
    provider: "gemini_tts",
    voiceName,
  };
}
