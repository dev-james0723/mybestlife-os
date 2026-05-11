import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale, type AppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  getFallbackPlannerQuestions,
  inferFallbackBlocks,
  normalizeQuestions,
} from "@/lib/ai/planner-task-fallback";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import type {
  PlannerAiClarification,
  PlannerAiQuestion,
  PlannerAiRelatedItem,
  PlannerAiRequestBody,
  PlannerAiResourceType,
  PlannerAiWebResource,
} from "@/lib/ai/planner-task-types";
import {
  isUrlReachable,
  searchDuckDuckGo,
  type SearchHit,
} from "@/lib/search/duckduckgo-html";

export const runtime = "nodejs";

const MAX_TITLE = 240;
const MAX_RELATED = 5;

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no_json_object");
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

function parseQuestionsPayload(data: unknown): PlannerAiQuestion[] {
  if (!data || typeof data !== "object") return [];
  const questions = (data as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) return [];
  const out: PlannerAiQuestion[] = [];
  for (let i = 0; i < questions.length; i++) {
    const item = questions[i];
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const idRaw = o.id;
    const id =
      typeof idRaw === "string" && idRaw.trim()
        ? idRaw.trim()
        : typeof idRaw === "number" && Number.isFinite(idRaw)
          ? `q${idRaw}`
          : `q${i + 1}`;
    const question =
      typeof o.question === "string"
        ? o.question
        : typeof o.question_text === "string"
          ? o.question_text
          : "";
    const rawOpts = o.options;
    const options: string[] = [];
    if (Array.isArray(rawOpts)) {
      for (const x of rawOpts) {
        if (typeof x === "string") options.push(x);
        else if (x && typeof x === "object") {
          const lab = (x as { label?: unknown; text?: unknown }).label;
          const tx = (x as { label?: unknown; text?: unknown }).text;
          if (typeof lab === "string") options.push(lab);
          else if (typeof tx === "string") options.push(tx);
        }
      }
    }
    out.push({ id, question, options });
  }
  return out;
}

function parseBlocksPayload(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const n = (data as { suggestedBlocks?: unknown }).suggestedBlocks;
  if (typeof n === "number" && Number.isFinite(n)) return Math.round(n);
  if (typeof n === "string" && /^\d+$/.test(n.trim())) return Math.round(Number(n.trim()));
  return null;
}

async function geminiPlannerJson(system: string, user: string): Promise<string> {
  const key = getGeminiServerApiKey();
  if (!key) throw new Error("missing_gemini_key");

  const { text } = await fetchGeminiPlannerJsonText({
    apiKey: key,
    systemInstruction: system,
    userText: user,
  });
  return text;
}

function parseClarifications(raw: unknown): PlannerAiClarification[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is PlannerAiClarification =>
        !!c &&
        typeof c === "object" &&
        typeof (c as PlannerAiClarification).questionId === "string" &&
        typeof (c as PlannerAiClarification).question === "string" &&
        typeof (c as PlannerAiClarification).answer === "string",
    )
    .map((c) => ({
      questionId: c.questionId.slice(0, 64),
      question: c.question.slice(0, 500),
      answer: c.answer.slice(0, 500),
    }));
}

type MetadataDraft = {
  description: string;
  reminders: string[];
  suggestedBlocks: number;
  suggestedPriority: "low" | "medium" | "high" | "urgent";
  suggestedStatus?: "todo" | "in-progress" | "done" | "cancelled";
  suggestedDueDate?: string;
  searchQueries: string[];
};

function normalizePriority(raw: unknown): MetadataDraft["suggestedPriority"] {
  const p = String(raw ?? "").trim().toLowerCase();
  if (p === "urgent") return "urgent";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "medium";
}

function normalizeSuggestedStatus(
  raw: unknown,
): MetadataDraft["suggestedStatus"] | undefined {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (s === "todo" || s === "in-progress" || s === "done" || s === "cancelled") {
    return s;
  }
  return undefined;
}

/** Returns YYYY-MM-DD or undefined if invalid / empty. */
function normalizeSuggestedDueDate(raw: unknown): string | undefined {
  const s = String(raw ?? "").trim();
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return s;
}

