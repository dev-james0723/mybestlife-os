import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  generateDocOracleInfographicImage,
  buildDocOracleInfographicPrompt,
  type InfographicAspectRatio,
} from "@/lib/ai/gemini-infographic";
import { getDocOracleImageModel, getDocOracleImageModelFallback } from "@/lib/ai/gemini-image";
import {
  buildGroundedFactsBlock,
  expandFocusPages,
  type FocusSelectionInput,
} from "@/lib/document-brain/infographicGrounding";
import type { InfographicStyle } from "@/lib/document-brain/infographicStyles";
import { INFOGRAPHIC_STYLE_PRESETS } from "@/lib/document-brain/infographicStyles";
import { loadCompletedDocumentOracleContext } from "@/lib/document-brain/loadDocumentOracleContext";
import { requireKnowledgeDocumentAskEnabled } from "@/lib/document-brain/requireKnowledgeDocumentAskEnabled";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";

export const runtime = "nodejs";
export const maxDuration = 120;

const ASPECTS = new Set<InfographicAspectRatio>(["16:9", "9:16", "4:3", "1:1"]);
const LANGS = new Set(["auto", "en", "zh-Hant"] as const);

function isInfographicStyle(s: string): s is InfographicStyle {
  return INFOGRAPHIC_STYLE_PRESETS.some((p) => p.id === s);
}

function resolveSelections(body: Record<string, unknown>): FocusSelectionInput[] | null {
  const raw = body.selected_focus_options;
  if (!Array.isArray(raw)) return null;
  const out: FocusSelectionInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const description = typeof o.description === "string" ? o.description.trim() : "";
    if (!id || !label) continue;
    const source_pages = Array.isArray(o.source_pages)
      ? o.source_pages.filter((x): x is number => typeof x === "number" && Number.isFinite(x)).map((x) => Math.floor(x))
      : undefined;
    const source_sections = Array.isArray(o.source_sections)
      ? o.source_sections.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
      : undefined;
    out.push({ id, label, description, source_pages, source_sections });
  }
  return out;
}

export async function POST(req: Request, ctx: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await ctx.params;
  if (!documentId) {
    return NextResponse.json({ error: "invalid_document" }, { status: 400 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "image_generation_not_configured" }, { status: 503 });
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
  const aspect_ratio = typeof o.aspect_ratio === "string" ? o.aspect_ratio : "";
  const style = typeof o.style === "string" ? o.style : "";
  const custom_focus = typeof o.custom_focus === "string" ? o.custom_focus : "";
  const language = typeof o.language === "string" && LANGS.has(o.language as "auto") ? (o.language as "auto" | "en" | "zh-Hant") : "auto";

  if (!ASPECTS.has(aspect_ratio as InfographicAspectRatio)) {
    return NextResponse.json({ error: "invalid_aspect_ratio" }, { status: 400 });
  }
  if (!isInfographicStyle(style)) {
    return NextResponse.json({ error: "invalid_style" }, { status: 400 });
  }

  const selected = resolveSelections(o) ?? [];
  const idsRaw = Array.isArray(o.focus_option_ids)
    ? o.focus_option_ids.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  const filtered =
    idsRaw.length > 0 ? selected.filter((s) => idsRaw.includes(s.id)) : selected;

  if (filtered.length === 0 && !custom_focus.trim()) {
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

  const pageFilter = expandFocusPages(loaded.ctx, filtered);
  const grounded = buildGroundedFactsBlock(loaded.ctx, pageFilter);
  const focusLabels = filtered.map((f) => `${f.label}: ${f.description}`.slice(0, 400));

  const promptUsedFull = buildDocOracleInfographicPrompt({
    documentTitle: loaded.ctx.documentTitle || "Document",
    aspectRatio: aspect_ratio as InfographicAspectRatio,
    style: style as InfographicStyle,
    language,
    documentLanguage: loaded.ctx.language,
    groundedFactsBlock: grounded,
    focusLabels,
    customFocus: custom_focus,
  });

  const primaryModel = getDocOracleImageModel();
  const fallbackModel = getDocOracleImageModelFallback();

  let imageBytes: Buffer;
  let mimeType: string;
  let promptUsed = promptUsedFull;
  let modelUsed = primaryModel;

  try {
    const first = await generateDocOracleInfographicImage({
      apiKey,
      model: primaryModel,
      prompt: promptUsedFull,
    });
    imageBytes = first.imageBytes;
    mimeType = first.mimeType;
    promptUsed = first.promptUsed;
  } catch (e1) {
    if (!fallbackModel || fallbackModel === primaryModel) {
      const msg = e1 instanceof Error ? e1.message : String(e1);
      console.error("[infographic/generate]", msg);
      return NextResponse.json(
        { error: "infographic_generation_failed", detail: msg.slice(0, 200) },
        { status: 502 },
      );
    }
    try {
      const second = await generateDocOracleInfographicImage({
        apiKey,
        model: fallbackModel,
        prompt: promptUsedFull,
      });
      imageBytes = second.imageBytes;
      mimeType = second.mimeType;
      promptUsed = second.promptUsed;
      modelUsed = fallbackModel;
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : String(e2);
      console.error("[infographic/generate] fallback", msg);
      return NextResponse.json(
        { error: "infographic_generation_failed", detail: msg.slice(0, 200) },
        { status: 502 },
      );
    }
  }

  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const objectId = randomUUID();
  const storagePath = `${user.id}/documents/${documentId}/infographics/${objectId}.${ext}`;

  const { error: upErr } = await supabase.storage.from("knowledge-files").upload(storagePath, imageBytes, {
    contentType: mimeType || "image/png",
    upsert: false,
  });
  if (upErr) {
    console.error("[infographic/generate] storage", upErr.message);
    return NextResponse.json(
      { error: "infographic_generation_failed", detail: "storage_upload_failed" },
      { status: 502 },
    );
  }

  const image_url = knowledgeFilesProxyUrlFromStoragePath(storagePath);

  const focusPayload = filtered.map((f) => ({
    id: f.id,
    label: f.label,
    description: f.description,
    source_pages: f.source_pages ?? [],
    source_sections: f.source_sections ?? [],
  }));

  const { error: insErr } = await supabase.from("document_generated_infographics").insert({
    user_id: user.id,
    document_id: documentId,
    analysis_id: loaded.ctx.analysisId,
    aspect_ratio,
    style,
    focus_options: focusPayload,
    prompt_used: promptUsed,
    storage_path: storagePath,
    image_url,
    model: modelUsed,
  });
  if (insErr) {
    console.warn("[infographic/generate] db_insert", insErr.message);
  }

  return NextResponse.json({
    image_url,
    storage_path: storagePath,
    prompt_used: promptUsed,
    model: modelUsed,
    aspect_ratio,
    style,
  });
}
