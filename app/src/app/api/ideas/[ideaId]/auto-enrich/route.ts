import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { clampIdeaSummary, clampIdeaTitle } from "@/lib/ideas/clamp-idea-title";
import { isSuggestionTooSimilar } from "@/lib/ideas/idea-suggestion-guard";
import {
  buildIdeaCardIconPrompt,
  generateIdeaCardThumbnail,
  getIdeaCardIconModel,
  IDEA_CARD_VISUAL_STYLE_VERSION,
} from "@/lib/ideas/generate-idea-card-icon";
import { ideaOverviewFromContent } from "@/lib/ideas/idea-overview";
import { normalizeIdea } from "@/lib/ideas/normalize-idea";
import { ideaAiSuggestions, previewIdeaTitle } from "@/lib/ideas/idea-helpers";
import { normalizeIdeaTags } from "@/lib/ideas/normalize-idea-tag";
import { IDEA_CATEGORIES, type IdeaCategorySlug } from "@/lib/ideas/constants";
import { stripHtml } from "@/lib/utils/html";
import type { Idea, Json } from "@/types/database";
import type {
  IdeaAiSuggestions,
  IdeaCardVisual,
  IdeaRelatedResource,
  IdeaRelatedScope,
  IdeaResourceKind,
} from "@/types/idea";

export const runtime = "nodejs";
export const maxDuration = 120;

type Candidate = {
  scope: IdeaRelatedScope;
  id: string;
  dbId: string;
  title: string;
  body: string;
  tags: string[];
  subtitle?: string;
  url?: string;
  resourceKind?: IdeaResourceKind;
  source?: string;
};

type GeminiRelated = {
  scope?: unknown;
  id?: unknown;
  percentage?: unknown;
  explanation?: unknown;
};

type GeminiAnalysis = {
  title: string;
  summary: string;
  coreInsight: string;
  suggestedNextStep: string;
  possibleUse: string;
  clarifyingQuestion: string;
  aiTags: string[];
  category: IdeaCategorySlug;
  captureKind: Idea["capture_kind"];
  related: IdeaRelatedResource[];
  cardVisualPrompt: string;
  cardVisualPalette: string[];
  model?: string;
};

const KIND_LIMITS: Record<IdeaRelatedScope, number> = {
  idea: 10,
  project: 10,
  goal: 10,
  resource: 18,
  task: 14,
  knowledge: 20,
  bucket: 10,
  career: 8,
};

const KIND_ORDER: IdeaRelatedScope[] = [
  "project",
  "goal",
  "resource",
  "task",
  "knowledge",
  "idea",
  "bucket",
  "career",
];

const VALID_CAPTURE_KINDS = new Set<Idea["capture_kind"]>(["idea", "task", "note", "goal"]);

function cleanText(value: unknown, max = 1200): string {
  if (typeof value !== "string") return "";
  return stripHtml(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanTitle(value: unknown, fallback = "Untitled"): string {
  const title = cleanText(value, 160).replace(/\.+$/u, "");
  return title || fallback;
}

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[#＃]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function coerceTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = normalizeTag(item);
    if (tag && !out.includes(tag)) out.push(tag);
    if (out.length >= 8) break;
  }
  return out;
}

function isScope(value: unknown): value is IdeaRelatedScope {
  return KIND_ORDER.includes(value as IdeaRelatedScope);
}

function isCategory(value: unknown): value is IdeaCategorySlug {
  return typeof value === "string" && IDEA_CATEGORIES.includes(value as IdeaCategorySlug);
}

function coerceCaptureKind(value: unknown, fallback: Idea["capture_kind"]): Idea["capture_kind"] {
  return typeof value === "string" && VALID_CAPTURE_KINDS.has(value as Idea["capture_kind"])
    ? (value as Idea["capture_kind"])
    : fallback;
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
  for (const m of normalized.matchAll(/[\p{Letter}\p{Number}]{2,}/gu)) {
    tokens.add(m[0]);
  }
  for (const m of normalized.matchAll(/\p{Script=Han}+/gu)) {
    const chars = Array.from(m[0]);
    for (const ch of chars) tokens.add(ch);
    for (let i = 0; i < chars.length - 1; i += 1) tokens.add(`${chars[i]}${chars[i + 1]}`);
  }
  return tokens;
}

function heuristicScore(ideaText: string, candidate: Candidate): number {
  const a = tokenSet(ideaText);
  if (a.size === 0) return 0;
  const b = tokenSet(`${candidate.title} ${candidate.body} ${candidate.tags.join(" ")}`);
  if (b.size === 0) return 0;
  let overlap = 0;
  for (const t of a) {
    if (b.has(t)) overlap += t.length > 1 ? 2 : 0.65;
  }
  const titleBoost = ideaText.toLowerCase().includes(candidate.title.toLowerCase().slice(0, 18))
    ? 2
    : 0;
  return (overlap + titleBoost) / Math.sqrt(a.size + b.size);
}

function selectCandidates(ideaText: string, candidates: Candidate[]): Candidate[] {
  const byKind = new Map<IdeaRelatedScope, Candidate[]>();
  for (const candidate of candidates) {
    const score = heuristicScore(ideaText, candidate);
    const enriched = { ...candidate, score } as Candidate & { score: number };
    const list = byKind.get(candidate.scope) ?? [];
    list.push(enriched);
    byKind.set(candidate.scope, list);
  }

  const selected: Candidate[] = [];
  for (const kind of KIND_ORDER) {
    const list = (byKind.get(kind) ?? []) as Array<Candidate & { score: number }>;
    list.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    selected.push(...list.slice(0, KIND_LIMITS[kind]));
  }
  return selected.slice(0, 82);
}

function candidateKey(scope: IdeaRelatedScope, id: string): string {
  return `${scope}:${id}`;
}

function clampPercent(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function coercePalette(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim()))
    .map((v) => v.trim())
    .slice(0, 5);
}

