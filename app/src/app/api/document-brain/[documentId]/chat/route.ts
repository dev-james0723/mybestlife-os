import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatTurn = { role: "user" | "assistant"; content: string };

function isChatTurn(v: unknown): v is ChatTurn {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.role === "user" || o.role === "assistant") &&
    typeof o.content === "string" &&
    o.content.length > 0 &&
    o.content.length <= 12_000
  );
}

type RetrievalFocus = {
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
};

function parseRetrievalFocus(body: Record<string, unknown>): RetrievalFocus | null {
  const rf = body.retrievalFocus;
  if (!rf || typeof rf !== "object") return null;
  const o = rf as Record<string, unknown>;
  const pageStart = typeof o.pageStart === "number" && Number.isFinite(o.pageStart) ? o.pageStart : null;
  const pageEnd = typeof o.pageEnd === "number" && Number.isFinite(o.pageEnd) ? o.pageEnd : null;
  const sectionTitle =
    typeof o.sectionTitle === "string" && o.sectionTitle.trim() ? o.sectionTitle.trim().slice(0, 400) : null;
  if (pageStart == null && pageEnd == null && !sectionTitle) return null;
  return { pageStart, pageEnd, sectionTitle };
}

function scoreChunks(
  query: string,
  rows: { chunk_text: string; keywords: unknown; page_number: unknown; section_path: unknown }[],
  focus: RetrievalFocus | null,
): number[] {
  const words = query
    .toLowerCase()
    .split(/[\s,，。.!/?；;:]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  return rows.map((r) => {
    const t = (r.chunk_text || "").toLowerCase();
    const kw = Array.isArray(r.keywords) ? (r.keywords as string[]).map((k) => k.toLowerCase()) : [];
    let s = 0;
    for (const w of words) {
      if (t.includes(w)) s += 2;
      if (kw.some((k) => k.includes(w))) s += 4;
    }
    if (focus) {
      const page = typeof r.page_number === "number" && Number.isFinite(r.page_number) ? r.page_number : null;
      const sec = typeof r.section_path === "string" ? r.section_path : "";
      const ps = focus.pageStart;
      const pe = focus.pageEnd;
      if (page != null && ps != null && pe != null && ps <= pe && page >= ps && page <= pe) {
        s += 14;
      } else if (page != null && ps != null && pe == null && page === ps) {
        s += 10;
      } else if (page != null && ps != null && pe == null && page >= ps) {
        s += 6;
      }
      if (focus.sectionTitle && sec.includes(focus.sectionTitle)) {
        s += 10;
      }
    }
    return s;
  });
}

type Citation = { chunk_id: string; page: number | null; section: string | null; excerpt: string };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const messagesRaw = o.messages;
  const sessionIdIn = typeof o.sessionId === "string" && o.sessionId.trim() ? o.sessionId.trim() : null;
  const retrievalFocus = parseRetrievalFocus(o);

  if (!Array.isArray(messagesRaw) || messagesRaw.length === 0) {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }
  const turns = messagesRaw.filter(isChatTurn);
  if (turns.length === 0 || turns[turns.length - 1]!.role !== "user") {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: item, error: itemErr } = await supabase
    .from("knowledge_items")
    .select("id, user_id, title, ask_enabled")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (item.ask_enabled === false) {
    return NextResponse.json({ error: "ask_disabled" }, { status: 403 });
  }

  const { data: analysis } = await supabase
    .from("document_analyses")
    .select("id, document_title, status")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!analysis || analysis.status !== "completed") {
    return NextResponse.json({ error: "analysis_not_ready" }, { status: 409 });
  }

  const analysisId = analysis.id as string;

  const { data: chunkRows, error: chErr } = await supabase
    .from("document_chunks")
    .select("id, chunk_text, keywords, page_number, section_path")
    .eq("analysis_id", analysisId)
    .eq("user_id", user.id)
    .limit(4000);
  if (chErr || !chunkRows?.length) {
    return NextResponse.json({ error: "no_chunks" }, { status: 409 });
  }

  const lastUser = turns[turns.length - 1]!.content;
  const typedRows = chunkRows as {
    chunk_text: string;
    keywords: unknown;
    page_number: unknown;
    section_path: unknown;
  }[];
  const scores = scoreChunks(lastUser, typedRows, retrievalFocus);
  const scoresNeutral = scoreChunks(lastUser, typedRows, null);
  const maxFocus = Math.max(0, ...scores);
  const ranked = chunkRows
    .map((row, i) => ({ row, i, s: scores[i] ?? 0 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 14)
    .map((x) => x.row);

  const rankedNeutral = chunkRows
    .map((row, i) => ({ row, s: scoresNeutral[i] ?? 0 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 14)
    .map((x) => x.row);

  const contextRows = retrievalFocus && maxFocus === 0 ? rankedNeutral : ranked;

  const contextBlocks = contextRows.map((r, idx) => {
    const id = r.id as string;
    const text = (r.chunk_text as string).slice(0, 3500);
    const page = typeof r.page_number === "number" ? r.page_number : null;
    const sec = typeof r.section_path === "string" ? r.section_path : null;
    return `[CHUNK ${idx + 1} id=${id} page=${page ?? "unknown"} section=${sec ?? "n/a"}]\n${text}`;
  });

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const systemInstruction =
    "You are Doc Oracle, a document-grounded assistant. Answer ONLY using the CONTEXT chunks provided. " +
    "Each chunk is labeled with id, page, and section path. If the answer is not supported by the context, say the document does not contain enough information. " +
    "Respond as strict JSON with keys: answer (markdown string), citations (array of {chunk_id, page, section, excerpt}). " +
    "Use at least one citation when you state a fact from the document. excerpt must be a short verbatim substring from the cited chunk.";

  const history = turns.slice(0, -1).slice(-8);
  const histText = history
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n\n");

  const focusPreamble =
    retrievalFocus &&
    (retrievalFocus.sectionTitle ||
      retrievalFocus.pageStart != null ||
      retrievalFocus.pageEnd != null)
      ? `Retrieval priority: prefer evidence from section "${retrievalFocus.sectionTitle ?? ""}" and pages ${
          retrievalFocus.pageStart ?? "?"
        }–${retrievalFocus.pageEnd ?? "?"}. Still answer ONLY from CONTEXT below.\n\n`
      : "";

  const userText = [
    histText ? `Prior turns:\n${histText}\n\n` : "",
    focusPreamble,
    `User question:\n${lastUser}\n\n`,
    "CONTEXT:\n",
    contextBlocks.join("\n\n---\n\n"),
    '\n\nReturn JSON: {"answer":"...","citations":[{"chunk_id":"uuid","page":1,"section":"...","excerpt":"..."}]}',
  ].join("");

  let rawJson: string;
  let modelUsed: string;
  try {
    const out = await fetchGeminiPlannerJsonText({ apiKey, systemInstruction, userText });
    rawJson = out.text;
    modelUsed = out.modelUsed;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[doc-oracle/chat]", msg);
    return NextResponse.json({ error: "gemini_failed", detail: msg.slice(0, 400) }, { status: 502 });
  }

  let txt = rawJson.trim();
  if (txt.startsWith("```")) {
    txt = txt.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  let parsed: { answer?: string; citations?: Citation[] };
  try {
    parsed = JSON.parse(txt) as { answer?: string; citations?: Citation[] };
  } catch {
    return NextResponse.json({ error: "invalid_model_json" }, { status: 502 });
  }
  const answer = typeof parsed.answer === "string" ? parsed.answer : "";
  const citations = Array.isArray(parsed.citations) ? parsed.citations : [];

  let sessionId = sessionIdIn;
  if (!sessionId) {
    const { data: sess, error: sErr } = await supabase
      .from("document_chat_sessions")
      .insert({
        user_id: user.id,
        document_id: documentId,
        title: "Doc Oracle",
      })
      .select("id")
      .single();
    if (sErr || !sess) {
      return NextResponse.json({ error: "session_create_failed" }, { status: 500 });
    }
    sessionId = sess.id as string;
  } else {
    const { data: existing } = await supabase
      .from("document_chat_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .eq("document_id", documentId)
      .maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: "invalid_session" }, { status: 400 });
    }
  }

  const relatedPages = Array.from(
    new Set(
      citations
        .map((c) => c.page)
        .filter((p): p is number => typeof p === "number" && Number.isFinite(p)),
    ),
  ).slice(0, 12);

  let relatedVisuals: { id: string; title: string; type: string; page: number | null }[] = [];
  if (relatedPages.length > 0) {
    const { data: visuals } = await supabase
      .from("document_visual_assets")
      .select("id, title, type, source_page_number")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .in("source_page_number", relatedPages)
      .limit(12);
    relatedVisuals =
      visuals?.map((v) => ({
        id: v.id as string,
        title: (v.title as string) || "",
        type: (v.type as string) || "",
        page: (v.source_page_number as number) ?? null,
      })) ?? [];
  }

  await supabase.from("document_chat_messages").insert({
    user_id: user.id,
    document_id: documentId,
    session_id: sessionId,
    role: "user",
    content: lastUser,
    citations: [],
    related_pages: [],
    related_visuals: [],
  });

  await supabase.from("document_chat_messages").insert({
    user_id: user.id,
    document_id: documentId,
    session_id: sessionId,
    role: "assistant",
    content: answer || "I could not find an answer in the provided context.",
    citations,
    related_pages: relatedPages,
    related_visuals: relatedVisuals,
  });

  return NextResponse.json({
    answer: answer || "I could not find an answer in the provided context.",
    citations,
    related_pages: relatedPages,
    related_visuals: relatedVisuals,
    sessionId,
    model: modelUsed,
  });
}
