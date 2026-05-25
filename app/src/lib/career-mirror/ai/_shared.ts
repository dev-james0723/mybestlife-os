/**
 * Server-only shared helpers for the AI Career Mirror generators.
 *
 * Each generator reuses {@link fetchGeminiStructured} with
 * {@link getGeminiServerApiKey} + {@link getGeminiPlannerTextModel}, passes the
 * user's locale so output language follows them, and Zod-validates before
 * returning. Errors propagate to the route handler, which converts AI/model
 * failures into `HTTP 200 { ok:false, error }`.
 */

import {
  fetchGeminiStructured,
  getGeminiServerApiKey,
  getGeminiPlannerTextModel,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/app-locale";
import type { ZodType } from "zod";

export const CAREER_MIRROR_PERSONA =
  "You are the AI Career Mirror — a sharp, perceptive career strategist. You " +
  "see people clearly: their patterns, tensions, and avoidances. You are " +
  "honest and specific, never a cheerleader and never clinical. You speak " +
  "plainly, like a trusted advisor who has nothing to sell. Avoid filler, " +
  "hedging, and generic motivational language.";

const LOCALE_DIRECTIVE: Record<AppLocale, string> = {
  en: "Write all output in natural English.",
  "zh-TW": "請以繁體中文（台灣用語）輸出所有內容。",
  "zh-CN": "请用简体中文输出所有内容。",
  ja: "すべての出力を自然な日本語で記述してください。",
  ko: "모든 출력을 자연스러운 한국어로 작성하세요.",
  fr: "Rédigez tout le contenu en français naturel.",
  it: "Scrivi tutto il contenuto in italiano naturale.",
  es: "Escribe todo el contenido en español natural.",
  vi: "Viết toàn bộ nội dung bằng tiếng Việt tự nhiên.",
};

/** Locale → "write in this language" instruction appended to the system prompt. */
export function localeDirective(locale: AppLocale | undefined): string {
  return LOCALE_DIRECTIVE[locale ?? DEFAULT_LOCALE] ?? LOCALE_DIRECTIVE.en;
}

/** Build a system instruction: persona + task brief + locale directive. */
export function buildSystemInstruction(
  taskBrief: string,
  locale: AppLocale | undefined,
): string {
  return `${CAREER_MIRROR_PERSONA}\n\n${taskBrief}\n\n${localeDirective(locale)}`;
}

/** Thrown by every generator when the server has no Gemini API key configured. */
export class CareerMirrorConfigError extends Error {
  constructor() {
    super("ai_not_configured");
    this.name = "CareerMirrorConfigError";
  }
}

/**
 * Run one structured Gemini generation and validate the raw output with the
 * supplied Zod schema. Returns the validated value + the model that produced it.
 */
export async function runCareerMirrorGenerator<T>(params: {
  taskBrief: string;
  userText: string;
  responseSchema: GeminiResponseSchema;
  validator: ZodType<T>;
  locale: AppLocale | undefined;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ data: T; modelUsed: string }> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new CareerMirrorConfigError();

  const { data, modelUsed } = await fetchGeminiStructured<unknown>({
    apiKey,
    model: getGeminiPlannerTextModel(),
    systemInstruction: buildSystemInstruction(params.taskBrief, params.locale),
    userText: params.userText,
    responseSchema: params.responseSchema,
    temperature: params.temperature ?? 0.45,
    maxOutputTokens: params.maxOutputTokens ?? 4096,
  });

  return { data: params.validator.parse(data), modelUsed };
}

/** Compact JSON serialization helper for embedding context in prompts. */
export function asContext(label: string, value: unknown): string {
  let body: string;
  try {
    body = JSON.stringify(value, null, 0);
  } catch {
    body = String(value);
  }
  return `${label}:\n${body}`;
}