function coerceRelated(
  value: unknown,
  candidateByKey: Map<string, Candidate>,
): IdeaRelatedResource[] {
  if (!Array.isArray(value)) return [];
  const out: IdeaRelatedResource[] = [];
  const seen = new Set<string>();

  for (const raw of value as GeminiRelated[]) {
    const scope = raw.scope;
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    if (!isScope(scope) || !id) continue;
    const candidate = candidateByKey.get(candidateKey(scope, id));
    if (!candidate) continue;
    const key = candidateKey(scope, id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      scope,
      id: candidate.id,
      title: candidate.title,
      subtitle: candidate.subtitle,
      percentage: clampPercent(raw.percentage),
      explanation:
        typeof raw.explanation === "string" && raw.explanation.trim()
          ? raw.explanation.trim().slice(0, 360)
          : "Related by topic, intent, or supporting context.",
      url: candidate.url,
      resourceKind: candidate.resourceKind,
      source: candidate.source,
    });
    if (out.length >= 14) break;
  }

  return out;
}

function firstParagraphSummary(plain: string): string {
  const compact = plain.replace(/\s+/g, " ").trim();
  if (compact.length <= 280) return compact;
  return `${compact.slice(0, 277)}...`;
}

const FALLBACK_EXPLANATION: Record<IdeaRelatedScope, string> = {
  task: "Could become a concrete next action for this idea.",
  project: "Overlaps with an existing project's scope and goals.",
  goal: "Supports a goal you are already tracking.",
  knowledge: "Covers related background that informs this idea.",
  idea: "A nearby idea that shares the same theme.",
  resource: "A resource that supports executing this idea.",
  bucket: "Connects to something on your bucket list.",
  career: "Relevant to a career opportunity you are tracking.",
};

function fallbackAnalysis(idea: Idea, plain: string, candidates: Candidate[]): GeminiAnalysis {
  const scored = candidates
    .map((candidate) => ({ candidate, score: heuristicScore(plain, candidate) }))
    .filter((x) => x.score > 0.03)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const related = scored.map(({ candidate, score }) => ({
    scope: candidate.scope,
    id: candidate.id,
    title: candidate.title,
    subtitle: candidate.subtitle,
    percentage: Math.max(45, Math.min(88, Math.round(score * 100))),
    explanation: FALLBACK_EXPLANATION[candidate.scope] ?? FALLBACK_EXPLANATION.resource,
    url: candidate.url,
    resourceKind: candidate.resourceKind,
    source: candidate.source,
  }));

  const title = clampIdeaTitle(previewIdeaTitle(idea, 72));
  const tags = normalizeIdeaTags(Array.from(tokenSet(plain)).filter((t) => t.length >= 2));

  return {
    title,
    summary: ideaOverviewFromContent(idea.content, 2000) || firstParagraphSummary(plain),
    coreInsight: "",
    suggestedNextStep: "",
    possibleUse: "",
    clarifyingQuestion: "",
    aiTags: tags,
    category: "random",
    captureKind: idea.capture_kind,
    related,
    cardVisualPrompt: "",
    cardVisualPalette: ["#22c55e", "#38bdf8", "#f97316"],
  };
}

