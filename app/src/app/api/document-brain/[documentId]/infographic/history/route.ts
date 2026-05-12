import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import { requireKnowledgeDocumentAskEnabled } from "@/lib/document-brain/requireKnowledgeDocumentAskEnabled";

export const runtime = "nodejs";

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

  const gate = await requireKnowledgeDocumentAskEnabled(supabase, documentId, user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { data, error } = await supabase
    .from("document_generated_infographics")
    .select("id, aspect_ratio, style, focus_options, model, storage_path, created_at")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json({ error: "history_failed", detail: error.message.slice(0, 200) }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id as string,
    aspect_ratio: row.aspect_ratio as string,
    style: row.style as string,
    focus_options: row.focus_options,
    model: row.model as string,
    image_url: knowledgeFilesProxyUrlFromStoragePath(row.storage_path as string),
    created_at: row.created_at as string,
  }));

  return NextResponse.json({ items });
}
