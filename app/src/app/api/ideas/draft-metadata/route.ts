import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { IDEA_CATEGORIES, IDEA_DESTINATION_OPTIONS, type IdeaCategorySlug } from "@/lib/ideas/constants";
import { stripHtml } from "@/lib/utils/html";
import type { CaptureKind, Idea } from "@/types/database";
import type { DestinationRoute } from "@/types/idea";

export const runtime = "nodejs";

type CandidateKind = "project" | "task" | "knowledge";

type Candidate = {
  kind: CandidateKind;
  id: string;
  title: string;
  body: string;
  tags: string[];
};

const VALID_KINDS = new Set<CaptureKind>(["idea", "task", "note", "goal"]);
const VALID_SOURCE_TYPES = new Set<Idea["source_type"]>(["text", "voice", "share"]);
const VALID_DESTINATIONS = new Set<DestinationRoute>(
  IDEA_DESTINATION_OPTIONS.map((option) => option.value),
);

function cleanText(value: unknown, max = 1200): string {
  if (typeof value !== "string") return "";
  return stripHtml(value).replace(/\s+/g, " ").trim().slice(0, max);
}

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

function tokenSet(text: string): Set<string> {
  const normalized = text.toLowerCase();
  const tokens = new Set<string>();
  for (const m of normalized.matchAll(/[\p{Letter}\p{Number}]{2,}/gu)) tokens.add(m[0]);
  for (const m of normalized.matchAll(/\p{Script=Han}+/gu)) {
    const chars = Array.from(m[0]);
    for (const ch of chars) tokens.add(ch);
    for (let i = 0; i < chars.length - 1; i += 1) tokens.add(`${chars[i]}${chars[i + 1]}`);
  }
  return tokens;
}

function scoreCandidate(plain: string, candidate: Candidate): number {
  const a = tokenSet(plain);
  const b = tokenSet(`${candidate.title} ${candidate.body} ${candidate.tags.join(" ")}`);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += token.length > 1 ? 2 : 0.65;
  }
  return overlap / Math.sqrt(a.size + b.size);
}

function candidateBlock(candidates: Candidate[]): string {
  return candidates
    .map((candidate) =>
      JSON.stringify({
        kind: candidate.kind,
        id: candidate.id,
        title: candidate.title,
        notes: candidate.body.slice(0, 520),
        tags: candidate.tags.slice(0, 8),
      }),
    )
    .join("\n");
}

