import { YoutubeTranscript } from "youtube-transcript";
import {
  fetchGeminiPlannerJsonWithUserParts,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { canonicalYouTubeWatchUrl, extractYouTubeVideoId } from "@/lib/knowledge/youtube";

/** Join timed lines into readable plain text (for AI context / display). */
export function formatYoutubeTranscriptLines(
  lines: { text: string; offset: number; duration: number }[],
): string {
  return lines
    .map((l) => l.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetches captions via YouTube's timedtext (no API key).
 * Returns null if disabled, unavailable, or rate-limited.
 */
export async function tryFetchYoutubeTranscriptText(videoUrlOrId: string): Promise<string | null> {
  const id = extractYouTubeVideoId(videoUrlOrId);
  if (!id) return null;
  try {
    const lines = await YoutubeTranscript.fetchTranscript(id);
    if (!lines.length) return null;
    const text = formatYoutubeTranscriptLines(lines);
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

const TRANSCRIPT_JSON_SYSTEM = `You output only valid JSON with one key "transcript" whose value is a single string: the full spoken transcript of the video, in the same language as the audio, with light punctuation. No timestamps. If you cannot produce a transcript, use an empty string.`;

/**
 * Best-effort transcript via Gemini when captions are unavailable (slower / may be approximate).
 */
export async function tryGeminiYoutubeTranscript(pageUrl: string): Promise<string | null> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) return null;
  const canonical = canonicalYouTubeWatchUrl(pageUrl);
  if (!canonical) return null;
  try {
    const { text } = await fetchGeminiPlannerJsonWithUserParts({
      apiKey,
      systemInstruction: TRANSCRIPT_JSON_SYSTEM,
      userParts: [
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: canonical,
          },
        },
        {
          text: 'Return JSON only: {"transcript":"..."}',
        },
      ],
      timeoutMs: 300_000,
    });
    const parsed = JSON.parse(text) as { transcript?: unknown };
    const t = typeof parsed.transcript === "string" ? parsed.transcript.trim() : "";
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}
