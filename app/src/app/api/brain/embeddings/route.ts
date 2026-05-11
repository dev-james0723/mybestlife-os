/**
 * POST /api/brain/embeddings
 *
 * Body:
 *   {
 *     items: Array<{
 *       node_id: string;        // namespaced BrainNode id ("goal::abc")
 *       node_type: string;      // BrainNodeType
 *       source_id?: string;     // raw row id
 *       source_type?: string;
 *       content: string;        // text to embed
 *       title?: string;         // optional, improves retrieval quality
 *     }>;
 *   }
 *
 * Generates a Gemini text-embedding-004 vector for each item and upserts
 * it into `brain_node_embeddings`. Idempotent: a stable content hash is
 * used as part of the unique key so re-running with the same content is
 * a no-op.
 *
 * Rate-limited to 50 items per call to avoid long-running requests.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  composeEmbeddingText,
  embedBrainNodeText,
} from "@/lib/brain/embeddings";
import { computeEvidenceHash } from "@/lib/brain/evidenceHash";

export const runtime = "nodejs";

const MAX_BATCH = 50;

type Item = {
  node_id: string;
  node_type: string;
  source_id?: string;
  source_type?: string;
  content: string;
  title?: string | null;
};

function isItem(value: unknown): value is Item {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.node_id === "string" &&
    typeof v.node_type === "string" &&
    typeof v.content === "string"
  );
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_gemini_api_key" },
      { status: 500 },
    );
  }

  let bodyJson: { items?: unknown } = {};
  try {
    const text = await request.text();
    if (text) bodyJson = JSON.parse(text) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const rawItems = Array.isArray(bodyJson.items) ? bodyJson.items : [];
  const items = rawItems.filter(isItem).slice(0, MAX_BATCH);

  if (items.length === 0) {
    return NextResponse.json({ processed: 0, results: [] });
  }

  const results: { node_id: string; ok: boolean; error?: string }[] = [];
  for (const item of items) {
    try {
      const text = composeEmbeddingText({
        title: item.title ?? undefined,
        bodyText: item.content,
      });
      // Hash the embedded content so we can dedupe.
      const contentHash = await computeEvidenceHash({
        sourceNodeId: item.node_id,
        targetNodeId: item.node_id,
        relationshipType: "embedding",
        evidence: { text },
      });
      const values = await embedBrainNodeText({
        apiKey,
        text,
        title: item.title ?? null,
      });
      const { error: writeError } = await supabase
        .from("brain_node_embeddings")
        .upsert(
          {
            node_id: item.node_id,
            node_type: item.node_type,
            source_id: item.source_id ?? null,
            source_type: item.source_type ?? null,
            content_hash: contentHash,
            embedding: values as unknown as string,
            embedding_model: "text-embedding-004",
          },
          { onConflict: "user_id,node_id,content_hash" },
        );
      if (writeError) throw writeError;
      results.push({ node_id: item.node_id, ok: true });
    } catch (e) {
      results.push({
        node_id: item.node_id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
