/**
 * AI derivatives router.
 *
 * Orchestrates which AI calls to make per `SourceType`, and returns a single
 * `DerivativeResult` patch that the mutations layer applies atomically.
 *
 * Rules (from the product spec):
 *   - all source families now default to tldr + short summary only.
 *   - insights/questions/quotes/actions are generated on-demand from the card UI.
 *   - social_*: summary mandatory, Ask disabled
 *   - code_* / markup / plain_text: tldr + short "what this is/does" summary
 *   - voice_memo / file_upload: fall through to generic summary pipeline
 */

import { generateSummary } from "@/lib/knowledge/ai/generateSummary";
import { generateTitleSuggestion } from "@/lib/knowledge/ai/generateTitleSuggestion";
import { suggestTags } from "@/lib/knowledge/ai/suggestTags";
import type { DepthIndicator } from "@/types/knowledge";
import type { SourceType } from "@/types/knowledge-source";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type DerivativeResult = {
  tldr?: string;
  summary?: string;
  contentOverview?: string;
  keyInsights?: string[];
  keyQuotes?: string[];
  actionItems?: string[];
  questionsAnswered?: string[];
  chatStarters?: string[];
  tags?: string[];
  depthIndicator?: DepthIndicator;
  suggestedTitle?: string;
};

export type DerivativeInput = {
  sourceType: SourceType;
  title: string;
  aiInputText: string;
  /** Legacy content_type hint used by summary prompts. */
  contentType: string;
  /** When the type is YouTube, this carries the page URL so the digest can
   *  call the multimodal video path. */
  youtubePageUrl?: string;
  /** When true and stored title is poor, run a title suggestion pass. */
  allowTitleSuggestion?: boolean;
  /** UI language the AI output should be written in. Overrides "match source
   *  language" so users always see content in their preferred language. */
  targetLanguage?: AppLocale;
  /**
   * Snapshot of every tag already used in the user's knowledge base. The
   * tagger uses it to prefer reusing existing tags instead of inventing
   * near-duplicates ("ai-agent" vs "ai-agents"). Optional — empty array is
   * safe.
   */
  knownTags?: string[];
  /**
   * When true, skip the legacy `suggestTags` Gemini call — used when the
   * knowledge pipeline will run `runKnowledgeGeminiTaxonomyForItem`
   * instead (per-user DB taxonomy).
   */
  skipTagSuggestions?: boolean;
};

export async function generateKnowledgeDerivatives(
  input: DerivativeInput,
): Promise<DerivativeResult> {
  const aiInput = input.aiInputText.trim();
  if (!aiInput) {
    // Nothing to summarize — return empty, the caller marks partial.
    return {};
  }

  const family = sourceTypeFamily(input.sourceType);

  try {
    if (family === "youtube" && input.youtubePageUrl) {
      return await runYouTubeDerivatives(input);
    }

    if (family === "social") {
      return await runSocialDerivatives(input);
    }

    if (family === "github") {
      return await runGitHubDerivatives(input);
    }

    if (family === "code") {
      return await runCodeDerivatives(input);
    }

    // article, markup, plain_text, files, voice — full summary pipeline
    return await runFullDerivatives(input);
  } catch (err) {
    console.error("[derivatives] generation failed:", err);
    return {};
  }
}

// ── Family dispatchers ────────────────────────────────────────────────────

async function runFullDerivatives(input: DerivativeInput): Promise<DerivativeResult> {
  const summary = await generateSummary(
    input.aiInputText,
    input.title,
    input.contentType,
    { targetLanguage: input.targetLanguage, detailLevel: "summary-only" },
  );
  const tags = input.skipTagSuggestions
    ? []
    : await suggestTags(input.aiInputText, input.title, {
        knownTags: input.knownTags,
      }).catch(() => [] as string[]);
  const suggestedTitle = input.allowTitleSuggestion
    ? await generateTitleSuggestion({
        rawText: input.aiInputText,
        currentTitle: input.title,
        contentType: input.contentType,
        summary: summary.summary,
        targetLanguage: input.targetLanguage,
      }).catch(() => "")
    : "";

  return {
    tldr: summary.tldr,
    summary: summary.summary,
    keyInsights: [],
    keyQuotes: [],
    questionsAnswered: [],
    actionItems: [],
    depthIndicator: summary.depthIndicator,
    tags,
    suggestedTitle: suggestedTitle || undefined,
  };
}

