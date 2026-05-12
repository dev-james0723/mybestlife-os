import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { buildDocumentOracleDigestForAi } from "@/lib/document-brain/documentOracleDigest";
import { infographicFocusOptionsResponseSchema } from "@/lib/document-brain/docOracleGeneratedSchemas";
import { extractJsonObjectFromModelText } from "@/lib/document-brain/geminiJsonExtract";
import type { LoadedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";
import { INFOGRAPHIC_STYLE_PRESETS } from "@/lib/document-brain/infographicStyles";

export async function generateInfographicFocusOptionsModelJson(ctx: LoadedDocumentOracleContext): Promise<{
  parsed: ReturnType<typeof infographicFocusOptionsResponseSchema.parse>;
  modelUsed: string;
}> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) throw new Error("gemini_missing");

  const digest = buildDocumentOracleDigestForAi(ctx, 22_000);
  const styleIds = INFOGRAPHIC_STYLE_PRESETS.map((p) => p.id).join(", ");

  const systemInstruction = [
    "You classify a parsed PDF and propose infographic focus angles for a document-grounded visual.",
    "Return JSON ONLY (no markdown fences).",
    "Shape:",
    `{ "document_type":"financial_report|event_guide|academic|policy|manual|marketing|legal|unknown",`,
    `  "summary":"short plain description of what the PDF is about",`,
    `  "focus_options":[`,
    `    { "id":"snake_case_id", "label":"...", "description":"...",`,
    `      "recommended_styles":["executive_brief",...],`,
    `      "source_pages":[1,2], "source_sections":["optional section titles"] }`,
    `  ]`,
    `}`,
    "",
    `Valid infographic style ids for recommended_styles: ${styleIds}`,
    "Produce 6–12 focus options tailored to the detected document type.",
    "Each focus option should be realistically supportable from the digest (use source_pages that likely contain evidence).",
  ].join("\n");

  const userText = [`DIGEST:\n`, digest].join("\n");

  const { text, modelUsed } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction,
    userText,
  });

  const raw = extractJsonObjectFromModelText(text);
  const parsed = infographicFocusOptionsResponseSchema.parse(JSON.parse(raw));
  return { parsed, modelUsed };
}