function parseMetadataDraft(
  parsed: unknown,
  taskTitle: string,
  _locale: AppLocale,
  fallbackBlocks: number,
): MetadataDraft {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const descriptionRaw =
    typeof obj.description === "string" ? obj.description.trim() : "";
  const remindersRaw = Array.isArray(obj.reminders)
    ? obj.reminders.filter((x): x is string => typeof x === "string")
    : [];

  const rawQueries = Array.isArray(obj.searchQueries) ? obj.searchQueries : [];
  const searchQueries: string[] = rawQueries
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .map((q) => q.trim())
    .slice(0, 6);

  const suggestedBlocks = parseBlocksPayload(parsed) ?? fallbackBlocks;
  const description =
    descriptionRaw ||
    `Plan and complete: ${taskTitle}.`;
  const reminders = remindersRaw
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const suggestedStatus = normalizeSuggestedStatus(obj.suggestedStatus);
  const suggestedDueDate = normalizeSuggestedDueDate(obj.suggestedDueDate);
  return {
    description,
    reminders: reminders.length > 0 ? reminders : ["Prepare before you start."],
    suggestedBlocks: Math.min(72, Math.max(1, Math.round(suggestedBlocks))),
    suggestedPriority: normalizePriority(obj.suggestedPriority),
    ...(suggestedStatus ? { suggestedStatus } : {}),
    ...(suggestedDueDate ? { suggestedDueDate } : {}),
    searchQueries,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function scoreMatch(tokens: string[], haystack: string): number {
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const count = (lower.match(re) ?? []).length;
    score += count;
  }
  return score;
}

/** CJK / Hangul runs: word-boundary scoring misses these; substring boost fixes related-data ranking. */
function extractScriptPhrases(text: string, maxPerMatch = 10): string[] {
  const matches = text
    .toLowerCase()
    .match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]{2,24}/g);
  if (!matches) return [];
  const out = new Set<string>();
  for (const m of matches) {
    out.add(m.slice(0, maxPerMatch));
    if (m.length > 6) out.add(m.slice(0, 6));
  }
  return [...out];
}

function scriptPhraseBoost(phrases: string[], haystack: string): number {
  if (phrases.length === 0) return 0;
  const lower = haystack.toLowerCase();
  let score = 0;
  for (const p of phrases) {
    if (p.length >= 2 && lower.includes(p)) score += 4;
  }
  return score;
}

function resourceRelevanceScore(context: string, hit: SearchHit): number {
  const blob = `${hit.title} ${hit.snippet}`.toLowerCase();
  const ctx = context.toLowerCase();
  let score = scriptPhraseBoost(extractScriptPhrases(ctx, 12), blob);
  for (const t of tokenize(ctx)) {
    if (t.length < 3) continue;
    if (blob.includes(t)) score += 2;
  }
  return score;
}

function scoreItems<T extends Record<string, unknown>>(
  items: T[],
  textTokens: string[],
  buildLabel: (item: T) => string,
  buildHaystack: (item: T) => string,
  scriptPhrases: string[] = [],
): PlannerAiRelatedItem[] {
  const scored = items.map((item) => {
    const hay = buildHaystack(item);
    const score =
      scoreMatch(textTokens, hay) + scriptPhraseBoost(scriptPhrases, hay);
    const id = String(item.id ?? "");
    const label = buildLabel(item).trim() || id;
    return { id, label, score };
  });
  const positive = scored
    .filter((x) => x.id && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RELATED);
  if (positive.length > 0) return positive;
  return scored.filter((x) => x.id).slice(0, Math.min(3, MAX_RELATED));
}

function resourceTypeFromUrl(url: string): PlannerAiResourceType {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (
    u.includes("spotify.com/episode") ||
    u.includes("spotify.com/show") ||
    u.includes("podcasts.apple.com") ||
    u.includes("podcast") ||
    u.includes("anchor.fm") ||
    u.includes("podbean.com") ||
    u.includes("overcast.fm") ||
    u.includes("castbox.fm") ||
    u.includes("pocketcasts.com")
  ) {
    return "Podcast";
  }
  if (
    u.includes("amazon.") ||
    u.includes("etsy.") ||
    u.includes("ebay.") ||
    u.includes("aliexpress.") ||
    u.includes("shopify.") ||
    u.includes("/shop") ||
    u.includes("/product")
  ) {
    return "Shopping";
  }
  return "Article";
}

function sourceFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const mapping: Record<string, string> = {
      "youtube.com": "YouTube",
      "youtu.be": "YouTube",
      "medium.com": "Medium",
      "reddit.com": "Reddit",
      "old.reddit.com": "Reddit",
      "stackoverflow.com": "Stack Overflow",
      "github.com": "GitHub",
      "spotify.com": "Spotify",
      "podcasts.apple.com": "Apple Podcasts",
      "amazon.com": "Amazon",
      "nytimes.com": "NYT",
      "bbc.com": "BBC",
      "bbc.co.uk": "BBC",
      "forbes.com": "Forbes",
    };
    return mapping[host] ?? host;
  } catch {
    return "Web";
  }
}

function localizedResourceReason(locale: AppLocale): string {
  if (locale === "zh-TW") return "可協助你更快完成這個任務。";
  if (locale === "zh-CN") return "可帮助你更快完成这个任务。";
  if (locale === "ja") return "このタスクを進める際に役立ちます。";
  if (locale === "ko") return "이 작업을 더 빠르게 진행하는 데 도움이 됩니다.";
  if (locale === "fr") return "Peut vous aider à terminer cette tâche plus efficacement.";
  if (locale === "it") return "Può aiutarti a completare questa attività più velocemente.";
  if (locale === "es") return "Puede ayudarte a completar esta tarea con más eficacia.";
  if (locale === "vi") return "Có thể giúp bạn hoàn thành tác vụ này hiệu quả hơn.";
  return "Helpful for completing this task effectively.";
}

function buildResourceSignalText(params: {
  taskTitle: string;
  clarifications: PlannerAiClarification[];
  description: string;
  reminders: string[];
}): string {
  const parts: string[] = [params.taskTitle.trim()];
  for (const c of params.clarifications) {
    parts.push(`${c.question} ${c.answer}`);
  }
  const desc = params.description.trim();
  if (desc) parts.push(desc.slice(0, 400));
  for (const r of params.reminders) {
    const t = r.trim();
    if (t) parts.push(t.slice(0, 200));
  }
  return parts.filter(Boolean).join("\n").slice(0, 900);
}

function augmentQueryWithContext(rawQuery: string, anchor: string): string {
  const q = rawQuery.trim();
  const a = anchor.trim().slice(0, 120);
  if (!a) return q;
  if (!q) return a;
  const lower = q.toLowerCase();
  const anchorTok = tokenize(a).slice(0, 4);
  let missing = false;
  for (const t of anchorTok) {
    if (t.length < 3) continue;
    if (!lower.includes(t)) {
      missing = true;
      break;
    }
  }
  if (!missing) return q;
  return `${q} ${a}`.slice(0, 240);
}

function buildSearchQueries(
  signalText: string,
  aiQueries: string[],
): { query: string; targetType: PlannerAiResourceType }[] {
  const anchor = signalText.trim().slice(0, 200);
  const titleLine = signalText.trim().split(/\n/)[0] ?? signalText.trim();
  const queries: { query: string; targetType: PlannerAiResourceType }[] = [];

  if (aiQueries.length > 0) {
    for (const q of aiQueries.slice(0, 2)) {
      queries.push({
        query: augmentQueryWithContext(q, titleLine),
        targetType: "Article",
      });
    }
  } else {
    queries.push({
      query: `${anchor} how-to guide`.slice(0, 240),
      targetType: "Article",
    });
  }

  queries.push({
    query: `site:youtube.com ${titleLine}`.slice(0, 240),
    targetType: "YouTube",
  });
  queries.push({
    query: `${titleLine} podcast interview tutorial`.slice(0, 240),
    targetType: "Podcast",
  });

  if (aiQueries.length > 2) {
    queries.push({
      query: augmentQueryWithContext(aiQueries[2]!, titleLine),
      targetType: "Article",
    });
  } else {
    queries.push({
      query: `${anchor} preparation checklist`.slice(0, 240),
      targetType: "Article",
    });
  }

  return queries;
}