async function runYouTubeDerivatives(input: DerivativeInput): Promise<DerivativeResult> {
  return await runFullDerivatives(input);
}

async function runSocialDerivatives(input: DerivativeInput): Promise<DerivativeResult> {
  // Summary is mandatory; insights/quotes/actions intentionally empty.
  // Match caption/script language (简体 vs 繁体 etc.) — do not force the user's UI locale.
  const summary = await generateSummary(
    input.aiInputText,
    input.title,
    "note", // social posts behave more like short notes
    { detailLevel: "summary-only" },
  );
  const tags = input.skipTagSuggestions
    ? []
    : await suggestTags(input.aiInputText, input.title, {
        knownTags: input.knownTags,
      }).catch(() => [] as string[]);
  const suggestedTitle = await generateTitleSuggestion({
    rawText: input.aiInputText,
    currentTitle: input.title,
    contentType: "social_post",
    summary: summary.summary,
    targetLanguage: undefined,
  }).catch(() => "");
  return {
    tldr: summary.tldr,
    summary: summary.summary,
    contentOverview: undefined,
    keyInsights: [],
    keyQuotes: [],
    actionItems: [],
    questionsAnswered: [],
    depthIndicator: summary.depthIndicator,
    tags,
    suggestedTitle: suggestedTitle || undefined,
  };
}

async function runGitHubDerivatives(input: DerivativeInput): Promise<DerivativeResult> {
  const summary = await generateSummary(input.aiInputText, input.title, "article", {
    targetLanguage: input.targetLanguage,
    detailLevel: "summary-only",
  });
  const tags = input.skipTagSuggestions
    ? []
    : await suggestTags(input.aiInputText, input.title, {
        knownTags: input.knownTags,
      }).catch(() => [] as string[]);
  return {
    tldr: summary.tldr,
    summary: summary.summary,
    keyInsights: [],
    keyQuotes: [], // repos have no quotes
    actionItems: [],
    questionsAnswered: [],
    depthIndicator: summary.depthIndicator ?? "reference",
    tags,
  };
}

async function runCodeDerivatives(input: DerivativeInput): Promise<DerivativeResult> {
  const summary = await generateSummary(input.aiInputText, input.title, "note", {
    targetLanguage: input.targetLanguage,
    detailLevel: "summary-only",
  });
  const tags = input.skipTagSuggestions
    ? []
    : await suggestTags(input.aiInputText, input.title, {
        knownTags: input.knownTags,
      }).catch(() => [] as string[]);
  return {
    tldr: summary.tldr,
    summary: summary.summary,
    keyInsights: [],
    keyQuotes: [],
    actionItems: [],
    questionsAnswered: [],
    depthIndicator: summary.depthIndicator ?? "reference",
    tags,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function sourceTypeFamily(
  sourceType: SourceType,
): "article" | "youtube" | "social" | "github" | "code" | "markup" | "plain" | "file" {
  if (sourceType === "article_url" || sourceType === "url_other") return "article";
  if (sourceType === "youtube_video" || sourceType === "youtube_shorts") return "youtube";
  if (sourceType.startsWith("social_")) return "social";
  if (sourceType === "github_repository") return "github";
  if (sourceType.startsWith("code_")) return "code";
  if (sourceType === "html_input" || sourceType === "markdown_input") return "markup";
  if (sourceType === "file_upload" || sourceType === "voice_memo") return "file";
  return "plain";
}
