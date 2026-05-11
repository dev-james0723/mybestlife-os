/**
 * POST /api/brain/suggest-connections
 *
 * Body:
 *   {
 *     node_id: string;       // BrainNode id to find similar nodes for
 *     content?: string;      // optional override text (else we re-embed
 *                            // any text the caller provides)
 *     match_count?: number;  // default 8
 *     match_threshold?: number; // default 0.55
 *   }
 *
 * Uses the `match_brain_nodes` RPC to find the top-k semantically
 * similar nodes for a given Brain node, scoped by RLS. Returns each match
 * along with its similarity score (cosine).
 *
 * Note: this endpoint does NOT persist suggestions — the client decides
 * whether to upsert them into `brain_edges` after the user confirms.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { embedBrainNodeText } from "@/lib/brain/embeddings";

export const runtime = "nodejs";

type Body = {
  node_id?: unknown;
  content?: unknown;
  match_count?: unknown;
  match_threshold?: unknown;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: Body = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.node_id !== "string" || !body.node_id) {
    return NextResponse.json({ error: "missing_node_id" }, { status: 400 });
  }
  const nodeId = body.node_id;
  const matchCount =
    typeof body.match_count === "number" && body.match_count > 0
      ? Math.min(50, Math.floor(body.match_count))
      : 8;
  const matchThreshold =
    typeof body.match_threshold === "number" &&
    body.match_threshold > 0 &&
    body.match_threshold <= 1
      ? body.match_threshold
      : 0.55;

  // Resolve query embedding:
  //   - If `content` is provided, embed it as a query.
  //   - Else, look up the node's stored embedding (most recent row).
  let queryEmbedding: number[] | null = null;
  if (typeof body.content === "string" && body.content.trim().length > 0) {
    const apiKey = getGeminiServerApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "missing_gemini_api_key" },
        { status: 500 },
      );
    }
    queryEmbedding = await embedBrainNodeText({
      apiKey,
      text: body.content,
      taskType: "RETRIEVAL_QUERY",
    });
  } else {
    const { data, error } = await supabase
      .from("brain_node_embeddings")
      .select("embedding")
      .eq("node_id", nodeId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      return NextResponse.json(
        { error: error.message ?? "lookup_failed" },
        { status: 500 },
      );
    }
    if (!data?.embedding) {
      return NextResponse.json(
        { error: "no_embedding_for_node" },
        { status: 404 },
      );
    }
    queryEmbedding = data.embedding as unknown as number[];
  }

  // Run the RPC. Note: we pass `exclude_node_id` so the source itself is
  // excluded from the results.
  const { data: matches, error: rpcError } = await supabase.rpc(
    "match_brain_nodes",
    {
      query_embedding: queryEmbedding as unknown as string,
      match_count: matchCount,
      match_threshold: matchThreshold,
      exclude_node_id: nodeId,
    },
  );
  if (rpcError) {
    return NextResponse.json(
      { error: rpcError.message ?? "match_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ matches: matches ?? [] });
}
