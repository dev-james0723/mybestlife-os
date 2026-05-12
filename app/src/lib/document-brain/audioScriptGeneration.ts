import { z } from "zod";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { buildDocumentOracleDigestForAi } from "@/lib/document-brain/documentOracleDigest";
import { audioScriptSingleHostSchema, audioScriptTwoHostsSchema } from "@/lib/document-brain/docOracleGeneratedSchemas";
import { extractJsonObjectFromModelText } from "@/lib/document-brain/geminiJsonExtract";
import type { FocusSelectionInput } from "@/lib/document-brain/infographicGrounding";
import type { LoadedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";

export type AudioScriptRequest = {
  focusSelections: FocusSelectionInput[];
  customFocus: string;
  voiceGender: "male" | "female";
  format: "single_host" | "two_hosts";
  duration: "short" | "medium" | "long";
  language: "auto" | "en" | "zh-Hant";
};

function durationGuidance(d: AudioScriptRequest["duration"]): string {
  switch (d) {
    case "short":
      return "Target spoken length: about 1–2 minutes. Aim for roughly 180–320 spoken words.";
    case "medium":
      return "Target spoken length: about 3–5 minutes. Aim for roughly 450–850 spoken words.";
    case "long":
      return "Target spoken length: about 6–10 minutes. Aim for roughly 900–1600 spoken words.";
    default:
      return "";
  }
}

function languageGuidance(lang: AudioScriptRequest["language"], docLang: string | null): string {
  if (lang === "zh-Hant") return "Write the script in Traditional Chinese (繁體中文).";
  if (lang === "en") return "Write the script in English.";
  const dl = (docLang || "").toLowerCase();
  if (dl.startsWith("zh")) return "Write the script in Traditional Chinese (繁體中文) if the document is Chinese-heavy; otherwise English.";
  return "Match the document’s primary language (English vs Traditional Chinese) based on the digest.";
}

export async function generateDocOracleAudioScriptModelJson(
  ctx: LoadedDocumentOracleContext,
  req: AudioScriptRequest,
): Promise<{ raw: string; modelUsed: string }> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new Error("gemini_missing");

  const digest = buildDocumentOracleDigestForAi(ctx, 20_000);
  const focusLines = req.focusSelections
    .map((f) => `- ${f.id}: ${f.label} — ${f.description}`)
    .join("\n");

  const systemInstruction = [
    "You write grounded spoken audio scripts for a parsed PDF the user owns.",
    "Return JSON ONLY (no markdown fences).",
    "Rules:",
    "- Do not invent facts. If the digest lacks detail, say so explicitly in the script.",
    "- Prefer paraphrase over long quotations.",
    "- Include light page references in chapter metadata (source_pages arrays) but keep spoken lines natural.",
    "- Always set a top-level string field `format` to either `single_host` or `two_hosts` matching the user request.",
    "",
    "If format is `single_host`, return:",
    `{ "format":"single_host","title":"...","estimated_duration_seconds":240,"script":"full monologue...","chapters":[{"title":"...","text":"...","source_pages":[1,2]}],"source_pages":[1,2,3],"source_sections":["Section A"] }`,
    "",
    "If format is `two_hosts`, return:",
    `{ "format":"two_hosts","title":"...","estimated_duration_seconds":240,"turns":[{"speaker":"Host A","text":"..."},{"speaker":"Host B","text":"..."}],"source_pages":[1,2],"source_sections":["..."] }`,
    "",
    "Speakers for two_hosts must be exactly `Host A` and `Host B` alternating naturally.",
  ].join("\n");

  const userText = [
    `DOCUMENT_TITLE: ${ctx.documentTitle ?? ""}`,
    `REQUESTED_FORMAT: ${req.format}`,
    durationGuidance(req.duration),
    languageGuidance(req.language, ctx.language),
    "",
    "FOCUS THEMES:",
    focusLines || "(none — still summarize faithfully from digest)",
    "",
    `CUSTOM_FOCUS:\n${req.customFocus.trim() ? req.customFocus.trim().slice(0, 2000) : "(none)"}`,
    "",
    "GROUNDING DIGEST:",
    digest,
  ].join("\n\n");

  const { text, modelUsed } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText,
  });
  return { raw: text, modelUsed };
}

export function parseAudioScriptJson(text: string):
  | { kind: "single_host"; value: z.infer<typeof audioScriptSingleHostSchema> }
  | { kind: "two_hosts"; value: z.infer<typeof audioScriptTwoHostsSchema> } {
  const raw = extractJsonObjectFromModelText(text);
  const obj = JSON.parse(raw) as Record<string, unknown>;
  if (obj.format === "two_hosts") {
    return { kind: "two_hosts", value: audioScriptTwoHostsSchema.parse(obj) };
  }
  return { kind: "single_host", value: audioScriptSingleHostSchema.parse({ format: "single_host", ...obj }) };
}
