import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import {
  buildIdeaCardIconPrompt,
  defaultIdeaCardPalette,
  generateIdeaCardThumbnail,
} from "@/lib/ideas/generate-idea-card-icon";
import { fallbackIdeaTitleFromPlain } from "@/lib/ideas/clamp-idea-title";
import { stripHtml } from "@/lib/utils/html";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { contentHtml?: string; title?: string; summary?: string; tags?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plain = stripHtml((payload.contentHtml ?? "").slice(0, 16_000)).trim();
  if (plain.length < 8) {
    return NextResponse.json({ error: "contentHtml must yield at least 8 characters" }, { status: 400 });
  }

  const title = payload.title?.trim() || fallbackIdeaTitleFromPlain(plain) || "Idea";
  const summary = payload.summary?.trim() ?? "";
  const tags = Array.isArray(payload.tags)
    ? payload.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8)
    : [];
  const palette = defaultIdeaCardPalette(`${title}:${plain.slice(0, 80)}`);
  const prompt = buildIdeaCardIconPrompt({
    ideaContent: `${plain}\n${summary}`.trim(),
    title,
    tags,
    palette,
  });

  const image = await generateIdeaCardThumbnail({
    apiKey: getGeminiServerApiKey() ?? null,
    prompt,
    title,
    palette,
  });

  return NextResponse.json({
    imageUrl: `data:${image.mimeType};base64,${image.imageBytes.toString("base64")}`,
    prompt: image.promptUsed,
    model: image.modelUsed,
    warning: image.geminiWarning,
    source: image.source,
  });
}
