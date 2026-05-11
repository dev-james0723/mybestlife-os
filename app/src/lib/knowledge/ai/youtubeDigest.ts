import {
  fetchGeminiPlannerJsonText,
  fetchGeminiPlannerJsonWithUserParts,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import type { AISummaryResult } from "@/lib/knowledge/ai/generateSummary";
import { canonicalYouTubeWatchUrl } from "@/lib/knowledge/youtube";
import { languageDirective } from "@/lib/knowledge/ai/language";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type YoutubeKnowledgeDigest = AISummaryResult & {
  contentOverview: string;
  suggestedChatQuestions: string[];
};

const YOUTUBE_DIGEST_BASE_SYSTEM = `You are a knowledge base assistant analyzing a YouTube video.
Output a single JSON object with ALL of the following keys:

- "tldr": One sentence, max 15 words — the essential takeaway.
- "summary": 3-5 sentences of substantive prose about what happens in the video and what the viewer learns. No filler.
- "contentOverview": 2-4 sentences describing the video at a high level: main themes, how the content is structured, who it is for, and the arc of the discussion. Must be clearly different from "summary" (more panoramic, less detail-dense).
- "keyInsights": Array of 3-6 strings — strongest ideas, arguments, or techniques from the video.
- "keyQuotes": Array of 0-3 verbatim short quotes only if you are certain they are spoken/written in the video; otherwise [].
- "questionsAnswered": Array of 3-5 questions this video answers well.
- "actionItems": Array of genuine action items if there are 2+; else [].
- "depthIndicator": One of "intro", "intermediate", "technical", "reference".
- "suggestedChatQuestions": Exactly 5-6 short question strings a viewer might ask next (e.g. "What is the main argument?", "What should I do first?"). Must be specific to this video, not generic.

Rules:
- Be specific; avoid vague phrases like "this video talks about various topics".
- Respond ONLY with valid JSON. No markdown.`;

const FALLBACK_LANGUAGE_RULE = "Match the dominant spoken language of the video in your output.";

function buildSystemInstruction(locale: AppLocale | undefined): string {
  const languageRule = locale ? languageDirective(locale) : FALLBACK_LANGUAGE_RULE;
  return `${YOUTUBE_DIGEST_BASE_SYSTEM}\n\nLanguage requirement:\n${languageRule}`;
}

function parseDigest(text: string): YoutubeKnowledgeDigest {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const tldr = typeof parsed.tldr === "string" ? parsed.tldr.trim() : "";
  if (!summary || !tldr) {
    throw new Error("digest_incomplete");
  }
  const contentOverview =
    typeof parsed.contentOverview === "string"
      ? parsed.contentOverview.trim()
      : typeof parsed.overview === "string"
        ? parsed.overview.trim()
        : "";

  const rawStarters = parsed.suggestedChatQuestions;
  let suggestedChatQuestions: string[] = [];
  if (Array.isArray(rawStarters)) {
    suggestedChatQuestions = rawStarters
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 8);
  }

  return {
    tldr,
    summary,
    contentOverview: contentOverview || summary.slice(0, 400),
    keyInsights: Array.isArray(parsed.keyInsights)
      ? parsed.keyInsights.filter((x): x is string => typeof x === "string").map((s) => s.trim())
      : [],
    keyQuotes: Array.isArray(parsed.keyQuotes)
      ? parsed.keyQuotes.filter((x): x is string => typeof x === "string").map((s) => s.trim())
      : [],
    questionsAnswered: Array.isArray(parsed.questionsAnswered)
      ? parsed.questionsAnswered
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
      : [],
    actionItems: Array.isArray(parsed.actionItems)
      ? parsed.actionItems.filter((x): x is string => typeof x === "string").map((s) => s.trim())
      : [],
    depthIndicator:
      parsed.depthIndicator === "intro" ||
      parsed.depthIndicator === "intermediate" ||
      parsed.depthIndicator === "technical" ||
      parsed.depthIndicator === "reference"
        ? parsed.depthIndicator
        : "intermediate",
    suggestedChatQuestions,
  };
}

async function digestFromTextContext(params: {
  apiKey: string;
  contextBlock: string;
  titleHint: string;
  systemInstruction: string;
}): Promise<YoutubeKnowledgeDigest> {
  const { text } = await fetchGeminiPlannerJsonText({
    apiKey: params.apiKey,
    systemInstruction: params.systemInstruction,
    userText: `Source type: video (YouTube)\nTitle: ${params.titleHint}\n\nContext (metadata and/or transcript excerpts):\n${params.contextBlock.slice(0, 110_000)}`,
  });
  return parseDigest(text);
}

/**
 * Produces structured KB fields for a YouTube item using Gemini (video when supported, else text).
 */
export async function generateYoutubeKnowledgeDigest(params: {
  pageUrl: string;
  /** Title from oEmbed / page */
  title: string;
  /** Plaintext: URL, channel, description, optional transcript */
  contextBlock: string;
  /** UI language to write the digest in. */
  targetLanguage?: AppLocale;
}): Promise<YoutubeKnowledgeDigest> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const canonical = canonicalYouTubeWatchUrl(params.pageUrl);
  const textContext = `${params.contextBlock}\n\nTitle: ${params.title}`.trim();
  const systemInstruction = buildSystemInstruction(params.targetLanguage);

  if (canonical) {
    try {
      const userParts = [
        {
          fileData: {
            mimeType: "video/mp4",
            fileUri: canonical,
          },
        },
        {
          text: `Use the attached public YouTube video as the primary source. Return only one JSON object as specified in the system instruction.\n\nSupplementary text (metadata / description / transcript excerpt — may be partial):\n${textContext.slice(0, 8000)}`,
        },
      ];
      const { text } = await fetchGeminiPlannerJsonWithUserParts({
        apiKey,
        systemInstruction,
        userParts,
        timeoutMs: 180_000,
      });
      return parseDigest(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[youtube-digest] video path failed, falling back to text: ${msg.slice(0, 200)}`);
    }
  }

  return digestFromTextContext({
    apiKey,
    contextBlock: textContext,
    titleHint: params.title,
    systemInstruction,
  });
}
