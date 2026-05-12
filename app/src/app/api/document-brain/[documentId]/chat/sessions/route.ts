import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_SESSIONS = 25;

export async function GET(_req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
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

  const { data: sessions, error: sErr } = await supabase
    .from("document_chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_SESSIONS);

  if (sErr || !sessions) {
    return NextResponse.json({ error: "sessions_load_failed" }, { status: 500 });
  }

  const summaries = await Promise.all(
    sessions.map(async (s) => {
      const sid = s.id as string;
      const [countRes, last] = await Promise.all([
        supabase
          .from("document_chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sid),
        supabase
          .from("document_chat_messages")
          .select("content, role, created_at")
          .eq("session_id", sid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const lastRow = last.data;
      const snippet =
        typeof lastRow?.content === "string"
          ? lastRow.content.replace(/\s+/g, " ").trim().slice(0, 140)
          : "";

      return {
        id: sid,
        title: (typeof s.title === "string" && s.title.trim()) || "Doc Oracle",
        created_at: s.created_at as string,
        updated_at: s.updated_at as string,
        message_count: countRes.count ?? 0,
        last_message: snippet,
      };
    }),
  );

  return NextResponse.json({ sessions: summaries });
}
