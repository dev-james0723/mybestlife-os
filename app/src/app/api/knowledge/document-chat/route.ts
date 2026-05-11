import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchGeminiChatText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { parseKnowledgeRawContent } from "@/lib/knowledge/code-content";
import {
  requireKnowledgeUser,
  unauthorizedPayload,
} from "@/lib/knowledge/auth-guard";

/**
 * Ask-the-Document endpoint.
 *
 * Grounds Gemini in the item's extracted content (raw_content, summary,
 * insights, action items). Unlike the generic `/api/knowledge/assistant`
 * endpoint, this one is scoped to a single item for faster, more focused
 * answers. `ask_enabled=false` items (social posts) are rejected server-side.
 */

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

function buildDocumentKnowledgeBlock(row: Record<string, unknown>): string {
  const title = typeof row.title === "string" ? row.title : "";
  const label = typeof row.label === "string" ? row.label : "";
  const sourceUrl = typeof row.source_url === "string" ? row.source_url : "";
  const summary = typeof row.ai_summary === "string" ? row.ai_summary.trim() : "";
  const tldr = typeof row.ai_tldr === "string" ? row.ai_tldr.trim() : "";
  const overview =
    typeof row.ai_content_overview === "string" ? row.ai_content_overview.trim() : "";
  const insights = Array.isArray(row.ai_key_insights)
    ? (row.ai_key_insights as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const actions = Array.isArray(row.ai_action_items)
    ? (row.ai_action_items as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const quotes = Array.isArray(row.ai_key_quotes)
    ? (row.ai_key_quotes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const raw = typeof row.raw_content === "string" ? row.raw_content : "";
  const parsed = parseKnowledgeRawContent(raw);
  const displayableBody =
    parsed.kind === "encoded-code" ? parsed.source : parsed.raw;
  const body = displayableBody?.trim() ?? "";

  const parts = [
    label ? `Source type: ${label}` : "",
    title ? `Title: ${title}` : "",
    sourceUrl ? `Source URL: ${sourceUrl}` : "",
    tldr ? `One-sentence summary:\n${tldr}` : "",
    summary ? `AI summary:\n${summary}` : "",
    overview ? `AI overview:\n${overview}` : "",
    insights.length ? `Key insights:\n- ${insights.join("\n- ")}` : "",
    actions.length ? `Action items:\n- ${actions.join("\n- ")}` : "",
    quotes.length ? `Key quotes:\n- ${quotes.map((q) => `"${q}"`).join("\n- ")}` : "",
    body
      ? `Extracted body (authoritative when present; may be long):\n${body.slice(0, 180_000)}`
      : "",
  ];
  return parts.filter(Boolean).join("\n\n");
}

function toGeminiContents(messages: ChatMessage[], knowledgeBlock: string) {
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

  const lastUserText = `User question:\n${last.content}\n\n---\nDOCUMENT KNOWLEDGE (only use this; do not invent facts beyond it):\n${knowledgeBlock}`;
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

  if (
    !itemId ||
    !Array.isArray(messagesRaw) ||
    messagesRaw.length === 0 ||
    messagesRaw.length > 40
  ) {
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
      "id, user_id, title, label, source_url, source_type, ai_tldr, ai_summary, ai_content_overview, ai_key_insights, ai_key_quotes, ai_action_items, ai_questions_answered, raw_content, ask_enabled",
    )
    .eq("id", itemId)
    .eq("user_id", user.id)
    .single();

  if (rowErr || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Respect per-item ask_enabled. Social posts and other non-askable items
  // must not expose this endpoint even if the URL is guessed.
  if (row.ask_enabled === false) {
    return NextResponse.json({ error: "ask_disabled" }, { status: 403 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const knowledgeBlock = buildDocumentKnowledgeBlock(row as Record<string, unknown>);

  const systemInstruction =
    "You are a helpful research assistant answering questions about one knowledge item the user saved. " +
    "Use only the DOCUMENT KNOWLEDGE block (title, summary, overview, insights, actions, quotes, extracted body). " +
    "If the answer is not contained there, clearly say so and suggest where else the user might look. " +
    "Be concise unless the user asks for depth. Match the user's language.";

  let contents;
  try {
    contents = toGeminiContents(messages, knowledgeBlock);
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
    console.error("[document-chat]", msg);
    return NextResponse.json({ error: "gemini_failed", detail: msg.slice(0, 400) }, { status: 502 });
  }
}
