/** Strip common Markdown fences so `JSON.parse` works on model output. */
export function extractJsonObjectFromModelText(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "").trim();
  }
  return t;
}
