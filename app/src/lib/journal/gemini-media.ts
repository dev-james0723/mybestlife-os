/**
 * Journal-specific Gemini media helpers. Image + TTS calls share the same
 * `@google/genai` client used elsewhere in the project (`gemini-image.ts` /
 * `audio-providers/gemini-tts.ts`); we only need narrower wrappers tuned to
 * the journal's prompts + voice enum.
 */

import { GoogleGenAI, Modality } from "@google/genai";

import { pcm16leMonoToWav } from "@/lib/audio/pcmToWav";
import type { TTSVoice } from "./constants";

// ---------------------------------------------------------------------------
// Model picks (env-overridable so we can swap without code changes)
// ---------------------------------------------------------------------------

export function getJournalImageModel(): string {
  return (
    process.env.JOURNAL_IMAGE_MODEL?.trim() ||
    process.env.DOCORACLE_IMAGE_MODEL?.trim() ||
    "gemini-3-pro-image-preview"
  );
}

export function getJournalTtsModel(): string {
  return (
    process.env.JOURNAL_TTS_MODEL?.trim() ||
    process.env.DOCORACLE_TTS_MODEL?.trim() ||
    "gemini-2.5-flash-preview-tts"
  );
}

// ---------------------------------------------------------------------------
// Inline-data extractors (mirrors the ones in gemini-image.ts / gemini-tts.ts)
// ---------------------------------------------------------------------------

function extractInlineImage(
  response: unknown,
): { data: string; mimeType: string } | null {
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
    const mimeType =
      typeof id.mimeType === "string" && id.mimeType ? id.mimeType : "image/png";
    if (data.length > 0) return { data, mimeType };
  }
  return null;
}

function extractInlineAudio(
  response: unknown,
): { data: string; mimeType: string } | null {
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
    const mimeType =
      typeof id.mimeType === "string" && id.mimeType ? id.mimeType : "audio/L16";
    if (data.length > 0) return { data, mimeType };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function generateJournalImage(params: {
  apiKey: string;
  prompt: string;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const response = await ai.models.generateContent({
    model: getJournalImageModel(),
    contents: params.prompt,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      temperature: 0.5,
    },
  });

  const inline = extractInlineImage(response);
  if (!inline) throw new Error("gemini_image_missing_inline_data");
  const bytes = Buffer.from(inline.data, "base64");
  if (bytes.length < 64) throw new Error("gemini_image_empty_bytes");
  return { bytes, mimeType: inline.mimeType };
}

export async function synthesizeJournalAudio(params: {
  apiKey: string;
  text: string;
  voice: TTSVoice;
}): Promise<{ bytes: Buffer; mimeType: string }> {
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  const response = await ai.models.generateContent({
    model: getJournalTtsModel(),
    contents: [{ parts: [{ text: params.text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: params.voice },
        },
      },
    },
  });

  const inline = extractInlineAudio(response);
  if (!inline) throw new Error("gemini_tts_missing_audio");

  let bytes = Buffer.from(inline.data, "base64");
  let mimeType = inline.mimeType || "audio/L16";
  if (
    mimeType.includes("L16") ||
    mimeType.includes("pcm") ||
    mimeType.includes("raw")
  ) {
    bytes = Buffer.concat([pcm16leMonoToWav(bytes, 24_000)]);
    mimeType = "audio/wav";
  }
  return { bytes, mimeType };
}
