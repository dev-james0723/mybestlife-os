import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  getDocOracleFixtureChatAnswer,
  isDocOracleFixtureEnabled,
  isDocOracleFixtureId,
} from "@/lib/document-oracle/docOracleFixture";

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

type ChunkRow = {
  id: string;
  chunk_text: string;
  keywords: unknown;
  page_number: unknown;
  section_path: unknown;
  has_visual?: unknown;
  related_visual_asset_ids?: unknown;
};

type PageRow = {
  page_number: unknown;
  page_summary: unknown;
  keywords: unknown;
  has_visual_assets: unknown;
};

type SectionRow = {
  id: string;
  title: string;
  page_start: number | null;
  page_end: number | null;
  summary: string | null;
  keywords: unknown;
};

type VisualRow = {
  id: string;
  title: string | null;
  type: string | null;
  source_page_number: number | null;
  image_path: string | null;
  description: string | null;
  semantic_category: string | null;
  retrieval_tags: unknown;
  related_terms: unknown;
  extracted_labels: unknown;
};

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function tokenizeQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s,，。.!/?；;:()[\]{}'"`]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

function wantsVisualContext(q: string): boolean {
  return /mic(rophone)?|diagram|table|chart|photo|image|visual|figure|sketch|graph|plot|illustration|drawing|schema/i.test(
    q,
  );
}

function sectionHintPages(sections: SectionRow[], words: string[]): Set<number> {
  const pages = new Set<number>();
  for (const s of sections) {
    const titleLow = s.title.toLowerCase();
    const sumLow = (s.summary || "").toLowerCase();
    if (words.some((w) => w.length > 2 && (titleLow.includes(w) || sumLow.includes(w)))) {
      const a = s.page_start;
      const b = s.page_end ?? s.page_start;
      if (a != null && b != null && a <= b) {
        for (let p = a; p <= Math.min(b, a + 80); p++) pages.add(p);
      } else if (a != null) pages.add(a);
    }
  }
  return pages;
}

function scoreChunkRow(
  words: string[],
  qLower: string,
  row: ChunkRow,
  focus: RetrievalFocus | null,
  visualBoost: boolean,
  hintPages: Set<number>,
): number {
  const t = (row.chunk_text || "").toLowerCase();
  const secPath = typeof row.section_path === "string" ? row.section_path.toLowerCase() : "";
  const kw = strArr(row.keywords).map((k) => k.toLowerCase());
  let s = 0;
  for (const w of words) {
    if (t.includes(w)) s += 2;
    if (kw.some((k) => k.includes(w) || w.includes(k))) s += 4;
    if (secPath.includes(w)) s += 3;
  }
  if (qLower.length > 5 && t.includes(qLower)) s += 8;

  const page = typeof row.page_number === "number" && Number.isFinite(row.page_number) ? row.page_number : null;
  if (page != null && hintPages.has(page)) s += 8;

  if (focus) {
    const ps = focus.pageStart;
    const pe = focus.pageEnd;
    if (page != null && ps != null && pe != null && ps <= pe && page >= ps && page <= pe) {
      s += 14;
    } else if (page != null && ps != null && pe == null && page === ps) {
      s += 10;
    } else if (page != null && ps != null && pe == null && page >= ps) {
      s += 6;
    }
    const secFocus = focus.sectionTitle?.toLowerCase() || "";
    if (secFocus && secPath.includes(secFocus)) s += 12;
  }

  const hasVis = row.has_visual === true;
  const relVis = Array.isArray(row.related_visual_asset_ids) && row.related_visual_asset_ids.length > 0;
  if (visualBoost && (hasVis || relVis)) s += 6;

  return s;
}

