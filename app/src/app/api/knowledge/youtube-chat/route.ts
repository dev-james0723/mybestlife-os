import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiChatText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  requireKnowledgeUser,
  unauthorizedPayload,
} from "@/lib/knowledge/auth-guard";

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
    o.content.length <= 12_000
  );
}

function buildVideoKnowledgeBlock(row: Record<string, unknown>): string {
  const title = typeof row.title === "string" ? row.title : "";
  const summary = typeof row.ai_summary === "string" ? row.ai_summary.trim() : "";
  const overview =
    typeof row.ai_content_overview === "string" ? row.ai_content_overview.trim() : "";
  const insights = Array.isArray(row.ai_key_insights)
    ? (row.ai_key_insights as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const transcript =
    typeof row.youtube_transcript === "string" ? row.youtube_transcript.trim() : "";
  const url = typeof row.source_url === "string" ? row.source_url : "";

  const parts = [
    url ? `Video URL: ${url}` : "",
    title ? `Title: ${title}` : "",
    summary ? `AI summary:\n${summary}` : "",
    overview ? `AI overview:\n${overview}` : "",
    insights.length ? `Key insights:\n- ${insights.join("\n- ")}` : "",
    transcript
      ? `Transcript (authoritative when present; may be long):\n${transcript.slice(0, 140_000)}`
      : "Transcript: not available — rely on summary/overview only and say so if asked for exact quotes or timestamps.",
  ];
  return parts.filter(Boolean).join("\n\n");
}

function toGeminiContents(messages: ChatMessage[], videoBlock: string) {
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    throw new Error("invalid_messages");
  }
  const maxPairs = 10;
  let slice = messages;
  if (slice.length > maxPairs * 2 + 1) {
    slice = slice.slice(-(maxPairs * 2 + 1));
  }
  const head = slice.slice(0, -1);
  const last = slice[slice.length - 1]!;

  const out: { role: "user" | "model"; parts: { text: string }[] }[] = [];
  for (const m of head) {
    if (m.role === "user") out.push({ role: "user", parts: [{ text: m.content }] });
    else out.push({ role: "model", parts: [{ text: m.content }] });
  }

  const lastUserText = `User question:\n${last.content}\n\n---\nVIDEO KNOWLEDGE (only use this; do not invent facts beyond it):\n${videoBlock}`;
  out.push({ role: "user", parts: [{ text: lastUserText }] });
  return out;
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
  const itemId = typeof o.itemId === "string" ? o.itemId.trim() : "";
  const messagesRaw = o.messages;

  if (!itemId || !Array.isArray(messagesRaw) || messagesRaw.length === 0 || messagesRaw.length > 40) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
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
  const { data: row, error: rowErr } = await supabase
    .from("knowledge_items")
    .select(
      "id, user_id, title, source_url, ai_summary, ai_content_overview, ai_key_insights, youtube_transcript",
    )
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (rowErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const videoBlock = buildVideoKnowledgeBlock(row as Record<string, unknown>);
  const systemInstruction =
    "You are a helpful tutor answering questions about one YouTube video the user saved in their knowledge base. " +
    "Use only the provided VIDEO KNOWLEDGE block (summary, overview, insights, transcript). " +
    "If the answer is not contained there, say clearly that the saved materials do not cover it. " +
    "Be concise unless the user asks for detail. Match the user's language when possible.";

  let contents;
  try {
    contents = toGeminiContents(messages, videoBlock);
  } catch {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  try {
    const { text, modelUsed } = await fetchGeminiChatText({
      apiKey,
      systemInstruction,
      contents,
      temperature: 0.4,
      maxOutputTokens: 8192,
    });
    return NextResponse.json({ reply: text, model: modelUsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[youtube-chat]", msg);
    return NextResponse.json({ error: "gemini_failed", detail: msg.slice(0, 400) }, { status: 502 });
  }
}
