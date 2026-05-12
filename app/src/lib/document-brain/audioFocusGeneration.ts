import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { buildDocumentOracleDigestForAi } from "@/lib/document-brain/documentOracleDigest";
import { audioFocusOptionsResponseSchema } from "@/lib/document-brain/docOracleGeneratedSchemas";
import { extractJsonObjectFromModelText } from "@/lib/document-brain/geminiJsonExtract";
import type { LoadedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";

export async function generateAudioFocusOptionsModelJson(ctx: LoadedDocumentOracleContext): Promise<{
  parsed: ReturnType<typeof audioFocusOptionsResponseSchema.parse>;
  modelUsed: string;
}> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new Error("gemini_missing");

  const digest = buildDocumentOracleDigestForAi(ctx, 20_000);

  const systemInstruction = [
    "You propose spoken audio-summary focus angles for a parsed PDF the user owns.",
    "Return JSON ONLY (no markdown fences).",
    "Shape:",
    `{ "document_summary":"...", "focus_options":[`,
    `  { "id":"snake_case", "label":"...", "description":"...", "recommended_duration":"3-5 minutes" }`,
    `]}`,
    "Provide 6–12 options tailored to the document (financial vs festival guide vs academic, etc.).",
    "recommended_duration is optional; use realistic ranges like '1-2 minutes', '3-5 minutes', '6-10 minutes'.",
  ].join("\n");

  const { text, modelUsed } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText: `DIGEST:\n${digest}`,
  });

  const raw = extractJsonObjectFromModelText(text);
  const parsed = audioFocusOptionsResponseSchema.parse(JSON.parse(raw));
  return { parsed, modelUsed };
}
