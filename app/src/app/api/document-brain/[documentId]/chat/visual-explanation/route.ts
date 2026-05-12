import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  generateDocOracleVisualExplanation,
  getDocOracleImageModel,
  getDocOracleImageModelFallback,
  type RelatedVisualForImage,
} from "@/lib/ai/gemini-image";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";

export const runtime = "nodejs";
export const maxDuration = 120;

type CitationIn = { chunk_id?: string; page?: number | null; section?: string | null; excerpt?: string | null };
type VisualIn = {
  id?: string;
  title?: string;
  type?: string | null;
  page?: number | null;
  description?: string | null;
  semantic_category?: string | null;
};

function detectLanguageHint(question: string, answer: string): string {
  const q = question.trim();
  if (!q) return "en";
  let cjk = 0;
  let latin = 0;
  for (const ch of q) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x3400 && code <= 0x9fff) cjk += 1;
    else if (/[a-zA-Z]/.test(ch)) latin += 1;
  }
  if (cjk > 0 && latin === 0) return "zh-Hant";
  if (cjk > 0 && latin > 0) {
    return cjk >= latin ? "zh-Hant" : "en";
  }
  if (latin > 0) return "en";
  const a = answer.trim();
  for (const ch of a.slice(0, 400)) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x3400 && code <= 0x9fff) return "zh-Hant";
  }
  return "en";
}

function mapVisuals(raw: VisualIn[]): RelatedVisualForImage[] {
  const out: RelatedVisualForImage[] = [];
  for (const v of raw) {
    if (!v || typeof v.id !== "string" || !v.id) continue;
    out.push({
      id: v.id,
      title: typeof v.title === "string" ? v.title : "Visual",
      type: v.type ?? null,
      page: typeof v.page === "number" && Number.isFinite(v.page) ? v.page : null,
      description: v.description ?? null,
      semantic_category: v.semantic_category ?? null,
    });
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "image_generation_not_configured" }, { status: 503 });
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
  const sessionId = typeof o.sessionId === "string" && o.sessionId.trim() ? o.sessionId.trim() : null;
  const answer = typeof o.answer === "string" ? o.answer.trim() : "";
  const question = typeof o.question === "string" ? o.question.trim() : "";
  const citations = Array.isArray(o.citations) ? (o.citations as CitationIn[]) : [];
  const related_pages = Array.isArray(o.related_pages)
    ? (o.related_pages as unknown[]).filter((x): x is number => typeof x === "number" && Number.isFinite(x))
    : [];
  const related_visuals = Array.isArray(o.related_visuals) ? mapVisuals(o.related_visuals as VisualIn[]) : [];

  if (!sessionId) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }
  if (!answer || !question) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
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
    .select("id, user_id, ask_enabled")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (item.ask_enabled === false) {
    return NextResponse.json({ error: "ask_disabled" }, { status: 403 });
  }

  const { data: sess } = await supabase
    .from("document_chat_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("document_id", documentId)
    .maybeSingle();
  if (!sess) {
    return NextResponse.json({ error: "invalid_session" }, { status: 400 });
  }

  const languageHint = detectLanguageHint(question, answer);
  const primaryModel = getDocOracleImageModel();
  const fallbackModel = getDocOracleImageModelFallback();

  let imageBytes: Buffer;
  let mimeType: string;
  let promptUsed: string;
  let modelUsed = primaryModel;

  try {
    const first = await generateDocOracleVisualExplanation({
      apiKey,
      model: primaryModel,
      question,
      answer,
      citations,
      relatedPages: related_pages,
      relatedVisuals: related_visuals,
      languageHint,
    });
    imageBytes = first.imageBytes;
    mimeType = first.mimeType;
    promptUsed = first.promptUsed;
  } catch (e1) {
    if (!fallbackModel || fallbackModel === primaryModel) {
      const msg = e1 instanceof Error ? e1.message : String(e1);
      console.error("[doc-oracle/visual-explanation]", msg);
      return NextResponse.json(
        { error: "image_generation_failed", detail: msg.slice(0, 400) },
        { status: 502 },
      );
    }
    try {
      const second = await generateDocOracleVisualExplanation({
        apiKey,
        model: fallbackModel,
        question,
        answer,
        citations,
        relatedPages: related_pages,
        relatedVisuals: related_visuals,
        languageHint,
      });
      imageBytes = second.imageBytes;
      mimeType = second.mimeType;
      promptUsed = second.promptUsed;
      modelUsed = fallbackModel;
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      console.error("[doc-oracle/visual-explanation] fallback", msg);
      return NextResponse.json(
        { error: "image_generation_failed", detail: msg.slice(0, 400) },
        { status: 502 },
      );
    }
  }

  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const objectId = randomUUID();
  const storagePath = `${user.id}/documents/${documentId}/chat-visual-explanations/${objectId}.${ext}`;

  const { error: upErr } = await supabase.storage.from("knowledge-files").upload(storagePath, imageBytes, {
    contentType: mimeType || "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error("[doc-oracle/visual-explanation] storage", upErr.message);
    return NextResponse.json(
      { error: "image_generation_failed", detail: "storage_upload_failed" },
      { status: 502 },
    );
  }

  const image_url = knowledgeFilesProxyUrlFromStoragePath(storagePath);

  return NextResponse.json({
    image_url,
    prompt_used: promptUsed,
    model: modelUsed,
  });
}
