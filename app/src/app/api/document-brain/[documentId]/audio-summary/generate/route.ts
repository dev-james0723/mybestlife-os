import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { isAudioProviderConfigured, synthesizeDocOracleAudio, getDocOracleAudioProvider } from "@/lib/ai/audio-summary";
import {
  generateDocOracleAudioScriptModelJson,
  parseAudioScriptJson,
  type AudioScriptRequest,
} from "@/lib/document-brain/audioScriptGeneration";
import type { FocusSelectionInput } from "@/lib/document-brain/infographicGrounding";
import { loadCompletedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";
import { requireKnowledgeDocumentAskEnabled } from "@/lib/document-brain/requireKnowledgeDocumentAskEnabled";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";

export const runtime = "nodejs";
export const maxDuration = 180;

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

function estimateSecondsFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(25, Math.min(960, Math.round(words / 2.6)));
}

function buildTtsText(
  kind: "single_host" | "two_hosts",
  single: { script: string } | null,
  two: { turns: { speaker: string; text: string }[] } | null,
): string {
  if (kind === "two_hosts" && two) {
    const lines = two.turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
    return `TTS the following conversation between Host A and Host B (use the speaker labels exactly):\n\n${lines}`;
  }
  const script = single?.script?.trim() ?? "";
  return `Say in a clear, warm documentary narration tone (single narrator). Do not read stage directions aloud.\n\n${script}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  if (!isAudioProviderConfigured()) {
    return NextResponse.json({ error: "audio_generation_not_configured" }, { status: 503 });
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

  let scriptKind: "single_host" | "two_hosts";
  let transcript = "";
  let chapters: unknown[] = [];
  let source_pages: number[] = [];
  let source_sections: string[] = [];
  let estimatedDuration: number | null = null;
  let singleScript: { script: string } | null = null;
  let twoScript: { turns: { speaker: string; text: string }[] } | null = null;

  try {
    const { raw } = await generateDocOracleAudioScriptModelJson(loaded.ctx, reqPayload);
    const parsed = parseAudioScriptJson(raw);
    if (parsed.kind === "two_hosts") {
      scriptKind = "two_hosts";
      const v = parsed.value;
      twoScript = { turns: v.turns };
      transcript = v.turns.map((t: { speaker: string; text: string }) => `${t.speaker}: ${t.text}`).join("\n\n");
      chapters = v.turns.map((t: { speaker: string; text: string }, i: number) => ({
        title: `${t.speaker} · part ${i + 1}`,
        text: t.text,
        source_pages: v.source_pages ?? [],
      }));
      source_pages = v.source_pages ?? [];
      source_sections = v.source_sections ?? [];
      estimatedDuration = v.estimated_duration_seconds ?? estimateSecondsFromText(transcript);
    } else {
      scriptKind = "single_host";
      const v = parsed.value;
      singleScript = { script: v.script };
      transcript = v.script;
      chapters = v.chapters;
      source_pages = v.source_pages;
      source_sections = v.source_sections;
      estimatedDuration = v.estimated_duration_seconds ?? estimateSecondsFromText(v.script);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[audio-summary/generate] script", msg);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: msg.slice(0, 200) },
      { status: 502 },
    );
  }

  const ttsText = buildTtsText(scriptKind, singleScript, twoScript);
  const langOut: "en" | "zh-Hant" | "auto" =
    language === "en" || language === "zh-Hant" ? language : loaded.ctx.language?.toLowerCase().startsWith("zh")
      ? "zh-Hant"
      : "en";

  let audioBytes: Buffer;
  let mimeType: string;
  let providerOut: string;
  let voiceName: string | undefined;

  try {
    const out = await synthesizeDocOracleAudio({
      text: ttsText.slice(0, 14_000),
      language: langOut,
      voiceGender: voice_gender,
      format,
    });
    audioBytes = out.audioBytes;
    mimeType = out.mimeType;
    providerOut = out.provider;
    voiceName = out.voiceName;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[audio-summary/generate] tts", msg);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: msg.slice(0, 200) },
      { status: 502 },
    );
  }

  const ext =
    mimeType.includes("mpeg") || mimeType.includes("mp3")
      ? "mp3"
      : mimeType.includes("wav")
        ? "wav"
        : "wav";
  const objectId = randomUUID();
  const storagePath = `${user.id}/documents/${documentId}/audio-summaries/${objectId}.${ext}`;

  const { error: upErr } = await supabase.storage.from("knowledge-files").upload(storagePath, audioBytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (upErr) {
    console.error("[audio-summary/generate] storage", upErr.message);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: "storage_upload_failed" },
      { status: 502 },
    );
  }

  const audio_url = knowledgeFilesProxyUrlFromStoragePath(storagePath);
  const focusPayload = selections.map((f) => ({ id: f.id, label: f.label, description: f.description }));

  const durationSeconds =
    estimatedDuration ?? estimateSecondsFromText(transcript || ttsText);

  const { error: insErr } = await supabase.from("document_audio_summaries").insert({
    user_id: user.id,
    document_id: documentId,
    analysis_id: loaded.ctx.analysisId,
    provider: getDocOracleAudioProvider(),
    voice_gender,
    voice_name: voiceName ?? null,
    format,
    duration_seconds: durationSeconds,
    focus_options: focusPayload,
    transcript,
    chapters,
    source_pages,
    source_sections,
    storage_path: storagePath,
    audio_url,
    audio_mime_type: mimeType,
  });
  if (insErr) {
    console.warn("[audio-summary/generate] db_insert", insErr.message);
  }

  return NextResponse.json({
    audio_url,
    storage_path: storagePath,
    transcript,
    chapters,
    source_pages,
    source_sections,
    provider: providerOut,
    voice_gender,
    duration_seconds: durationSeconds,
  });
}
