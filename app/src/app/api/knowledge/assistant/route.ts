import { NextResponse } from "next/server";
import {
  getGeminiServerApiKey,
  fetchGeminiChatText,
  fetchGeminiPlannerJsonText,
} from "@/lib/ai/gemini-text";
import { getKnowledgeItems, getKnowledgeConnectionsForUser } from "@/lib/knowledge/queries";
import {
  buildKnowledgeAssistantContextPack,
  knowledgeAssistantSystemInstruction,
} from "@/lib/knowledge/knowledge-assistant-context";
import {
  requireKnowledgeUser,
  unauthorizedPayload,
} from "@/lib/knowledge/auth-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sanitizeRetrievalCitations } from "@/lib/retrieval/citations";
import {
  loadRetrievalRunEvidence,
  parseRetrievalMode,
  parseRetrieveRequestBody,
  runAskKbRetrieval,
} from "@/lib/retrieval/service";
import type { RetrievalCitation, RetrievalResult } from "@/lib/retrieval/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isChatMessage(v: unknown): v is ChatMessage {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.role === "user" || o.role === "assistant") &&
    typeof o.content === "string" &&
    o.content.length > 0 &&
    o.content.length <= 12000
  );
}

function toGeminiContents(messages: ChatMessage[], knowledgeBlock: string) {
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    throw new Error("invalid_messages");
  }

  const maxPairs = 8;
  let slice = messages;
  if (slice.length > maxPairs * 2 + 1) {
    slice = slice.slice(-(maxPairs * 2 + 1));
  }

  const head = slice.slice(0, -1);
  const last = slice[slice.length - 1];

  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of head) {
    if (m.role === "user") out.push({ role: "user", parts: [{ text: m.content }] });
    else out.push({ role: "model", parts: [{ text: m.content }] });
  }

  const lastUserText = `User question:\n${last.content}\n\n---\nKNOWLEDGE BASE DATA (authoritative; do not fabricate outside it):\n${knowledgeBlock}`;
  out.push({ role: "user", parts: [{ text: lastUserText }] });
  return out;
}

function formatConversation(messages: ChatMessage[]): string {
  const maxPairs = 8;
  const slice =
    messages.length > maxPairs * 2 + 1
      ? messages.slice(-(maxPairs * 2 + 1))
      : messages;
  return slice
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n\n");
}

function formatEvidenceBlock(results: RetrievalResult[]): string {
  if (results.length === 0) return "(no retrieved evidence)";
  return results
    .slice(0, 12)
    .map((result) => {
      const loc = [
        result.sourceDomain,
        result.pageNumber != null ? `page ${result.pageNumber}` : null,
        result.sectionPath ? `section ${result.sectionPath}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      return [
        `[${result.id}] ${result.title}`,
        `source_domain: ${result.sourceDomain}`,
        `source_id: ${result.sourceId}`,
        `retrieval_document_id: ${result.retrievalDocumentId ?? "deterministic"}`,
        loc ? `location: ${loc}` : null,
        result.sourceUrl ? `source_url: ${result.sourceUrl}` : null,
        `why_matched: ${result.whyMatched.join(" ")}`,
        `excerpt: ${result.snippet || result.bodyPreview}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

function parseAssistantJson(text: string): { answer: string; citations: unknown } | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.answer === "string") {
        return { answer: obj.answer, citations: obj.citations };
      }
    }
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1)) as unknown;
        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          if (typeof obj.answer === "string") {
            return { answer: obj.answer, citations: obj.citations };
          }
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function retrievalAssistantSystemInstruction(locale?: string): string {
  const lang = locale?.startsWith("zh")
    ? "Chinese when the user writes Chinese"
    : "the same language the user writes in";
  return `You are Ask Your KB, the cited Knowledge Base assistant inside MyLifeOS.

Rules:
- Answer in ${lang}.
- Use only the ASK YOUR KB RETRIEVED EVIDENCE in the user message.
- Cite only evidence IDs that appear in the evidence block, such as R1 or R2.
- If evidence is insufficient, say that clearly and suggest how to narrow the search or add sources.
- Do not invent titles, URLs, dates, page numbers, or source domains.
- Return strict JSON only: {"answer":"markdown string","citations":[{"resultId":"R1","quote":"short exact supporting phrase"}]}.`;
}

function noEvidenceReply(locale?: string) {
  if (locale?.startsWith("zh")) {
    return "我在 Ask Your KB 的可讀來源中找不到足夠證據回答這個問題。你可以縮小問題、選擇其他來源範圍，或先把相關資料加入 Knowledge Base。";
  }
  return "I could not find enough evidence in Ask Your KB to answer that. Try narrowing the question, changing the source scope, or adding the relevant source to your Knowledge Base.";
}