async function buildWebResources(params: {
  resourceSignal: string;
  locale: AppLocale;
  searchQueries: string[];
}): Promise<PlannerAiWebResource[]> {
  const searchPlan = buildSearchQueries(params.resourceSignal, params.searchQueries);

  const allHits: { hit: SearchHit; targetType: PlannerAiResourceType; relevance: number }[] =
    [];
  const searchResults = await Promise.allSettled(
    searchPlan.map(async ({ query, targetType }) => {
      const hits = await searchDuckDuckGo(query);
      return { hits, targetType, query };
    }),
  );

  const isDev = process.env.NODE_ENV !== "production";
  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      if (isDev) {
        console.log(
          `[resources] "${result.value.query}" → ${result.value.hits.length} hits`,
        );
      }
      for (const hit of result.value.hits) {
        allHits.push({
          hit,
          targetType: result.value.targetType,
          relevance: resourceRelevanceScore(params.resourceSignal, hit),
        });
      }
    } else if (isDev) {
      console.warn("[resources] search failed:", result.reason);
    }
  }

  allHits.sort((a, b) => b.relevance - a.relevance);

  const seen = new Set<string>();
  const candidates: PlannerAiWebResource[] = [];
  const typeBuckets: Partial<Record<PlannerAiResourceType, number>> = {};

  for (const { hit, targetType } of allHits) {
    const domain = sourceFromUrl(hit.url).toLowerCase();
    if (seen.has(hit.url) || seen.has(domain + hit.title)) continue;
    if (/duckduckgo\.com/i.test(hit.url)) continue;

    seen.add(hit.url);
    seen.add(domain + hit.title);

    const detectedType = resourceTypeFromUrl(hit.url);
    const type =
      detectedType !== "Article" ? detectedType : targetType === "Article" ? "Article" : targetType;
    const currentCount = typeBuckets[type] ?? 0;
    if (currentCount >= 3) continue;

    candidates.push({
      type,
      title: hit.title,
      url: hit.url,
      description:
        hit.snippet || localizedResourceReason(params.locale),
      source: sourceFromUrl(hit.url),
    });
    typeBuckets[type] = currentCount + 1;
    if (candidates.length >= 10) break;
  }

  const validationResults = await Promise.allSettled(
    candidates.map(async (r) => {
      const ok = await isUrlReachable(r.url);
      return { resource: r, ok };
    }),
  );

  const validated: PlannerAiWebResource[] = [];
  for (const result of validationResults) {
    if (result.status === "fulfilled") {
      if (result.value.ok) {
        validated.push(result.value.resource);
        if (validated.length >= 6) break;
      } else if (isDev) {
        console.log(`[resources] HEAD failed: ${result.value.resource.url}`);
      }
    }
  }

  if (isDev) {
    console.log(
      `[resources] ${candidates.length} candidates → ${validated.length} validated`,
    );
  }

  if (validated.length === 0) {
    return candidates.slice(0, 5);
  }
  return validated;
}