function visualMatchBlob(v: VisualRow): string {
  return [
    v.title,
    v.description,
    v.type,
    v.semantic_category,
    JSON.stringify(v.retrieval_tags),
    JSON.stringify(v.related_terms),
    JSON.stringify(v.extracted_labels),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreVisualAgainstQuery(v: VisualRow, words: string[]): number {
  const b = visualMatchBlob(v);
  let s = 0;
  for (const w of words) {
    if (w.length > 1 && b.includes(w)) s += 2;
  }
  return s;
}

function visualsTitlesForPage(visuals: VisualRow[], page: number): string[] {
  const out: string[] = [];
  for (const v of visuals) {
    if (v.source_page_number === page && v.title?.trim()) {
      out.push(v.title.trim());
    }
  }
  return out.slice(0, 8);
}

type Citation = { chunk_id: string; page: number | null; section: string | null; excerpt: string };

type RelatedVisualOut = {
  id: string;
  title: string;
  type: string;
  page: number | null;
  image_path: string | null;
  description: string | null;
  semantic_category: string | null;
  retrieval_tags?: unknown;
  related_terms?: unknown;
};

function mapVisualOut(v: VisualRow): RelatedVisualOut {
  return {
    id: v.id,
    title: v.title?.trim() || "Visual",
    type: v.type?.trim() || "",
    page: v.source_page_number,
    image_path: v.image_path,
    description: v.description,
    semantic_category: v.semantic_category,
    retrieval_tags: v.retrieval_tags,
    related_terms: v.related_terms,
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
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

  if (isDocOracleFixtureEnabled() && isDocOracleFixtureId(documentId)) {
    return NextResponse.json(getDocOracleFixtureChatAnswer(turns[turns.length - 1]!.content));
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

  const [chunksRes, pagesRes, sectionsRes, visualsRes] = await Promise.all([
    supabase
      .from("document_chunks")
      .select("id, chunk_text, keywords, page_number, section_path, has_visual, related_visual_asset_ids")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(4000),
    supabase
      .from("document_pages")
      .select("page_number, page_summary, keywords, has_visual_assets")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(500),
    supabase
      .from("document_sections")
      .select("id, title, page_start, page_end, summary, keywords")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(400),
    supabase
      .from("document_visual_assets")
      .select(
        "id, title, type, source_page_number, image_path, description, semantic_category, retrieval_tags, related_terms, extracted_labels",
      )
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .limit(400),
  ]);

  if (chunksRes.error || !chunksRes.data?.length) {
    return NextResponse.json({ error: "no_chunks" }, { status: 409 });
  }

  const chunkRows = chunksRes.data as ChunkRow[];
  const pageRows = (pagesRes.data ?? []) as PageRow[];
  const sectionRows = (sectionsRes.data ?? []) as SectionRow[];
  const visualRows = (visualsRes.data ?? []) as VisualRow[];

  const lastUser = turns[turns.length - 1]!.content;
  const words = tokenizeQuery(lastUser);
  const qLower = lastUser.toLowerCase().trim();
  const visualBoost = wantsVisualContext(lastUser);
  const hintPages = sectionHintPages(sectionRows, words);

  const scores = chunkRows.map((row) =>
    scoreChunkRow(words, qLower, row, retrievalFocus, visualBoost, hintPages),
  );
  const scoresNeutral = chunkRows.map((row) => scoreChunkRow(words, qLower, row, null, visualBoost, hintPages));
  const maxFocus = Math.max(0, ...scores);
  const ranked = chunkRows
    .map((row, i) => ({ row, s: scores[i] ?? 0 }))
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
    const text = (r.chunk_text as string).slice(0, 3200);
    const page = typeof r.page_number === "number" && Number.isFinite(r.page_number) ? r.page_number : null;
    const sec = typeof r.section_path === "string" ? r.section_path : null;
    const kws = strArr(r.keywords).slice(0, 18).join(", ");
    const near = page != null ? visualsTitlesForPage(visualRows, page).join("; ") : "";
    return (
      `[CHUNK ${idx + 1} id=${id} page=${page ?? "unknown"} section=${sec ?? "n/a"}]\n` +
      `keywords: ${kws || "n/a"}\n` +
      (near ? `nearby_visual_titles_on_same_page: ${near}\n` : "") +
      `${text}`
    );
  });

  const pageContextLines = pageRows
    .filter((p) => {
      const pn = typeof p.page_number === "number" ? p.page_number : null;
      if (pn == null) return false;
      return ranked.slice(0, 8).some((c) => (c.page_number as number | null) === pn);
    })
    .slice(0, 10)
    .map((p) => {
      const pn = p.page_number as number;
      const sum = typeof p.page_summary === "string" ? p.page_summary.slice(0, 400) : "";
      const k = strArr(p.keywords).slice(0, 10).join(", ");
      const hv = p.has_visual_assets ? "yes" : "no";
      return `[PAGE ${pn} has_visuals=${hv} keywords=${k || "n/a"}]\n${sum}`;
    });

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const systemInstruction =
    "You are Doc Oracle, a document-grounded assistant.\n" +
    "Answer ONLY using the retrieved document context (CHUNK blocks and PAGE notes). " +
    "Each chunk is labeled with id, page, section path, keywords, and optional nearby visual titles from the same page. " +
    "If the document does not contain enough information, say so clearly.\n" +
    "Use the same language as the user unless the user explicitly requests another language.\n" +
    "Format the answer in polished Markdown:\n" +
    "- Start with a short direct answer.\n" +
    "- Use clear headings (##) and bullet lists.\n" +
    "- Use a Markdown table when comparing options or listing structured items.\n" +
    "- Add a short section titled \"Why this is supported by the document\" when you cite evidence.\n" +
    "- Add \"Practical recommendation\" only when it is directly implied by the document.\n" +
    "- Cite page numbers inline using [p.X] where X matches the chunk/page labels.\n" +
    "- Do not invent facts. Do not rely on outside knowledge unless the user explicitly asks; if you must add general knowledge not stated in the document, label it clearly as: \"General note (not stated in this document): …\".\n" +
    "Default: stay document-grounded only.\n" +
    "Return strict JSON with keys: answer (markdown string), citations (array of {chunk_id, page, section, excerpt}).\n" +
    "Use at least one citation when stating facts from the document. excerpt must be a short verbatim substring from the cited chunk text.";

  const history = turns.slice(0, -1).slice(-8);
  const histText = history
    .map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.content}`)
    .join("\n\n");

  const focusPreamble =
    retrievalFocus &&
    (retrievalFocus.sectionTitle || retrievalFocus.pageStart != null || retrievalFocus.pageEnd != null)
      ? `Retrieval priority: prefer evidence from section "${retrievalFocus.sectionTitle ?? ""}" and pages ${
          retrievalFocus.pageStart ?? "?"
        }–${retrievalFocus.pageEnd ?? "?"}. Still answer ONLY from CONTEXT below.\n\n`
      : "";

  const userText = [
    histText ? `Prior turns:\n${histText}\n\n` : "",
    focusPreamble,
    `User question:\n${lastUser}\n\n`,
    "CONTEXT (document chunks):\n",
    contextBlocks.join("\n\n---\n\n"),
    pageContextLines.length ? `\n\n---\n\nPAGE NOTES (supporting retrieved pages):\n${pageContextLines.join("\n\n---\n\n")}` : "",
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
  const rawCitations = Array.isArray(parsed.citations) ? parsed.citations : [];
  const citations: Citation[] = rawCitations
    .map((c) => ({
      chunk_id: typeof c.chunk_id === "string" ? c.chunk_id : "",
      page: typeof c.page === "number" && Number.isFinite(c.page) ? c.page : null,
      section: typeof c.section === "string" ? c.section : null,
      excerpt: typeof c.excerpt === "string" ? c.excerpt : "",
    }))
    .filter((c) => c.chunk_id.length > 0);

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

  const citedPageNums = Array.from(
    new Set(
      citations
        .map((c) => c.page)
        .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0)
        .map((p) => Math.floor(p)),
    ),
  ).sort((a, b) => a - b);

  const retrievedPages = contextRows
    .map((c) => (typeof c.page_number === "number" && Number.isFinite(c.page_number) ? (c.page_number as number) : null))
    .filter((p): p is number => p != null);

  const visualScores = visualRows.map((v) => ({ v, s: scoreVisualAgainstQuery(v, words) }));
  const topVisualPages = visualScores
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map((x) => x.v.source_page_number)
    .filter((p): p is number => typeof p === "number" && Number.isFinite(p));

  const visualPagesFromCitations = visualRows
    .filter((v) => v.source_page_number != null && citedPageNums.includes(v.source_page_number))
    .map((v) => v.source_page_number as number);

  const relatedPages = Array.from(
    new Set([...citedPageNums, ...retrievedPages.slice(0, 10), ...topVisualPages, ...visualPagesFromCitations]),
  )
    .filter((p) => p > 0)
    .sort((a, b) => a - b)
    .slice(0, 24);

  const byId = new Map(visualRows.map((v) => [v.id, v]));
  const relatedVisualsOrdered: RelatedVisualOut[] = [];

  const pushVisual = (id: string) => {
    const v = byId.get(id);
    if (!v || !v.image_path) return;
    if (relatedVisualsOrdered.some((x) => x.id === id)) return;
    relatedVisualsOrdered.push(mapVisualOut(v));
  };

  for (const p of citedPageNums) {
    for (const v of visualRows) {
      if (v.source_page_number === p && v.image_path) pushVisual(v.id);
    }
  }

  for (const { v, s } of visualScores.sort((a, b) => b.s - a.s)) {
    if (v.image_path && s > 0) pushVisual(v.id);
  }

  if (visualBoost) {
    for (const c of contextRows.slice(0, 6)) {
      const pn = typeof c.page_number === "number" ? c.page_number : null;
      if (pn == null) continue;
      for (const v of visualRows) {
        if (v.source_page_number === pn && v.image_path) pushVisual(v.id);
      }
    }
  }

  const relatedVisuals = relatedVisualsOrdered.slice(0, 14);

  const relatedVisualsDb = relatedVisuals.map((x) => ({
    id: x.id,
    title: x.title,
    type: x.type,
    page: x.page,
    image_path: x.image_path,
    description: x.description,
    semantic_category: x.semantic_category,
  }));

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
    related_visuals: relatedVisualsDb,
  });

  await supabase
    .from("document_chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return NextResponse.json({
    answer: answer || "I could not find an answer in the provided context.",
    citations,
    related_pages: relatedPages,
    related_visuals: relatedVisuals,
    sessionId,
    model: modelUsed,
  });
}
