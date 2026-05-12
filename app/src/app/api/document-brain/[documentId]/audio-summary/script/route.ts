import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  generateDocOracleAudioScriptModelJson,
  parseAudioScriptJson,
  type AudioScriptRequest,
} from "@/lib/document-brain/audioScriptGeneration";
import type { FocusSelectionInput } from "@/lib/document-brain/infographicGrounding";
import { loadCompletedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";
import { requireKnowledgeDocumentAskEnabled } from "@/lib/document-brain/requireKnowledgeDocumentAskEnabled";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseFocusSelections(body: Record<string, unknown>): FocusSelectionInput[] {
  const raw = body.selected_focus_options;
  if (!Array.isArray(raw)) return [];
  const out: FocusSelectionInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    if (!id || !label) continue;
    out.push({ id, label, description });
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  if (!getGeminiServerApiKey()) {
    return NextResponse.json({ error: "gemini_not_configured" }, { status: 503 });
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
  const custom_focus = typeof o.custom_focus === "string" ? o.custom_focus : "";
  const voice_gender = o.voice_gender === "male" || o.voice_gender === "female" ? o.voice_gender : null;
  const format = o.format === "single_host" || o.format === "two_hosts" ? o.format : null;
  const duration = o.duration === "short" || o.duration === "medium" || o.duration === "long" ? o.duration : null;
  const language = o.language === "auto" || o.language === "en" || o.language === "zh-Hant" ? o.language : null;

  if (!voice_gender || !format || !duration || !language) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const idsRaw = Array.isArray(o.focus_option_ids)
    ? o.focus_option_ids.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  let selections = parseFocusSelections(o);
  if (idsRaw.length > 0) {
    selections = selections.filter((s) => idsRaw.includes(s.id));
  }
  if (selections.length === 0 && !custom_focus.trim()) {
    return NextResponse.json({ error: "missing_focus" }, { status: 400 });
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

  const reqPayload: AudioScriptRequest = {
    focusSelections: selections,
    customFocus: custom_focus,
    voiceGender: voice_gender,
    format,
    duration,
    language,
  };

  try {
    const { raw } = await generateDocOracleAudioScriptModelJson(loaded.ctx, reqPayload);
    const parsed = parseAudioScriptJson(raw);
    if (parsed.kind === "two_hosts") {
      const v = parsed.value;
      return NextResponse.json({
        format: "two_hosts",
        title: v.title ?? null,
        estimated_duration_seconds: v.estimated_duration_seconds ?? null,
        turns: v.turns,
        source_pages: v.source_pages ?? [],
        source_sections: v.source_sections ?? [],
      });
    }
    const v = parsed.value;
    return NextResponse.json({
      format: "single_host",
      title: v.title,
      estimated_duration_seconds: v.estimated_duration_seconds ?? null,
      script: v.script,
      chapters: v.chapters,
      source_pages: v.source_pages,
      source_sections: v.source_sections,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[audio-summary/script]", msg);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: msg.slice(0, 200) },
      { status: 502 },
    );
  }
}
