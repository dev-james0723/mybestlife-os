import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { languageDirective } from "@/lib/knowledge/ai/language";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type KnowledgeDeferredDetailSection = "keyInsights" | "questionsAnswered";

const FALLBACK_LANGUAGE_RULE =
  "Detect the dominant language of the source content and produce the output in that same language. " +
  "For Chinese, preserve the source script exactly: Traditional Chinese stays Traditional, " +
  "Simplified Chinese stays Simplified.";

const SECTION_CONFIG: Record<
  KnowledgeDeferredDetailSection,
  { count: string; instruction: string }
> = {
  keyInsights: {
    count: "3-6",
    instruction:
      "Generate the most useful key insights: concise takeaways, arguments, mechanics, or implications. Do not repeat the one-sentence summary.",
  },
  questionsAnswered: {
    count: "3-5",
    instruction:
      "Generate questions about this knowledge that a reader might ask before studying it. Return questions only, not answers.",
  },
};

function parseItems(text: string): string[] {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(trimmed) as unknown;
  const rawItems =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
        ? (parsed as { items: unknown[] }).items
        : [];

  return rawItems
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export async function generateDeferredKnowledgeDetail(params: {
  section: KnowledgeDeferredDetailSection;
  title: string;
  contentType: string;
  aiInputText: string;
  tldr?: string | null;
  summary?: string | null;
  targetLanguage?: AppLocale;
}): Promise<string[]> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const source = params.aiInputText.trim();
  if (!source) {
    throw new Error("No content available for detail generation");
  }

  const config = SECTION_CONFIG[params.section];
  const languageRule = params.targetLanguage
    ? languageDirective(params.targetLanguage)
    : FALLBACK_LANGUAGE_RULE;

  const systemInstruction =
    "You generate one optional detail section for an existing knowledge card.\n" +
    `Return ONLY valid JSON in the shape {"items": ["..."]}. Produce ${config.count} items.\n` +
    `${config.instruction}\n` +
    "Use the existing summary as context, but ground the output in the source content. Avoid generic filler.\n\n" +
    `Language requirement:\n${languageRule}`;

  const existingSummary = [
    params.tldr ? `One-sentence summary: ${params.tldr}` : "",
    params.summary ? `Short description: ${params.summary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText:
      `Requested section: ${params.section}\n` +
      `Source type: ${params.contentType}\n` +
      `Title: ${params.title}\n\n` +
      `${existingSummary ? `${existingSummary}\n\n` : ""}` +
      `Source content:\n${source.slice(0, 12000)}`,
  });

  const items = parseItems(text);
  if (items.length === 0) {
    throw new Error("Gemini returned no detail items");
  }
  return items;
}
