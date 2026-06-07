import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";

export function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no_json_object");
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function fetchPlannerFocusJson(params: {
  system: string;
  user: string;
}): Promise<unknown | null> {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) return null;
  const { text } = await fetchGeminiPlannerJsonText({
    apiKey,
    systemInstruction: params.system,
    userText: params.user,
  });
  return extractJsonObject(text);
}
