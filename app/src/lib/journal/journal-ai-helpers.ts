import type { AppLocale } from "@/lib/i18n/app-locale";
import type { Json } from "@/types/database";

export type JournalIllustrationStyle =
  | "symbolic_cinematic"
  | "soft_watercolor"
  | "minimalist_editorial"
  | "anime_inspired"
  | "photoreal";

export const JOURNAL_ILLUSTRATION_STYLES: JournalIllustrationStyle[] = [
  "symbolic_cinematic",
  "soft_watercolor",
  "minimalist_editorial",
  "anime_inspired",
  "photoreal",
];

const STYLE_PROMPTS: Record<JournalIllustrationStyle, string> = {
  symbolic_cinematic: "symbolic cinematic illustration with atmospheric lighting",
  soft_watercolor: "soft watercolor illustration with gentle washes and paper texture",
  minimalist_editorial: "minimalist editorial illustration with clean shapes and restrained palette",
  anime_inspired: "anime-inspired illustration with expressive mood and stylized composition",
  photoreal: "photorealistic scene with cinematic framing but still symbolic rather than literal portraiture",
};

export function illustrationStylePrompt(style: JournalIllustrationStyle | string | null | undefined): string {
  if (style && style in STYLE_PROMPTS) {
    return STYLE_PROMPTS[style as JournalIllustrationStyle];
  }
  return STYLE_PROMPTS.symbolic_cinematic;
}

export function localeToGeminiLanguage(locale: AppLocale): string {
  const map: Record<AppLocale, string> = {
    en: "English",
    "zh-TW": "Traditional Chinese (Hong Kong)",
    "zh-CN": "Simplified Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    it: "Italian",
    es: "Spanish",
    vi: "Vietnamese",
  };
  return map[locale] ?? "English";
}

export function emotionQuadrantLabel(emotionQuadrant: Json | null | undefined): string | null {
  if (!emotionQuadrant || typeof emotionQuadrant !== "object" || Array.isArray(emotionQuadrant)) {
    return null;
  }
  const o = emotionQuadrant as Record<string, unknown>;
  const p = typeof o.pleasantness === "number" ? o.pleasantness : null;
  const a = typeof o.activation === "number" ? o.activation : null;
  if (p == null || a == null) return null;
  const highP = p >= 3;
  const highA = a >= 3;
  if (highP && highA) return "high pleasantness + high activation";
  if (highP && !highA) return "high pleasantness + low activation";
  if (!highP && highA) return "low pleasantness + high activation";
  return "low pleasantness + low activation";
}

export function parseBulletsFromText(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function bulletsToText(bullets: string[] | null | undefined): string {
  return (bullets ?? []).join("\n");
}

export type JournalStructuredInput = {
  topic?: string | null;
  quadrant?: string | null;
  primaryEmotion?: string | null;
  secondaryEmotion?: string | null;
  intensity?: number | null;
  target?: string | null;
  bullets?: string[];
  selfStory?: string | null;
  needs?: string[];
  nextTinyStep?: string | null;
  appreciation?: string | null;
  topicExtras?: Record<string, unknown>;
  contextFactors?: Record<string, unknown>;
  content?: string | null;
  aiSummary?: string | null;
};

export function buildJournalEntryUserText(input: JournalStructuredInput): string {
  const lines: string[] = [];
  if (input.content?.trim()) lines.push(`Free-form journal content:\n${input.content.trim()}`);
  if (input.topic?.trim()) lines.push(`Topic: ${input.topic.trim()}`);
  if (input.quadrant) lines.push(`Emotional quadrant: ${input.quadrant}`);
  if (input.primaryEmotion?.trim()) lines.push(`Primary emotion: ${input.primaryEmotion.trim()}`);
  if (input.secondaryEmotion?.trim()) lines.push(`Secondary emotion: ${input.secondaryEmotion.trim()}`);
  if (input.intensity != null) lines.push(`Intensity (1-10): ${input.intensity}`);
  if (input.target?.trim()) lines.push(`Target / focus: ${input.target.trim()}`);
  if (input.bullets?.length) {
    lines.push(`What happened:\n${input.bullets.map((b) => `- ${b}`).join("\n")}`);
  }
  if (input.selfStory?.trim()) lines.push(`Self-story: ${input.selfStory.trim()}`);
  if (input.needs?.length) lines.push(`Needs: ${input.needs.join(", ")}`);
  if (input.nextTinyStep?.trim()) lines.push(`Next tiny step: ${input.nextTinyStep.trim()}`);
  if (input.appreciation?.trim()) lines.push(`Appreciation note: ${input.appreciation.trim()}`);
  if (input.aiSummary?.trim()) lines.push(`AI summary (if any):\n${input.aiSummary.trim()}`);
  if (input.topicExtras && Object.keys(input.topicExtras).length > 0) {
    lines.push(`Topic extras:\n${JSON.stringify(input.topicExtras, null, 2)}`);
  }
  if (input.contextFactors && Object.keys(input.contextFactors).length > 0) {
    lines.push(`Context factors:\n${JSON.stringify(input.contextFactors, null, 2)}`);
  }
  return lines.join("\n\n");
}

export type JournalAiReflection = {
  journalEntry: string;
  emotionalRead: string[];
  suggestions: {
    coping: string;
    practical: string;
    reframeQuestions: string[];
  };
  earnedAppreciation: string;
  themes: string[];
  likelyPattern?: string;
};

export function parseJournalAiReflection(raw: Json | null | undefined): JournalAiReflection | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.journalEntry !== "string") return null;
  const emotionalRead = Array.isArray(o.emotionalRead)
    ? o.emotionalRead.filter((x): x is string => typeof x === "string")
    : [];
  const suggestionsRaw = o.suggestions;
  if (!suggestionsRaw || typeof suggestionsRaw !== "object" || Array.isArray(suggestionsRaw)) return null;
  const s = suggestionsRaw as Record<string, unknown>;
  if (typeof s.coping !== "string" || typeof s.practical !== "string") return null;
  const reframeQuestions = Array.isArray(s.reframeQuestions)
    ? s.reframeQuestions.filter((x): x is string => typeof x === "string")
    : [];
  if (typeof o.earnedAppreciation !== "string") return null;
  const themes = Array.isArray(o.themes) ? o.themes.filter((x): x is string => typeof x === "string") : [];
  return {
    journalEntry: o.journalEntry,
    emotionalRead,
    suggestions: {
      coping: s.coping,
      practical: s.practical,
      reframeQuestions,
    },
    earnedAppreciation: o.earnedAppreciation,
    themes,
    likelyPattern: typeof o.likelyPattern === "string" ? o.likelyPattern : undefined,
  };
}

export function parseAudioQuotes(raw: Json | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}
