/**
 * Brain node embeddings — generic Gemini text-embedding-004 wrapper.
 *
 * Mirrors `lib/ai/quote-library/embeddings.ts` but generalized: any Brain
 * node's title + summary + bodyText becomes the embedded content.
 *
 * Multi-user safety: this file is pure (no DB I/O). The API route in
 * `app/api/brain/embeddings/route.ts` is the only place that writes to
 * `brain_node_embeddings`, and it does so under the user's authenticated
 * Supabase client so RLS scopes it to `auth.uid()` automatically.
 */

const EMBEDDING_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

type EmbedResponse = {
  embedding?: { values?: number[] };
};

export async function embedBrainNodeText(params: {
  apiKey: string;
  text: string;
  /** Optional title — improves retrieval quality for short documents. */
  title?: string | null;
  /** "RETRIEVAL_DOCUMENT" for stored embeddings, "RETRIEVAL_QUERY" for queries. */
  taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
}): Promise<number[]> {
  const taskType = params.taskType ?? "RETRIEVAL_DOCUMENT";
  const res = await fetch(
    `${EMBEDDING_ENDPOINT}?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: params.text }] },
        title: params.title ?? undefined,
        taskType,
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

/**
 * Compose the canonical text used to embed a Brain node — title + summary
 * + bodyText, joined with newlines and capped at ~8KB so we stay well
 * within the model's 2048-token input limit.
 */
export function composeEmbeddingText(input: {
  title?: string;
  summary?: string;
  bodyText?: string;
}): string {
  const parts: string[] = [];
  if (input.title) parts.push(input.title);
  if (input.summary) parts.push(input.summary);
  if (input.bodyText) parts.push(input.bodyText);
  const joined = parts.join("\n\n");
  // Cap at ~8KB to stay safely below the model's input window.
  return joined.length > 8000 ? joined.slice(0, 8000) : joined;
}
