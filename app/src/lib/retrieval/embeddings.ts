/**
 * Gemini text-embedding-004 helper for the shared OS retrieval index.
 *
 * Output dimension: 768. Matches os_retrieval_documents.embedding.
 */

const EMBEDDING_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

type EmbedResponse = {
  embedding?: { values?: number[] };
};

async function embedText(params: {
  apiKey: string;
  text: string;
  title?: string | null;
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
}): Promise<number[]> {
  const res = await fetch(
    `${EMBEDDING_ENDPOINT}?key=${encodeURIComponent(params.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: params.text }] },
        title: params.title ?? undefined,
        taskType: params.taskType,
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`retrieval_embedding_http_${res.status}: ${body.slice(0, 400)}`);
  }

  const json = (await res.json()) as EmbedResponse;
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`retrieval_embedding_bad_dimension_${values?.length ?? 0}`);
  }
  return values;
}

export function composeRetrievalEmbeddingText(input: {
  title?: string | null;
  body: string;
  tags?: string[];
  maxChars?: number;
}): string {
  const parts = [
    input.title?.trim(),
    input.tags?.length ? `Tags: ${input.tags.join(", ")}` : null,
    input.body.trim(),
  ].filter((part): part is string => Boolean(part));
  const joined = parts.join("\n\n");
  const maxChars = input.maxChars ?? 8000;
  return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
}

export function embedRetrievalDocumentText(params: {
  apiKey: string;
  text: string;
  title?: string | null;
}): Promise<number[]> {
  return embedText({
    apiKey: params.apiKey,
    text: params.text,
    title: params.title,
    taskType: "RETRIEVAL_DOCUMENT",
  });
}

export function embedRetrievalQueryText(params: {
  apiKey: string;
  text: string;
}): Promise<number[]> {
  return embedText({
    apiKey: params.apiKey,
    text: params.text,
    taskType: "RETRIEVAL_QUERY",
  });
}
