import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  clampIdeaTitle,
  fallbackIdeaTitleFromPlain,
} from "@/lib/ideas/clamp-idea-title";
import { ideaOverviewFromContent } from "@/lib/ideas/idea-overview";
import { normalizeIdeaTags } from "@/lib/ideas/normalize-idea-tag";
import { stripHtml } from "@/lib/utils/html";

export const runtime = "nodejs";

const MAX_HTML_CHARS = 24_000;

export type IdeaEnrichApiResult = {
  title: string;
  overview: string;
  coreInsight: string;
  suggestedNextStep: string;
  aiTags: string[];
  visualSubject: string;
  confidence: number;
  source: "gemini" | "fallback";
  /** @deprecated kept for backward-compat with older clients. */
  summary: string;
};

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/u, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cleanField(value: unknown, max = 280): string {
  if (typeof value !== "string") return "";
  return stripHtml(value).replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function clampConfidence(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function fallbackResult(contentHtml: string, plain: string): IdeaEnrichApiResult {
  const overview = ideaOverviewFromContent(contentHtml, 600);
  const title = fallbackIdeaTitleFromPlain(plain);
  return {
    title,
    overview,
    coreInsight: "",
    suggestedNextStep: "",
    aiTags: [],
    visualSubject: "",
    confidence: 0,
    source: "fallback",
    summary: overview,
  };
}

/**
 * POST `/api/ideas/ai-enrich`
 *
 * Body: `{ contentHtml: string }`
 *
 * Returns an {@link IdeaEnrichApiResult}: a Gemini-generated, length-clamped
 * title plus a real AI **overview** (a 1–2 sentence summary, NOT the raw
 * content), core insight, next step, short semantic tags and an image subject.
 * Falls back to a local title + content overview (marked `source: "fallback"`)
 * when Gemini is unavailable or returns unusable output.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();

  let payload: { contentHtml?: string };
  try {
    payload = (await req.json()) as { contentHtml?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentHtml = payload.contentHtml ?? "";
  const plain = stripHtml(contentHtml.slice(0, MAX_HTML_CHARS)).trim();
  if (plain.length < 8) {
    return NextResponse.json(
      { error: "contentHtml must yield at least 8 characters of text" },
      { status: 400 },
    );
  }

  if (!apiKey) {
    console.warn("[ideas/ai-enrich] GEMINI_API_KEY missing — using fallback");
    return NextResponse.json({ ...fallbackResult(contentHtml, plain), warning: "gemini_not_configured" });
  }

  const systemInstruction = `You are organizing a personal Life OS idea capture system. You GENERALIZE and SUMMARIZE — you never copy the user's text back verbatim.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "overview": string,
  "coreInsight": string,
  "suggestedNextStep": string,
  "aiTags": string[],
  "visualSubject": string,
  "confidence": number
}

Rules:
- LANGUAGE: match the dominant language/script of the source. Traditional Chinese / Cantonese input MUST produce natural Traditional Chinese output (avoid mainland corporate wording). English input produces English output.
- title: a GENERALIZED noun phrase revealing the concept/category — NOT a copied sentence. Chinese: max 10 characters. English: max 8 words. No trailing punctuation, no quotes.
- overview: summarize the idea in 1–2 SHORT sentences. Do NOT copy the original text; rephrase at a higher level.
- coreInsight: explain the underlying meaning or category behind the idea (one sentence).
- suggestedNextStep: one concrete action the user can take.
- aiTags: 4–8 SHORT semantic keywords only. Chinese: usually 2–6 characters, hard max 8 (proper nouns like 新幹線 ok). English: 1–3 words. No sentences, no "#", no duplicates.
- visualSubject: concrete objects/metaphors for a thumbnail illustration (e.g. "cherry blossoms, a shinkansen train, a small family silhouette").
- confidence: integer 0–100.
- Do NOT include HTML entities such as &nbsp;, and no QUESTION/ANS prefixes, markdown, or quotes.
- Output JSON only, no fences, no preamble.

Example input: "今日諗到去日本旅行，帶阿爸阿媽去賞櫻，由東京搭新幹線去京都"
Example output: {"title":"日本家庭旅行","overview":"這是一個帶父母去日本賞櫻、以新幹線連接東京與京都的家庭旅行構想。","coreInsight":"重點不只是旅行，而是安排一段和父母同行的家庭回憶。","suggestedNextStep":"先列出東京、京都與賞櫻日期的基本行程。","aiTags":["日本","東京","京都","旅行","家庭","新幹線","賞櫻"],"visualSubject":"cherry blossoms, a shinkansen train, Tokyo and Kyoto travel symbols, a small family silhouette","confidence":94}`;

  const userText = `Idea content (plain text extracted from rich text):\n${plain}`;

  try {
    const { text } = await fetchGeminiPlannerJsonText({ apiKey, systemInstruction, userText });
    const parsed = parseJsonObject(text);
    if (!parsed) {
      console.warn("[ideas/ai-enrich] Gemini returned unparseable JSON — using fallback");
      return NextResponse.json({ ...fallbackResult(contentHtml, plain), warning: "gemini_unparseable" });
    }

    const title =
      clampIdeaTitle(cleanField(parsed.title, 80)) || fallbackIdeaTitleFromPlain(plain);
    const overview = cleanField(parsed.overview, 600);
    const result: IdeaEnrichApiResult = {
      title,
      overview: overview || ideaOverviewFromContent(contentHtml, 600),
      coreInsight: cleanField(parsed.coreInsight, 280),
      suggestedNextStep: cleanField(parsed.suggestedNextStep, 280),
      aiTags: normalizeIdeaTags(parsed.aiTags),
      visualSubject: cleanField(parsed.visualSubject, 400),
      confidence: clampConfidence(parsed.confidence),
      source: overview ? "gemini" : "fallback",
      summary: overview || ideaOverviewFromContent(contentHtml, 600),
    };
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ideas/ai-enrich]", message);
    return NextResponse.json({ ...fallbackResult(contentHtml, plain), warning: "gemini_failed" });
  }
}