function shouldReplaceTitle(idea: Idea): boolean {
  if (!idea.title?.trim()) return true;
  const plain = stripHtml(idea.content).replace(/\s+/g, " ").trim();
  const title = idea.title.trim();
  if (!plain) return false;
  return plain.startsWith(title) || title.startsWith(plain.slice(0, Math.min(plain.length, 80)));
}

function mergeIds(...groups: string[][]): string[] {
  const out: string[] = [];
  for (const group of groups) {
    for (const id of group) {
      if (id && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

function resourceRefs(related: IdeaRelatedResource[]): Json[] {
  return related
    .filter((r) => r.scope === "resource")
    .map((r) => ({
      id: r.id.includes(":") ? r.id.split(":").slice(1).join(":") : r.id,
      resourceKind: r.resourceKind ?? "project_resource",
      title: r.title,
      percentage: r.percentage,
      explanation: r.explanation,
      url: r.url,
    })) as Json[];
}

async function maybeGenerateCardVisual(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  apiKey: string | null;
  userId: string;
  ideaId: string;
  includeVisual: boolean;
  analysis: GeminiAnalysis;
  ideaPlainContent: string;
  existing?: IdeaCardVisual;
}): Promise<IdeaCardVisual | undefined> {
  const ideaContent = params.ideaPlainContent || params.analysis.summary || params.analysis.title;
  const prompt = buildIdeaCardIconPrompt({
    ideaContent,
    title: params.analysis.title,
    tags: params.analysis.aiTags,
    palette: params.analysis.cardVisualPalette,
    motifHint: params.analysis.cardVisualPrompt,
  });

  const base: IdeaCardVisual = {
    ...params.existing,
    prompt,
    palette: params.analysis.cardVisualPalette,
    fallbackSeed: `${params.ideaId}:${params.analysis.title}`,
    generatedAt: new Date().toISOString(),
  };

  const hasCurrentStyle =
    params.existing?.styleVersion === IDEA_CARD_VISUAL_STYLE_VERSION && Boolean(params.existing?.imageUrl);
  if (!params.includeVisual || !params.apiKey || hasCurrentStyle) {
    return { ...base, styleVersion: params.existing?.styleVersion ?? IDEA_CARD_VISUAL_STYLE_VERSION };
  }

  try {
    const image = await generateIdeaCardThumbnail({
      apiKey: params.apiKey,
      prompt,
      title: params.analysis.title,
      palette: params.analysis.cardVisualPalette,
    });

    let imageUrl = `data:${image.mimeType};base64,${image.imageBytes.toString("base64")}`;
    let storagePath: string | undefined;

    if (image.source === "gemini") {
      const ext = image.mimeType.includes("svg")
        ? "svg"
        : image.mimeType.includes("jpeg") || image.mimeType.includes("jpg")
          ? "jpg"
          : image.mimeType.includes("webp")
            ? "webp"
            : "png";
      storagePath = `${params.userId}/${params.ideaId}/${randomUUID()}.${ext}`;
      const { error: uploadError } = await params.supabase.storage
        .from("idea-card-icons")
        .upload(storagePath, image.imageBytes, {
          contentType: image.mimeType,
          upsert: false,
        });
      if (!uploadError) {
        const { data } = params.supabase.storage.from("idea-card-icons").getPublicUrl(storagePath);
        imageUrl = data.publicUrl;
      } else {
        console.error("[ideas/auto-enrich] card icon upload:", uploadError.message);
        storagePath = undefined;
      }
    }

    return {
      ...base,
      imageUrl,
      storagePath,
      model: image.modelUsed,
      prompt: image.promptUsed,
      styleVersion: IDEA_CARD_VISUAL_STYLE_VERSION,
      error: image.geminiWarning?.slice(0, 500),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ideas/auto-enrich] card visual:", message);
    return { ...base, model: getIdeaCardIconModel(), styleVersion: params.existing?.styleVersion, error: message.slice(0, 180) };
  }
}

function makeCandidate(input: Candidate): Candidate | null {
  const title = cleanTitle(input.title, "");
  if (!input.dbId || !title) return null;
  return { ...input, title, body: cleanText(input.body), tags: input.tags.map(normalizeTag).filter(Boolean) };
}

export async function POST(req: Request, ctx: { params: Promise<{ ideaId: string }> }) {
  const { ideaId } = await ctx.params;
  if (!ideaId) return NextResponse.json({ error: "invalid_idea" }, { status: 400 });

  let body: { includeVisual?: boolean } = {};
  try {
    body = (await req.json()) as { includeVisual?: boolean };
  } catch {
    body = {};
  }
  const includeVisual = body.includeVisual !== false;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: ideaRow, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();
  if (ideaError || !ideaRow) {
    return NextResponse.json({ error: "Idea not found" }, { status: 404 });
  }

  const idea = normalizeIdea(ideaRow);
  const plain = stripHtml(idea.content).replace(/\s+/g, " ").trim();
  if (plain.length < 4) {
    return NextResponse.json({ error: "Idea content is too short" }, { status: 400 });
  }

  const [
    ideasRes,
    projectsRes,
    goalsRes,
    tasksRes,
    knowledgeRes,
    projectResourcesRes,
    assetsRes,
    documentsRes,
    softwareRes,
    bucketRes,
    careerRes,
  ] = await Promise.all([
    supabase
      .from("ideas")
      .select("id,title,content,ai_tags,manual_tags,category,status,created_at")
      .eq("user_id", user.id)
      .neq("id", idea.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("projects")
      .select("id,name,description,status,priority,tags,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("goals")
      .select("id,name,description,status,category,target_date")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("tasks")
      .select("id,title,description,status,priority,tags,project_id,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(120),
    supabase
      .from("knowledge_items")
      .select("id,title,ai_summary,ai_tldr,ai_tags,manual_tags,raw_content,source_url,category,provider,date_added")
      .eq("user_id", user.id)
      .order("date_added", { ascending: false })
      .limit(120),
    supabase
      .from("project_resources")
      .select("id,project_id,category,title,url,source,description,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("assets")
      .select("id,name,category,category_key,notes,location,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("documents")
      .select("id,name,document_type,notes,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("software_vault")
      .select("id,app_name,website_url,category,use_cases,why_i_use_it,summary,tags,status,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("bucket_items")
      .select("id,title,description,why_this_matters,type,status,category_tags,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("career_opportunities")
      .select("id,company_name,role_title,location,stage,job_description,job_url,notes,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(60),
  ]);

  const candidates: Candidate[] = [];
  const push = (candidate: Candidate | null) => {
    if (candidate) candidates.push(candidate);
  };

  for (const row of (ideasRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "idea",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.title, cleanText(row.content, 72) || "Idea"),
        body: cleanText(row.content, 900),
        tags: [...coerceTags(row.ai_tags), ...coerceTags(row.manual_tags)],
        subtitle: "Idea",
      }),
    );
  }

  for (const row of (projectsRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "project",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.name, "Project"),
        body: cleanText(row.description, 900),
        tags: coerceTags(row.tags),
        subtitle: typeof row.status === "string" ? row.status : "Project",
      }),
    );
  }

  for (const row of (goalsRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "goal",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.name, "Goal"),
        body: cleanText(row.description, 900),
        tags: typeof row.category === "string" ? [row.category] : [],
        subtitle: typeof row.status === "string" ? row.status : "Goal",
      }),
    );
  }

  for (const row of (tasksRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "task",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.title, "Task"),
        body: cleanText(row.description, 700),
        tags: coerceTags(row.tags),
        subtitle: typeof row.status === "string" ? row.status : "Task",
      }),
    );
  }

  for (const row of (knowledgeRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "knowledge",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.title, "Knowledge"),
        body: [row.ai_summary, row.ai_tldr, cleanText(row.raw_content, 700)]
          .map((v) => cleanText(v, 700))
          .filter(Boolean)
          .join(" "),
        tags: [...coerceTags(row.ai_tags), ...coerceTags(row.manual_tags)],
        subtitle: typeof row.category === "string" ? row.category : "Knowledge",
        url: typeof row.source_url === "string" ? row.source_url : undefined,
      }),
    );
  }

  for (const row of (projectResourcesRes.data ?? []) as Record<string, unknown>[]) {
    const id = String(row.id ?? "");
    push(
      makeCandidate({
        scope: "resource",
        id: `project_resource:${id}`,
        dbId: id,
        title: cleanTitle(row.title, "Resource"),
        body: cleanText(row.description, 700),
        tags: typeof row.category === "string" ? [row.category] : [],
        subtitle: typeof row.category === "string" ? row.category : "Project resource",
        url: typeof row.url === "string" ? row.url : undefined,
        resourceKind: "project_resource",
        source: typeof row.source === "string" ? row.source : undefined,
      }),
    );
  }

  for (const row of (assetsRes.data ?? []) as Record<string, unknown>[]) {
    const id = String(row.id ?? "");
    push(
      makeCandidate({
        scope: "resource",
        id: `asset:${id}`,
        dbId: id,
        title: cleanTitle(row.name, "Asset"),
        body: [row.notes, row.location].map((v) => cleanText(v, 500)).filter(Boolean).join(" "),
        tags: [row.category, row.category_key].filter((v): v is string => typeof v === "string"),
        subtitle: "Asset",
        resourceKind: "asset",
      }),
    );
  }

  for (const row of (documentsRes.data ?? []) as Record<string, unknown>[]) {
    const id = String(row.id ?? "");
    push(
      makeCandidate({
        scope: "resource",
        id: `document:${id}`,
        dbId: id,
        title: cleanTitle(row.name, "Document"),
        body: cleanText(row.notes, 700),
        tags: typeof row.document_type === "string" ? [row.document_type] : [],
        subtitle: "Document",
        resourceKind: "document",
      }),
    );
  }

  for (const row of (softwareRes.data ?? []) as Record<string, unknown>[]) {
    const id = String(row.id ?? "");
    push(
      makeCandidate({
        scope: "resource",
        id: `software_vault:${id}`,
        dbId: id,
        title: cleanTitle(row.app_name, "Software"),
        body: [row.summary, row.use_cases, row.why_i_use_it]
          .map((v) => cleanText(v, 500))
          .filter(Boolean)
          .join(" "),
        tags: [cleanText(row.category, 80), ...cleanText(row.tags, 200).split(/[,#\s]+/u)].filter(Boolean),
        subtitle: "Software",
        url: typeof row.website_url === "string" ? row.website_url : undefined,
        resourceKind: "software_vault",
      }),
    );
  }

  for (const row of (bucketRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "bucket",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(row.title, "Bucket list item"),
        body: [row.description, row.why_this_matters].map((v) => cleanText(v, 600)).filter(Boolean).join(" "),
        tags: coerceTags(row.category_tags),
        subtitle: typeof row.type === "string" ? row.type : "Bucket list",
      }),
    );
  }

  for (const row of (careerRes.data ?? []) as Record<string, unknown>[]) {
    push(
      makeCandidate({
        scope: "career",
        id: String(row.id ?? ""),
        dbId: String(row.id ?? ""),
        title: cleanTitle(
          [row.role_title, row.company_name].filter(Boolean).join(" · ") || row.company_name,
          "Career opportunity",
        ),
        body: [row.job_description, row.notes, row.location]
          .map((v) => cleanText(v, 600))
          .filter(Boolean)
          .join(" "),
        tags: typeof row.stage === "string" ? [row.stage] : [],
        subtitle: typeof row.stage === "string" ? row.stage : "Career",
        url: typeof row.job_url === "string" ? row.job_url : undefined,
      }),
    );
  }

  const selected = selectCandidates(plain, candidates);
  const candidateByKey = new Map(selected.map((candidate) => [candidateKey(candidate.scope, candidate.id), candidate]));
  const apiKey = getGeminiServerApiKey() ?? null;
  let analysis = fallbackAnalysis(idea, plain, selected);

  if (apiKey && selected.length > 0) {
    const candidateBlock = selected
      .map((candidate) =>
        JSON.stringify({
          scope: candidate.scope,
          id: candidate.id,
          title: candidate.title,
          subtitle: candidate.subtitle,
          tags: candidate.tags.slice(0, 8),
          notes: candidate.body.slice(0, 620),
          url: candidate.url,
        }),
      )
      .join("\n");

    try {
      const { text, modelUsed } = await fetchGeminiPlannerJsonText({
        apiKey,
        systemInstruction: `You are organizing a personal Life OS idea library. You GENERALIZE ideas into clean knowledge objects — you never copy the user's sentences back.

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "summary": string,
  "coreInsight": string,
  "suggestedNextStep": string,
  "possibleUse": string,
  "clarifyingQuestion": string,
  "ai_tags": string[],
  "category": ${JSON.stringify(IDEA_CATEGORIES)},
  "captureKind": "idea" | "task" | "note" | "goal",
  "related": [{ "scope": "idea" | "project" | "goal" | "resource" | "task" | "knowledge" | "bucket" | "career", "id": string, "percentage": number, "explanation": string }],
  "cardVisualPrompt": string,
  "cardVisualPalette": string[]
}

LANGUAGE: Match the idea's dominant language/script. Traditional Chinese / Cantonese input MUST produce natural Traditional Chinese output (avoid mainland corporate wording). English input produces English output.

title — a GENERALIZED noun phrase revealing the category/concept. NOT the first sentence. No trailing punctuation, no quotes, no markdown. Max 10 Chinese characters OR 8 English words.
  GOOD: "美國品牌構想", "日本家庭旅行", "報名資料核對", "US Brand Idea", "D Festival Ops".
  BAD (copies the sentence): "今日要去行山", "今日去野餐".

summary — 2–4 sentences synthesizing the idea at a useful abstraction. Do NOT copy or lightly rephrase the user's text. Max 120 Chinese characters OR 80 English words.

ai_tags — 4-8 SHORT semantic keywords, NOT sentences. No punctuation, no #, no duplicates. Chinese: 2-6 characters (proper nouns like 新幹線 ok). English: 1-3 words.
  For "今日諗到去日本旅行，帶阿爸阿媽去賞櫻，由東京搭新幹線去日本" GOOD tags: ["日本","東京","旅行","家庭","新幹線"]. NEVER ["今日諗到去日本旅行", ...].

AI suggestions — these MUST add value and MUST NOT repeat the content:
  coreInsight: one short sentence on what the idea is really about (a level of abstraction above the text).
  suggestedNextStep: one concrete action the user can take.
  possibleUse: how this idea connects to modules of My Best Life OS (Products, Projects, Goals, Knowledge, etc.).
  clarifyingQuestion: one useful follow-up question — or empty string "" if nothing helpful.
  Never restate the content. No motivational filler ("this is an interesting idea"). Be direct.

category — choose exactly one allowed value.

related — choose ONLY from the candidates provided below, using the candidate id EXACTLY. Pick genuinely useful matches across Ideas, Projects, Goals, Resources, Tasks, Knowledge, Bucket list, and Career when present.
  percentage: semantic closeness 0-100. Include only items >= 45.
  explanation: one SPECIFIC reason naming the shared topic/intent (e.g. "Both target US-market DTC validation"), never generic boilerplate.

cardVisualPrompt — ONE paragraph describing the dominant minimalist SILHOUETTE a stranger would associate with THIS idea in 2 seconds. Name concrete anchors, not vague mood.
  REQUIRED: primarySymbol (the main silhouette), optional seasonTimeCue, optional avoidSymbols.
  If a country/location is explicit, include at least one place-specific visual anchor.
  For Japan topics, prefer combinations like Mt Fuji / torii / Tokyo tower / red-sun circle (Japanese flag motif) + topic object.
  GOOD (Japan in August): "Mount Fuji + vermilion torii gate + subtle red-sun circle; warm golden August humid sky; optional shinkansen curve; avoid generic lanterns/fireworks unless matsuri is in the idea."
  GOOD (Tokyo food trip): "sushi/ramen silhouette foreground + Mt Fuji or torii background + red-sun circle accent."
  GOOD (dinner party): "warm table glow with single plate silhouette; amber restaurant lighting."
  BAD: "peaceful gradient with abstract shapes" or "festival lanterns" when the idea never mentions a festival.
  No text/letters in the image.
cardVisualPalette — 3-5 distinct hex colors for the gradient (must match the idea mood and season).

Output JSON only, no fences, no preamble.`,
        userText: `IDEA:
Title: ${idea.title ?? "(none)"}
Content: ${plain.slice(0, 6000)}

CANDIDATES (one JSON object per line):
${candidateBlock || "(none)"}`,
      });

      const parsed = parseJsonObject(text);
      if (parsed) {
        const related = coerceRelated(parsed.related, candidateByKey);
        const insight = cleanText(parsed.coreInsight, 280);
        const summaryRaw = clampIdeaSummary(cleanText(parsed.summary, 520));
        const aiSummary =
          summaryRaw && !isSuggestionTooSimilar(summaryRaw, plain, 0.72)
            ? summaryRaw
            : insight && !isSuggestionTooSimilar(insight, plain, 0.72)
              ? insight
              : analysis.summary;
        analysis = {
          title: clampIdeaTitle(cleanTitle(parsed.title, analysis.title)),
          summary: aiSummary,
          // Drop a Core Insight that just echoes the content.
          coreInsight: insight && !isSuggestionTooSimilar(insight, plain) ? insight : "",
          suggestedNextStep: cleanText(parsed.suggestedNextStep, 280),
          possibleUse: cleanText(parsed.possibleUse, 280),
          clarifyingQuestion: cleanText(parsed.clarifyingQuestion, 280),
          aiTags: normalizeIdeaTags(parsed.ai_tags),
          category: isCategory(parsed.category) ? parsed.category : analysis.category,
          captureKind: coerceCaptureKind(parsed.captureKind, idea.capture_kind),
          related: related.length > 0 ? related : analysis.related,
          cardVisualPrompt: cleanText(parsed.cardVisualPrompt, 1800),
          cardVisualPalette: coercePalette(parsed.cardVisualPalette),
          model: modelUsed,
        };
      }
    } catch (err) {
      console.warn("[ideas/auto-enrich] gemini_text", err instanceof Error ? err.message : String(err));
    }
  }

  if (analysis.aiTags.length === 0) {
    analysis.aiTags = fallbackAnalysis(idea, plain, selected).aiTags;
  }
  if (analysis.cardVisualPalette.length === 0) {
    analysis.cardVisualPalette = ["#22c55e", "#38bdf8", "#f97316"];
  }

  const existingSuggestions = ideaAiSuggestions(idea);
  const cardVisual = await maybeGenerateCardVisual({
    supabase,
    apiKey,
    userId: user.id,
    ideaId: idea.id,
    includeVisual,
    analysis,
    ideaPlainContent: plain,
    existing: existingSuggestions.cardVisual,
  });

  const aiSuggestions: IdeaAiSuggestions = {
    ...existingSuggestions,
    summary: analysis.summary || existingSuggestions.summary,
    coreInsight: analysis.coreInsight || existingSuggestions.coreInsight,
    suggestedNextStep: analysis.suggestedNextStep || existingSuggestions.suggestedNextStep,
    possibleUse: analysis.possibleUse || existingSuggestions.possibleUse,
    clarifyingQuestion: analysis.clarifyingQuestion || existingSuggestions.clarifyingQuestion,
    ai_tags: analysis.aiTags,
    relatedResources: analysis.related,
    cardVisual,
    generatedAt: new Date().toISOString(),
    model: analysis.model,
  };

  const linkedProjects = analysis.related.filter((r) => r.scope === "project").map((r) => r.id);
  const linkedTasks = analysis.related.filter((r) => r.scope === "task").map((r) => r.id);
  const linkedGoals = analysis.related.filter((r) => r.scope === "goal").map((r) => r.id);
  const linkedKnowledge = analysis.related.filter((r) => r.scope === "knowledge").map((r) => r.id);
  const linkedIdeas = analysis.related.filter((r) => r.scope === "idea").map((r) => r.id);

  const updatePayload: Record<string, unknown> = {
    title: shouldReplaceTitle(idea) ? analysis.title : idea.title,
    ai_tags: analysis.aiTags,
    manual_tags: [],
    ai_suggestions: aiSuggestions as unknown as Json,
    category: idea.category === "random" ? analysis.category : idea.category,
    capture_kind: idea.capture_kind === "idea" ? analysis.captureKind : idea.capture_kind,
    linked_project_ids: mergeIds(idea.linked_project_ids, linkedProjects),
    linked_task_ids: mergeIds(idea.linked_task_ids, linkedTasks),
    linked_goal_ids: mergeIds(idea.linked_goal_ids, linkedGoals),
    linked_knowledge_item_ids: mergeIds(idea.linked_knowledge_item_ids, linkedKnowledge),
    linked_idea_ids: mergeIds(idea.linked_idea_ids, linkedIdeas),
    related_resource_refs: resourceRefs(analysis.related),
    processing_step: apiKey ? "ai-enriched" : "ai-enriched-fallback",
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("ideas")
    .update(updatePayload)
    .eq("id", idea.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError || !updated) {
    const detail = updateError?.message ?? "Failed to update idea";
    console.error("[ideas/auto-enrich] update", detail);
    return NextResponse.json({ error: "update_failed", detail }, { status: 502 });
  }

  return NextResponse.json({ idea: normalizeIdea(updated), relatedCount: analysis.related.length });
}
