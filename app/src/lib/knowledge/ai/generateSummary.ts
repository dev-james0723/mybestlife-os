import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { languageDirective } from "@/lib/knowledge/ai/language";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type AISummaryResult = {
  tldr: string;
  summary: string;
  keyInsights: string[];
  keyQuotes: string[];
  questionsAnswered: string[];
  actionItems: string[];
  depthIndicator: "intro" | "intermediate" | "technical" | "reference";
  /** Extra paragraph for social posts (themes, entities, context). */
  relatedContext?: string;
};

const BASE_SYSTEM_PROMPT = `You are a knowledge base assistant that processes content into structured knowledge cards.
Given a piece of content and its source type, produce a JSON response with ALL of the following fields:

- "tldr": Exactly ONE sentence (one-sentence summary). Cap at ~24 words in English or a comparable length in other languages. The most essential takeaway.
- "summary": A short description: 2–4 sentences of clean, well-written prose. No filler, no bullet list inside this field.
- "keyInsights": An array of 3-6 bullet point strings. The most important takeaways, arguments, or ideas.
- "keyQuotes": An array of 2-4 actual quoted passages from the source (not paraphrased). For notes, return an empty array.
- "questionsAnswered": An array of 3-5 questions this content answers well.
- "actionItems": An array of action items if the content contains 2+ genuine action items. If fewer than 2 exist, return an empty array.
- "depthIndicator": One of "intro", "intermediate", "technical", or "reference" — indicating the content's depth level.
- "relatedContext": (ONLY when includeRelatedContext is true in the user message) A single short paragraph (2–4 sentences): themes, entities, or background a reader should know — grounded only in the caption/text provided. No speculation. Same language as tldr/summary.

Rules:
- Be precise and substantive. No generic filler like "This article discusses..."
- keyQuotes must be actual text FROM the source, not paraphrased. Skip this for notes.
- actionItems must be genuinely actionable. Most content has none — return [] in that case.
- When includeRelatedContext is false, omit the relatedContext key entirely or set it to null.
- Respond ONLY with valid JSON. No markdown wrapping.`;

const SUMMARY_ONLY_SYSTEM_PROMPT = `You are a knowledge base assistant that processes content into lightweight knowledge cards.
Given a piece of content and its source type, produce a compact JSON response with ONLY these fields:

- "tldr": Exactly ONE sentence (one-sentence summary). Cap at ~24 words in English or a comparable length in other languages. The most essential takeaway.
- "summary": A short description: 2-4 sentences of clean, well-written prose. No filler, no bullet list inside this field.
- "depthIndicator": One of "intro", "intermediate", "technical", or "reference" — indicating the content's depth level.
- "relatedContext": (ONLY when includeRelatedContext is true in the user message) A single short paragraph (2-4 sentences): themes, entities, or background a reader should know — grounded only in the caption/text provided. No speculation. Same language as tldr/summary.

Do not generate key insights, quotes, questions, or action items. They are generated later only if the user asks.

Rules:
- Be precise and substantive. No generic filler like "This article discusses..."
- When includeRelatedContext is false, omit the relatedContext key entirely or set it to null.
- Respond ONLY with valid JSON. No markdown wrapping.`;

const FALLBACK_LANGUAGE_RULE =
  "Detect the dominant language of the source content and produce ALL output (tldr, summary, " +
  "relatedContext when requested, keyInsights, questionsAnswered, actionItems) in that exact same language.\n\n" +
  "Critical rules for Chinese:\n" +
  "- Treat Traditional Chinese (zh-Hant) and Simplified Chinese (zh-Hans) as DIFFERENT.\n" +
  "- NEVER convert between them. If the source uses 體/個/說/灣/從/發/應/這 the response MUST " +
  "  use those exact characters; if the source uses 体/个/说/湾/从/发/应/这 the response MUST " +
  "  use those.\n" +
  "- For mixed Chinese-English input where Chinese dominates, respond in the matching Chinese " +
  "  variant. For mixed input where English dominates, respond in English.\n\n" +
  "Examples by source language:\n" +
  "- 繁體中文 source → 繁體中文 response (使用、進行、覺得、學習).\n" +
  "- 简体中文 source → 简体中文 response (使用、进行、觉得、学习).\n" +
  "- English source → English response.\n" +
  "- 日本語 source → 日本語 response.\n" +
  "- 한국어 source → 한국어 response.\n" +
  "- Other languages → mirror the source.\n\n" +
  "Tags (when generated separately) may remain language-flexible.";

export async function generateSummary(
  rawText: string,
  title: string,
  contentType: string,
  options: {
    targetLanguage?: AppLocale;
    /** Social cards: add relatedContext paragraph mapped to ai_content_overview. */
    includeRelatedContext?: boolean;
    /** Use the cheaper default card pass unless a caller explicitly needs full structured details. */
    detailLevel?: "summary-only" | "full";
  } = {},
): Promise<AISummaryResult> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!rawText.trim()) {
    throw new Error("No content to summarize — content extraction may have failed");
  }

  const inputText = rawText.slice(0, 12000);

  const languageRule = options.targetLanguage
    ? languageDirective(options.targetLanguage)
    : FALLBACK_LANGUAGE_RULE;

  const systemPrompt =
    options.detailLevel === "summary-only"
      ? SUMMARY_ONLY_SYSTEM_PROMPT
      : BASE_SYSTEM_PROMPT;
  const systemInstruction = `${systemPrompt}\n\nLanguage requirement:\n${languageRule}`;

  const includeRc = Boolean(options.includeRelatedContext);

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText: `includeRelatedContext: ${includeRc}\nSource type: ${contentType}\nTitle: ${title}\n\nContent:\n${inputText}`,
  });

  const parsed = JSON.parse(text) as Partial<AISummaryResult>;

  if (!parsed.summary || !parsed.tldr) {
    throw new Error("Gemini returned incomplete response — missing summary or tldr");
  }

  const relatedRaw = parsed.relatedContext;
  const relatedContext =
    includeRc && typeof relatedRaw === "string" && relatedRaw.trim().length > 0
      ? relatedRaw.trim()
      : undefined;

  return {
    tldr: parsed.tldr,
    summary: parsed.summary,
    keyInsights: parsed.keyInsights ?? [],
    keyQuotes: parsed.keyQuotes ?? [],
    questionsAnswered: parsed.questionsAnswered ?? [],
    actionItems: parsed.actionItems ?? [],
    depthIndicator: parsed.depthIndicator ?? "intermediate",
    relatedContext,
  };
}
