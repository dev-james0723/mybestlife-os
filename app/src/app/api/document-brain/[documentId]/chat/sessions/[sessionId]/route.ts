import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MESSAGE_PAGE = 50;

type DbMessage = {
  id: string;
  role: string;
  content: string;
  citations: unknown;
  related_pages: unknown;
  related_visuals: unknown;
  created_at: string;
};

function parseCitations(raw: unknown): Array<{
  chunk_id?: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
}> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is Record<string, unknown> => x != null && typeof x === "object") as Array<{
    chunk_id?: string;
    page?: number | null;
    section?: string | null;
    excerpt?: string | null;
  }>;
}

function parsePages(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
}

function parseVisuals(raw: unknown): Array<{
  id: string;
  title: string;
  type?: string | null;
  page?: number | null;
  image_path?: string | null;
  description?: string | null;
  semantic_category?: string | null;
}> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{
    id: string;
    title: string;
    type?: string | null;
    page?: number | null;
    image_path?: string | null;
    description?: string | null;
    semantic_category?: string | null;
  }> = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : null;
    if (!id) continue;
    const pageRaw = o.page ?? o.source_page_number;
    const page = typeof pageRaw === "number" && Number.isFinite(pageRaw) ? pageRaw : null;
    out.push({
      id,
      title: typeof o.title === "string" ? o.title : "Visual",
      type: typeof o.type === "string" ? o.type : null,
      page,
      image_path: typeof o.image_path === "string" ? o.image_path : null,
      description: typeof o.description === "string" ? o.description : null,
      semantic_category: typeof o.semantic_category === "string" ? o.semantic_category : null,
    });
  }
  return out;
}

export async function GET(_req: Request, ctx: { params: Promise<{ documentId: string; sessionId: string }> }) {
  const { documentId, sessionId } = await ctx.params;
  if (!documentId || !sessionId) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
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
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (itemErr || !item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: session, error: sessErr } = await supabase
    .from("document_chat_sessions")
    .select("id, title, created_at, updated_at, document_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("document_id", documentId)
    .maybeSingle();

  if (sessErr || !session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { count: total } = await supabase
    .from("document_chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const { data: tailRows, error: mErr } = await supabase
    .from("document_chat_messages")
    .select("id, role, content, citations, related_pages, related_visuals, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE);

  if (mErr || !tailRows) {
    return NextResponse.json({ error: "messages_load_failed" }, { status: 500 });
  }

  const chronological = [...tailRows]
    .reverse()
    .filter((r): r is DbMessage => r.role === "user" || r.role === "assistant");

  const messages = chronological.map((row, idx, arr) => {
    let userQuestion: string | null = null;
    if (row.role === "assistant") {
      const prev = arr[idx - 1];
      if (prev && prev.role === "user" && typeof prev.content === "string") {
        userQuestion = prev.content;
      }
    }
    return {
      id: row.id,
      role: row.role as "user" | "assistant",
      content: row.content,
      citations: parseCitations(row.citations),
      related_pages: parsePages(row.related_pages),
      related_visuals: parseVisuals(row.related_visuals),
      created_at: row.created_at,
      userQuestion: row.role === "assistant" ? userQuestion : undefined,
    };
  });

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      created_at: session.created_at,
      updated_at: session.updated_at,
      document_id: session.document_id,
    },
    messages,
    message_total: total ?? messages.length,
    message_truncated: (total ?? 0) > MESSAGE_PAGE,
  });
}
