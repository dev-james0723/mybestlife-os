import type { AppLocale } from "@/lib/i18n/app-locale";
import { fetchGeminiChatText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { localeToGeminiLanguage } from "@/lib/i18n/gemini-locale";
import {
  buildBundledLensSystemInstruction,
  hasBundledSkill,
  readBundledSkillMarkdown,
} from "./load-bundled-skill";
import type { SkillProvider } from "./types";

export type InvokeMindSkillParams = {
  skillProvider: SkillProvider;
  skillId: string;
  agentId: string;
  lensTitle: string;
  systemPromptHint: string;
  locale: AppLocale;
  /** Full multi-turn history in Gemini `contents` shape (includes latest user message). */
  contents: { role: "user" | "model"; parts: { text: string }[] }[];
};

export type InvokeMindSkillResult = {
  text: string;
  source: "nuwa" | "internal" | "placeholder";
  modelUsed?: string;
  skillPackageLoaded?: boolean;
};

/**
 * Shown with every API response so clients can render persistent disclaimers.
 */
export function mindCouncilPublicDisclaimer(lensTitle: string): string {
  return `${lensTitle} is an AI-generated interpretive lens for brainstorming. It does not speak for or impersonate any real person, and it is not professional advice.`;
}

export function buildMindLensSystemInstruction(
  lensTitle: string,
  systemPromptHint: string,
  locale: AppLocale,
): string {
  const lang = localeToGeminiLanguage(locale);
  return `You are an AI "thinking lens" labeled: ${lensTitle}.

ETHICS (non-negotiable):
- Never claim to be a real person, never roleplay as their private voice, and never invent specific quotes, meetings, or biographical facts about real individuals.
- Frame guidance as patterns and heuristics inspired by public ideas associated with the lens name — not channeling a soul or consciousness.
- Avoid medical, legal, or personalized financial instructions; stay educational and suggest professionals when risk is high.

Lens style seed (creative interpretation only):
${systemPromptHint}

Output language: ${lang}.
Format: concise markdown with short headings when helpful.`;
}

function resolveSystemInstruction(params: InvokeMindSkillParams): {
  instruction: string;
  skillPackageLoaded: boolean;
} {
  const lang = localeToGeminiLanguage(params.locale);
  const bundled = readBundledSkillMarkdown(params.skillId);

  if (bundled) {
    return {
      instruction: buildBundledLensSystemInstruction({
        lensTitle: params.lensTitle,
        skillMarkdown: bundled,
        localeLanguage: lang,
        fallbackHint: params.systemPromptHint,
      }),
      skillPackageLoaded: true,
    };
  }

  return {
    instruction: buildMindLensSystemInstruction(
      params.lensTitle,
      params.systemPromptHint,
      params.locale,
    ),
    skillPackageLoaded: false,
  };
}

/** Preset lenses ship with vendored Agent Skill packages under bundled-skills/. */
export function presetHasSkillPackage(skillId: string): boolean {
  return hasBundledSkill(skillId);
}

/**
 * Routes mind skill execution through bundled Agent Skill markdown when available,
 * otherwise falls back to a short hint-based lens prompt.
 */
export async function invokeMindSkill(params: InvokeMindSkillParams): Promise<InvokeMindSkillResult> {
  if (params.skillProvider === "custom") {
    return runInternalGemini(params);
  }

  return runInternalGemini(params);
}

async function runInternalGemini(params: InvokeMindSkillParams): Promise<InvokeMindSkillResult> {
  const apiKey = getGeminiServerApiKey();
  const { instruction, skillPackageLoaded } = resolveSystemInstruction(params);

  if (!apiKey) {
    const preview = params.contents
      .filter((c) => c.role === "user")
      .map((c) => c.parts.map((p) => p.text).join(""))
      .join("\n")
      .slice(0, 400);
    const packageNote = skillPackageLoaded
      ? "Bundled Agent Skill package is loaded on the server."
      : "No bundled skill package found — using short hint prompt only.";
    return {
      text:
        `**Offline demo**\n\nServer Gemini keys are not set. After configuring GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY), answers will use the full lens framework.\n\n${packageNote}\n\nYour latest context (truncated):\n> ${preview || "(empty)"}`,
      source: "placeholder",
      skillPackageLoaded,
    };
  }

  const { text, modelUsed } = await fetchGeminiChatText({
    apiKey,
    systemInstruction: instruction,
    contents: params.contents,
    temperature: 0.55,
    maxOutputTokens: 4096,
  });

  return {
    text,
    source: skillPackageLoaded ? "nuwa" : "internal",
    modelUsed,
    skillPackageLoaded,
  };
}

export async function invokeMindCouncilSynthesis(params: {
  locale: AppLocale;
  userMessage: string;
  advisorSnippets: { lensTitle: string; reply: string }[];
}): Promise<{ text: string; modelUsed?: string; source: "internal" | "placeholder" }> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return {
      text:
        "Synthesis requires a configured Gemini API key. Each advisor reply above still stands on its own.",
      source: "placeholder",
    };
  }

  const lang = localeToGeminiLanguage(params.locale);
  const pack = params.advisorSnippets
    .map((a, i) => `### Advisor ${i + 1}: ${a.lensTitle}\n${a.reply}`)
    .join("\n\n");

  const systemInstruction = `You are the "Council Chair" — a neutral facilitator AI in a personal life OS.

The user asked a question to multiple independent "X-inspired lenses" (not real people). You have their individual answers.

Tasks:
1) Briefly surface agreements and productive tensions (no fake consensus).
2) Offer 3-5 integrated next steps the human can try this week.
3) Reinforce the ethical frame: these are interpretive lenses, not the voices of real individuals.

Language: ${lang}.
Format: markdown with short headings.`;

  const userText = `User question:\n${params.userMessage}\n\nAdvisor replies:\n${pack}`;

  const { text, modelUsed } = await fetchGeminiChatText({
    apiKey,
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    temperature: 0.4,
    maxOutputTokens: 4096,
  });

  return { text, modelUsed, source: "internal" };
}