async function findRelatedData(params: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  taskTitle: string;
  clarifications: PlannerAiClarification[];
  description?: string;
  reminders?: string[];
}) {
  const signalText = buildResourceSignalText({
    taskTitle: params.taskTitle,
    clarifications: params.clarifications,
    description: params.description ?? "",
    reminders: params.reminders ?? [],
  });
  const tokens = tokenize(signalText);
  const scriptPhrases = extractScriptPhrases(signalText, 12);

  const [projectsRes, notesRes, knowledgeRes, ideasRes] = await Promise.all([
    params.supabase
      .from("projects")
      .select("id, name, description, tags, updated_at")
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false })
      .limit(120),
    params.supabase
      .from("notes")
      .select("id, title, content, tags, updated_at")
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false })
      .limit(120),
    params.supabase
      .from("knowledge_entries")
      .select("id, title, content, tags, updated_at")
      .eq("user_id", params.userId)
      .order("updated_at", { ascending: false })
      .limit(120),
    params.supabase
      .from("ideas")
      .select("id, content, created_at")
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const projects = scoreItems(
    (projectsRes.data ?? []) as Record<string, unknown>[],
    tokens,
    (p) => String(p.name ?? "Untitled project"),
    (p) =>
      `${String(p.name ?? "")} ${String(p.description ?? "")} ${Array.isArray(p.tags) ? p.tags.join(" ") : ""}`,
    scriptPhrases,
  );
  const notes = scoreItems(
    (notesRes.data ?? []) as Record<string, unknown>[],
    tokens,
    (n) => String(n.title ?? "Untitled note"),
    (n) =>
      `${String(n.title ?? "")} ${String(n.content ?? "")} ${Array.isArray(n.tags) ? n.tags.join(" ") : ""}`,
    scriptPhrases,
  );
  const ideas = scoreItems(
    (ideasRes.data ?? []) as Record<string, unknown>[],
    tokens,
    (i) => String(i.content ?? "").slice(0, 80) || "Idea",
    (i) => String(i.content ?? ""),
    scriptPhrases,
  );

  const knowledge = scoreItems(
    (knowledgeRes.data ?? []) as Record<string, unknown>[],
    tokens,
    (k) => String(k.title ?? "Knowledge"),
    (k) =>
      `${String(k.title ?? "")} ${String(k.content ?? "")} ${Array.isArray(k.tags) ? k.tags.join(" ") : ""}`,
    scriptPhrases,
  );

  return { projects, notes, knowledge, ideas };
}

