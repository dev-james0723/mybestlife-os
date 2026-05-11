/**
 * When X oEmbed returns empty body text (common for /video/N URLs or flaky oEmbed),
 * use Gemini + Google Search grounding to recover the public caption for AI processing.
 */

import {
  fetchGeminiGroundedText,
  fetchGeminiPlannerJsonText,
  getGeminiPlannerTextModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";

/**
 * Best-effort caption recovery. Returns null when unavailable or misconfigured.
 */
export async function enrichXCaptionFromWeb(canonicalPostUrl: string): Promise<string | null> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) return null;

  const model = getGeminiPlannerTextModel();

  const { text: notes } = await fetchGeminiGroundedText({
    apiKey,
    model,
    systemInstruction:
      "You find publicly visible content for X (Twitter) posts. Be factual; never invent text.",
    userText: [
      "Locate this X post and report the exact caption/body text shown to logged-out viewers.",
      "Preserve Chinese/Japanese/Korean/etc. verbatim — do not translate.",
      "If the post is unavailable or text cannot be verified, say CAPTION_UNAVAILABLE.",
      "",
      `URL: ${canonicalPostUrl}`,
    ].join("\n"),
    temperature: 0.25,
    maxOutputTokens: 4096,
    timeoutMs: 55_000,
  });

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction: `Extract the post caption from research notes.
Return JSON only: {"caption": string | null}
Rules:
- If notes say unavailable or text cannot be confirmed, use null.
- The caption must be the author's post text only — no labels like "CAPTION:".`,
    userText: `Research notes:\n${notes.slice(0, 14_000)}`,
  });

  try {
    const parsed = JSON.parse(text) as { caption?: unknown };
    const c =
      typeof parsed.caption === "string"
        ? parsed.caption.replace(/^caption\s*:\s*/i, "").trim()
        : "";
    return c.length >= 6 ? c : null;
  } catch {
    return null;
  }
}
