import { NextResponse } from "next/server";
import { getGeminiServerApiKey, fetchGeminiChatText } from "@/lib/ai/gemini-text";
import { getKnowledgeItems, getKnowledgeConnectionsForUser } from "@/lib/knowledge/queries";
import {
  buildKnowledgeAssistantContextPack,
  knowledgeAssistantSystemInstruction,
} from "@/lib/knowledge/knowledge-assistant-context";
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

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const [items, connections] = await Promise.all([
    getKnowledgeItems(user.id),
    getKnowledgeConnectionsForUser(user.id),
  ]);

  const latestUser = messages[messages.length - 1].content;
  const { systemKnowledgeBlock } = buildKnowledgeAssistantContextPack({
    items,
    connections,
    latestUserMessage: latestUser,
    referenceDateIso,
    locale,
  });

  const systemInstruction = knowledgeAssistantSystemInstruction(locale);

  let contents;
  try {
    contents = toGeminiContents(messages, systemKnowledgeBlock);
  } catch {
    return NextResponse.json({ error: "invalid_messages" }, { status: 400 });
  }

  try {
    const { text, modelUsed } = await fetchGeminiChatText({
      apiKey,
      systemInstruction,
      contents,
      temperature: 0.42,
      maxOutputTokens: 8192,
    });
    return NextResponse.json({ reply: text, model: modelUsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[knowledge-assistant]", msg);
    return NextResponse.json({ error: "gemini_failed", detail: msg.slice(0, 400) }, { status: 502 });
  }
}
