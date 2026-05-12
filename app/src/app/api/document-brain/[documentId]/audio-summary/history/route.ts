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
    .from("document_audio_summaries")
    .select(
      "id, provider, voice_gender, voice_name, format, duration_seconds, transcript, chapters, source_pages, source_sections, storage_path, audio_mime_type, created_at",
    )
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
    provider: row.provider as string,
    voice_gender: row.voice_gender as string,
    voice_name: row.voice_name as string | null,
    format: row.format as string,
    duration_seconds: row.duration_seconds as number | null,
    transcript: row.transcript as string | null,
    chapters: row.chapters,
    source_pages: row.source_pages as number[],
    source_sections: row.source_sections as string[],
    audio_url: knowledgeFilesProxyUrlFromStoragePath(row.storage_path as string),
    audio_mime_type: row.audio_mime_type as string | null,
    created_at: row.created_at as string,
  }));

  return NextResponse.json({ items });
}