function fallbackDescription(locale: AppLocale, title: string): string {
  if (locale === "zh-TW") return `這項任務：${title}。先確認目標、時間與所需準備，再安排執行。`;
  if (locale === "zh-CN") return `这项任务：${title}。先确认目标、时间与准备事项，再安排执行。`;
  if (locale === "ja") return `このタスク（${title}）の目的・時間・準備事項を整理して進めましょう。`;
  if (locale === "ko") return `이 작업(${title})의 목적, 시간, 준비 사항을 정리해 진행하세요.`;
  if (locale === "fr") return `Cette tâche (${title}) demande de clarifier l'objectif, le temps et la préparation.`;
  if (locale === "it") return `Per questa attività (${title}), chiarisci obiettivo, durata e preparazione prima di iniziare.`;
  if (locale === "es") return `Para esta tarea (${title}), aclara objetivo, duración y preparación antes de empezar.`;
  if (locale === "vi") return `Với nhiệm vụ này (${title}), hãy làm rõ mục tiêu, thời lượng và phần chuẩn bị trước khi bắt đầu.`;
  return `This task involves: ${title}. Clarify the goal, timing, and prep items before execution.`;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PlannerAiRequestBody;
  try {
    body = (await request.json()) as PlannerAiRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locale = parseAppLocale(body.locale);
  const languageRule = getLlmResponseLanguageDirective(locale);

  if (!body.taskTitle || typeof body.taskTitle !== "string") {
    return NextResponse.json({ error: "taskTitle required" }, { status: 400 });
  }
  const taskTitle = body.taskTitle.trim().slice(0, MAX_TITLE);
  if (!taskTitle) {
    return NextResponse.json({ error: "taskTitle empty" }, { status: 400 });
  }

  if (body.mode === "questions") {
    const system = `You are a task clarification assistant for a daily planner. Each plan slot uses fixed-length time blocks (the user will tell you block length in a separate step if needed).

Language (critical): ${languageRule}
The task title may be in any language; still apply the language rule to every question and option you write.

Return ONLY valid JSON (no markdown) with this exact shape:
{"questions":[{"id":"q1","question":"string","options":["opt1","opt2","opt3"]}]}

Rules:
- Produce between 3 and 5 questions inclusive.
- Each question must have exactly 3 or 4 answer options (short phrases).
- Questions must be specific to the given task title (not generic boilerplate).
- Cover different dimensions where relevant: purpose, duration, people, location, constraints.
- Option strings must not include commas that break parsing; keep them concise.`;

    const userMsg = `The user is creating a new daily-planner task. Task title:
"""${taskTitle}"""

Analyze the title in depth (people's names, implied activity, social vs work, medium like call vs in-person).
- If a person's name appears (often after "with" / "和" / "與" / "同" etc.), you MUST include one question about who they are to the user (relationship, role, or how they know each other).
- Other questions should be practical for estimating time and context (purpose, duration, location or format, constraints).
- Every question and option must be specific to this title; do not output generic boilerplate that could apply to any task.`;

    try {
      const raw = await geminiPlannerJson(system, userMsg);
      const parsed = extractJsonObject(raw);
      const rawQs = parseQuestionsPayload(parsed);
      const questions = normalizeQuestions(rawQs, taskTitle, locale);
      return NextResponse.json({ questions, source: "gemini" as const });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[planner-task/questions] Gemini path failed:", e);
      }
      const questions = getFallbackPlannerQuestions(taskTitle, locale);
      return NextResponse.json({ questions, source: "fallback" as const });
    }
  }

  if (body.mode === "blocks") {
    const blockMinutes =
      typeof body.blockMinutes === "number" &&
      Number.isFinite(body.blockMinutes) &&
      body.blockMinutes >= 5 &&
      body.blockMinutes <= 60
        ? Math.round(body.blockMinutes)
        : 10;

    const clarifications = parseClarifications(body.clarifications);

    const system = `You estimate how many ${blockMinutes}-minute time blocks a user should reserve in their day planner for one task.

Language / context: ${languageRule}
The task title and clarifying answers follow the user's app language; interpret them in that language. Your JSON must contain only the numeric field suggestedBlocks (no other text fields).

Return ONLY valid JSON: {"suggestedBlocks": <positive integer>}

Constraints:
- suggestedBlocks must be between 1 and 72.
- Prefer realistic values from the task title and the user's clarifying answers.
- Each block is exactly ${blockMinutes} minutes (e.g. 6 blocks = ${6 * blockMinutes} minutes).`;

    const lines = clarifications
      .map((c) => `- (${c.questionId}) ${c.question} → ${c.answer}`)
      .join("\n");
    const userMsg = `Task title: ${taskTitle}\n\nClarifications:\n${lines || "(none — infer only from the title)"}`;

    try {
      const raw = await geminiPlannerJson(system, userMsg);
      const parsed = extractJsonObject(raw);
      let suggestedBlocks = parseBlocksPayload(parsed);
      if (suggestedBlocks == null || suggestedBlocks < 1) {
        throw new Error("invalid_blocks");
      }
      suggestedBlocks = Math.min(72, Math.max(1, suggestedBlocks));
      return NextResponse.json({ suggestedBlocks, source: "gemini" as const });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[planner-task/blocks] Gemini path failed:", e);
      }
      const suggestedBlocks = inferFallbackBlocks(
        taskTitle,
        clarifications,
        blockMinutes,
      );
      return NextResponse.json({ suggestedBlocks, source: "fallback" as const });
    }
  }

  if (body.mode === "metadata") {
    const blockMinutes =
      typeof body.blockMinutes === "number" &&
      Number.isFinite(body.blockMinutes) &&
      body.blockMinutes >= 5 &&
      body.blockMinutes <= 60
        ? Math.round(body.blockMinutes)
        : 10;
    const clarifications = parseClarifications(body.clarifications);
    const fallbackBlocks = inferFallbackBlocks(taskTitle, clarifications, blockMinutes);

    const system = `You are a task planning copilot for a daily planner.

Language (critical): ${languageRule}
All strings in your JSON must follow this language.

Return ONLY valid JSON with this exact shape:
{
  "description": "string",
  "reminders": ["string", "string", "string"],
  "suggestedBlocks": 6,
  "suggestedPriority": "low|medium|high|urgent",
  "suggestedStatus": "todo|in-progress|done|cancelled",
  "suggestedDueDate": "YYYY-MM-DD",
  "searchQueries": ["query 1", "query 2", "query 3"]
}

Rules:
- description: 1-2 sentences, specific and actionable for this exact task.
- reminders: 3-4 short practical reminders.
- suggestedBlocks: integer between 1 and 72 (each block is ${blockMinutes} minutes).
- suggestedPriority: one of low, medium, high, urgent.
- suggestedStatus: optional; best guess for workflow state (usually "todo" or "in-progress"). Omit if unsure.
- suggestedDueDate: optional ISO date YYYY-MM-DD only if the task clearly implies a deadline; otherwise use "".
- searchQueries: 3-5 short search-engine queries (use the same language as the task when it helps; English is fine for broad web search) that would find articles, guides, or tools **directly about this task** — same topic as the title, clarifications, and description. Each query must include concrete subject terms from the task (people, place, activity, instrument, deadline, etc.). Do NOT return generic travel, shopping, or unrelated lifestyle queries. Do NOT invent URLs — only return search query strings.`;

    const contextLines = clarifications
      .map((c) => `- ${c.question}: ${c.answer}`)
      .join("\n");
    const userMsg = `Task title: ${taskTitle}

Additional context:
${contextLines || "(none)"}

Make the output personalized to this task and context.`;

    try {
      const raw = await geminiPlannerJson(system, userMsg);
      const parsed = extractJsonObject(raw);
      const draft = parseMetadataDraft(parsed, taskTitle, locale, fallbackBlocks);
      const resourceSignal = buildResourceSignalText({
        taskTitle,
        clarifications,
        description: draft.description,
        reminders: draft.reminders,
      });
      const [related, webResources] = await Promise.all([
        findRelatedData({
          supabase,
          userId: user.id,
          taskTitle,
          clarifications,
          description: draft.description,
          reminders: draft.reminders,
        }),
        buildWebResources({
          resourceSignal,
          locale,
          searchQueries: draft.searchQueries,
        }),
      ]);

      return NextResponse.json({
        description: draft.description,
        reminders: draft.reminders,
        suggestedBlocks: draft.suggestedBlocks,
        suggestedPriority: draft.suggestedPriority,
        ...(draft.suggestedStatus ? { suggestedStatus: draft.suggestedStatus } : {}),
        ...(draft.suggestedDueDate ? { suggestedDueDate: draft.suggestedDueDate } : {}),
        relatedProjects: related.projects,
        relatedNotes: related.notes,
        relatedKnowledge: related.knowledge,
        relatedIdeas: related.ideas,
        webResources,
        source: "gemini" as const,
      });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[planner-task/metadata] Gemini path failed:", e);
      }
      const fbDesc = fallbackDescription(locale, taskTitle);
      const fbReminders = [
        locale === "zh-TW"
          ? "先確認任務目標與完成標準。"
          : locale === "zh-CN"
            ? "先确认任务目标与完成标准。"
            : "Clarify the goal and completion criteria first.",
        locale === "zh-TW"
          ? "把需要的準備事項提前列出。"
          : locale === "zh-CN"
            ? "把需要的准备事项提前列出。"
            : "List preparation items in advance.",
        locale === "zh-TW"
          ? "預留緩衝時間避免超時。"
          : locale === "zh-CN"
            ? "预留缓冲时间避免超时。"
            : "Leave a small time buffer to avoid overruns.",
      ];
      const resourceSignal = buildResourceSignalText({
        taskTitle,
        clarifications,
        description: fbDesc,
        reminders: fbReminders,
      });
      const related = await findRelatedData({
        supabase,
        userId: user.id,
        taskTitle,
        clarifications,
        description: fbDesc,
        reminders: fbReminders,
      });
      const webResources = await buildWebResources({
        resourceSignal,
        locale,
        searchQueries: [],
      });
      return NextResponse.json({
        description: fbDesc,
        reminders: fbReminders,
        suggestedBlocks: fallbackBlocks,
        suggestedPriority: "medium" as const,
        suggestedStatus: "todo" as const,
        relatedProjects: related.projects,
        relatedNotes: related.notes,
        relatedKnowledge: related.knowledge,
        relatedIdeas: related.ideas,
        webResources,
        source: "fallback" as const,
      });
    }
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}
