import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { generateAudioFocusOptionsModelJson } from "@/lib/document-brain/audioFocusGeneration";
import { loadCompletedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";
import { requireKnowledgeDocumentAskEnabled } from "@/lib/document-brain/requireKnowledgeDocumentAskEnabled";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(_req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  if (!getGeminiServerApiKey()) {
    return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });
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

  const loaded = await loadCompletedDocumentOracleContext(supabase, user.id, documentId);
  if (!loaded.ok) {
    const st = loaded.status === 404 ? 404 : 409;
    return NextResponse.json({ error: loaded.error }, { status: st });
  }

  try {
    const { parsed } = await generateAudioFocusOptionsModelJson(loaded.ctx);
    return NextResponse.json({
      document_summary: parsed.document_summary,
      focus_options: parsed.focus_options,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[audio-summary/focus-options]", msg);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: msg.slice(0, 200) },
      { status: 502 },
    );
  }
}