async function fallbackContextPackAnswer(params: {
  apiKey: string;
  userId: string;
  messages: ChatMessage[];
  latestUser: string;
  referenceDateIso: string;
  locale?: string;
  warnings: string[];
}) {
  const [items, connections] = await Promise.all([
    getKnowledgeItems(params.userId),
    getKnowledgeConnectionsForUser(params.userId),
  ]);
  const { systemKnowledgeBlock } = buildKnowledgeAssistantContextPack({
    items,
    connections,
    latestUserMessage: params.latestUser,
    referenceDateIso: params.referenceDateIso,
    locale: params.locale,
  });
  const contents = toGeminiContents(params.messages, systemKnowledgeBlock);
  const { text, modelUsed } = await fetchGeminiChatText({
    apiKey: params.apiKey,
    systemInstruction: knowledgeAssistantSystemInstruction(params.locale),
    contents,
    temperature: 0.42,
    maxOutputTokens: 8192,
  });
  return {
    reply: text,
    model: modelUsed,
    retrievalRunId: null,
    citations: [] as RetrievalCitation[],
    sources: [] as RetrievalResult[],
    warnings: [...params.warnings, "assistant_used_context_pack_fallback"],
  };
}

export async function POST(req: Request) {
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
  const locale = typeof o.locale === "string" ? o.locale.slice(0, 12) : undefined;
  const retrievalRunId =
    typeof o.retrievalRunId === "string" && o.retrievalRunId.length >= 8
      ? o.retrievalRunId
      : null;
  const referenceDateIso =
    typeof o.referenceDateIso === "string" && o.referenceDateIso.length >= 8
      ? o.referenceDateIso
      : new Date().toISOString();

  if (!Array.isArray(messagesRaw) || messagesRaw.length === 0 || messagesRaw.length > 48) {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  let messages = messagesRaw.filter(isChatMessage) as ChatMessage[];
  if (messages.length !== messagesRaw.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }
  while (messages.length > 0 && messages[0].role === "assistant") {
    messages = messages.slice(1);
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  const auth = await requireKnowledgeUser();
  if (!auth.ok) {
    return NextResponse.json(unauthorizedPayload(auth), { status: 401 });
  }
  const user = auth.user;
  const supabase = await createServerSupabaseClient();

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const latestUser = messages[messages.length - 1].content;

  try {
    const retrieveBody = parseRetrieveRequestBody({
      query: latestUser,
      mode: parseRetrievalMode(o.mode),
      limit: o.limit,
      sourceDomains: o.sourceDomains,
      sessionGrantedDomains: o.sessionGrantedDomains,
      referenceDateIso,
    });

    let retrievalResults: RetrievalResult[] = [];
    let retrievalWarnings: string[] = [];
    let effectiveRetrievalRunId: string | null = retrievalRunId;

    if (retrievalRunId) {
      const loaded = await loadRetrievalRunEvidence({
        supabase,
        userId: user.id,
        retrievalRunId,
        limit: retrieveBody.limit,
      });
      retrievalResults = loaded.results;
      retrievalWarnings = loaded.warnings;
    }

    if (retrievalResults.length === 0) {
      const run = await runAskKbRetrieval({
        supabase,
        userId: user.id,
        query: latestUser,
        mode: retrieveBody.mode,
        limit: retrieveBody.limit,
        sourceDomains: retrieveBody.sourceDomains,
        sessionGrantedDomains: retrieveBody.sessionGrantedDomains,
        referenceDateIso,
        persistRun: true,
      });
      retrievalResults = run.results;
      retrievalWarnings = [...retrievalWarnings, ...run.warnings];
      effectiveRetrievalRunId = run.id;
    }

    if (retrievalResults.length === 0) {
      const shouldFallback = retrievalWarnings.some((warning) =>
        warning.includes("semantic_retrieval_unavailable") ||
        warning.includes("retrieval_run_not_persisted"),
      );
      if (shouldFallback) {
        const fallback = await fallbackContextPackAnswer({
          apiKey,
          userId: user.id,
          messages,
          latestUser,
          referenceDateIso,
          locale,
          warnings: retrievalWarnings,
        });
        return NextResponse.json(fallback);
      }
      return NextResponse.json({
        reply: noEvidenceReply(locale),
        model: "none",
        retrievalRunId: effectiveRetrievalRunId,
        citations: [],
        sources: [],
        warnings: retrievalWarnings,
      });
    }

    const evidenceBlock = formatEvidenceBlock(retrievalResults);
    const userText = [
      `Conversation:\n${formatConversation(messages)}`,
      "",
      "ASK YOUR KB RETRIEVED EVIDENCE:",
      evidenceBlock,
      "",
      `Answer the latest user question: ${latestUser}`,
    ].join("\n");

    const { text, modelUsed } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: retrievalAssistantSystemInstruction(locale),
      userText,
    });

    const parsed = parseAssistantJson(text);
    const reply = parsed?.answer?.trim() || noEvidenceReply(locale);
    const citations = sanitizeRetrievalCitations(
      parsed?.citations ?? [],
      retrievalResults,
    );

    return NextResponse.json({
      reply,
      model: modelUsed,
      retrievalRunId: effectiveRetrievalRunId,
      citations,
      sources: retrievalResults.slice(0, 12),
      warnings: retrievalWarnings,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[knowledge-assistant]", msg);
    return NextResponse.json({ error: "gemini_failed", detail: msg.slice(0, 400) }, { status: 502 });
  }
}