function coerceStringList(value: unknown, validIds: Set<string>, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!validIds.has(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

function coerceDestinations(value: unknown): DestinationRoute[] {
  if (!Array.isArray(value)) return [];
  const out: DestinationRoute[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const v = raw.trim() as DestinationRoute;
    if (!VALID_DESTINATIONS.has(v) || out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

function fallbackMetadata(
  plain: string,
  candidates: Candidate[],
  existingKind: CaptureKind,
  existingSourceType: Idea["source_type"],
) {
  const scored = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(plain, candidate) }))
    .filter((item) => item.score > 0.04)
    .sort((a, b) => b.score - a.score);
  const projectIds = scored.filter((item) => item.candidate.kind === "project").slice(0, 2).map((item) => item.candidate.id);
  const taskIds = scored.filter((item) => item.candidate.kind === "task").slice(0, 3).map((item) => item.candidate.id);
  const knowledgeIds = scored.filter((item) => item.candidate.kind === "knowledge").slice(0, 2).map((item) => item.candidate.id);
  const destinations: DestinationRoute[] = [];
  if (taskIds.length > 0 || /todo|做|處理|安排|call|email|book|買|買入|schedule/i.test(plain)) destinations.push("task");
  if (knowledgeIds.length > 0 || plain.length > 160) destinations.push("kb");
  return {
    category: "random" as IdeaCategorySlug,
    captureKind: existingKind,
    sourceType: existingSourceType,
    destinations,
    linkedProjectIds: projectIds,
    linkedTaskIds: taskIds,
    linkedKnowledgeIds: knowledgeIds,
  };
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: { contentHtml?: string; existingKind?: string; existingSourceType?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plain = stripHtml((payload.contentHtml ?? "").slice(0, 16_000)).replace(/\s+/g, " ").trim();
  if (plain.length < 8) {
    return NextResponse.json({ error: "contentHtml must yield at least 8 characters" }, { status: 400 });
  }
  const existingKind = VALID_KINDS.has(payload.existingKind as CaptureKind)
    ? (payload.existingKind as CaptureKind)
    : "idea";
  const existingSourceType = VALID_SOURCE_TYPES.has(payload.existingSourceType as Idea["source_type"])
    ? (payload.existingSourceType as Idea["source_type"])
    : "text";

  const [projectsRes, tasksRes, knowledgeRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description,status,priority,tags,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("tasks")
      .select("id,title,description,status,priority,tags,project_id,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("knowledge_items")
      .select("id,title,ai_summary,ai_tldr,ai_tags,manual_tags,raw_content,category,date_added")
      .eq("user_id", user.id)
      .order("date_added", { ascending: false })
      .limit(80),
  ]);

  const candidates: Candidate[] = [];
  for (const row of (projectsRes.data ?? []) as Record<string, unknown>[]) {
    const id = typeof row.id === "string" ? row.id : "";
    const title = cleanText(row.name, 160);
    if (id && title) {
      candidates.push({
        kind: "project",
        id,
        title,
        body: cleanText(row.description, 900),
        tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : [],
      });
    }
  }
  for (const row of (tasksRes.data ?? []) as Record<string, unknown>[]) {
    const id = typeof row.id === "string" ? row.id : "";
    const title = cleanText(row.title, 160);
    if (id && title) {
      candidates.push({
        kind: "task",
        id,
        title,
        body: cleanText(row.description, 700),
        tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : [],
      });
    }
  }
  for (const row of (knowledgeRes.data ?? []) as Record<string, unknown>[]) {
    const id = typeof row.id === "string" ? row.id : "";
    const title = cleanText(row.title, 160);
    if (id && title) {
      candidates.push({
        kind: "knowledge",
        id,
        title,
        body: [row.ai_summary, row.ai_tldr, row.raw_content].map((v) => cleanText(v, 500)).filter(Boolean).join(" "),
        tags: [
          ...(Array.isArray(row.ai_tags) ? row.ai_tags.filter((t): t is string => typeof t === "string") : []),
          ...(Array.isArray(row.manual_tags) ? row.manual_tags.filter((t): t is string => typeof t === "string") : []),
        ],
      });
    }
  }

  candidates.sort((a, b) => scoreCandidate(plain, b) - scoreCandidate(plain, a));
  const selected = candidates.slice(0, 42);
  const fallback = fallbackMetadata(plain, selected, existingKind, existingSourceType);
  const apiKey = getGeminiServerApiKey();
  if (!apiKey || selected.length === 0) return NextResponse.json(fallback);

  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: `You pre-fill metadata for an Idea Capture modal.

Return ONLY valid JSON with this exact shape:
{
  "category": ${JSON.stringify(IDEA_CATEGORIES)},
  "captureKind": "idea" | "task" | "note" | "goal",
  "sourceType": "text" | "voice" | "share",
  "destinations": ("task" | "kb" | "timeline" | "graph")[],
  "linkedProjectIds": string[],
  "linkedTaskIds": string[],
  "linkedKnowledgeIds": string[]
}

Rules:
- Choose IDs ONLY from the candidates below. Never invent IDs.
- linkedProjectIds: at most 2 genuinely relevant projects.
- linkedTaskIds: at most 3 genuinely relevant existing tasks.
- linkedKnowledgeIds: at most 2 useful knowledge items.
- sourceType: use "share" only if the text reads like imported/shared external content; otherwise keep "${existingSourceType}".
- captureKind: keep "${existingKind}" unless the content clearly behaves like another kind.
- category: one allowed idea category.
- destinations: modules where this should route next; include "task" for actionable work, "kb" for reference/knowledge, "timeline" for time-bound moment, "graph" for people/org/project relationships.
- Output JSON only.`,
      userText: `Idea content:
${plain.slice(0, 5000)}

Candidates:
${candidateBlock(selected)}`,
    });

    const parsed = parseJsonObject(text);
    if (!parsed) return NextResponse.json(fallback);
    const validProjectIds = new Set(selected.filter((c) => c.kind === "project").map((c) => c.id));
    const validTaskIds = new Set(selected.filter((c) => c.kind === "task").map((c) => c.id));
    const validKnowledgeIds = new Set(selected.filter((c) => c.kind === "knowledge").map((c) => c.id));
    const category = typeof parsed.category === "string" && IDEA_CATEGORIES.includes(parsed.category as IdeaCategorySlug)
      ? (parsed.category as IdeaCategorySlug)
      : fallback.category;
    const captureKind = VALID_KINDS.has(parsed.captureKind as CaptureKind)
      ? (parsed.captureKind as CaptureKind)
      : fallback.captureKind;
    const sourceType = VALID_SOURCE_TYPES.has(parsed.sourceType as Idea["source_type"])
      ? (parsed.sourceType as Idea["source_type"])
      : fallback.sourceType;
    return NextResponse.json({
      category,
      captureKind,
      sourceType,
      destinations: coerceDestinations(parsed.destinations),
      linkedProjectIds: coerceStringList(parsed.linkedProjectIds, validProjectIds, 2),
      linkedTaskIds: coerceStringList(parsed.linkedTaskIds, validTaskIds, 3),
      linkedKnowledgeIds: coerceStringList(parsed.linkedKnowledgeIds, validKnowledgeIds, 2),
    });
  } catch (err) {
    console.warn("[ideas/draft-metadata]", err instanceof Error ? err.message : String(err));
    return NextResponse.json(fallback);
  }
}
