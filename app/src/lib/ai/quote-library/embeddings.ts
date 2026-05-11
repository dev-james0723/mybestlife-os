/**
 * Gemini text-embedding-004 helper.
 *
 * Output dimension: 768. Matches the `vector(768)` column in
 * `supabase/migrations/20260620180000_quote_library_embeddings.sql`.
 */

const EMBEDDING_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

type EmbedResponse = {
  embedding?: { values?: number[] };
};

export async function embedQuoteText(params: {
  apiKey: string;
  text: string;
  /** Optional: short title (e.g. the author) improves retrieval quality. */
  title?: string | null;
}): Promise<number[]> {
  const res = await fetch(
    `${EMBEDDING_ENDPOINT}?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: params.text }] },
        title: params.title ?? undefined,
        taskType: "RETRIEVAL_DOCUMENT",
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`embedding_http_${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as EmbedResponse;
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("embedding_empty");
  }
  return values;
}

export async function embedQueryText(params: {
  apiKey: string;
  text: string;
}): Promise<number[]> {
  const res = await fetch(
    `${EMBEDDING_ENDPOINT}?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: params.text }] },
        taskType: "RETRIEVAL_QUERY",
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`embedding_http_${res.status}: ${body.slice(0, 400)}`);
  }
  const json = (await res.json()) as EmbedResponse;
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("embedding_empty");
  }
  return values;
}
