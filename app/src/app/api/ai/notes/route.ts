import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { getLlmResponseLanguageDirective } from "@/lib/ai/llm-response-locale";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import {
  NOTE_AI_MODES,
  NoteAskAiSchema,
  NoteAskGeminiSchema,
  NoteCaptureAiSchema,
  NoteCaptureGeminiSchema,
  NoteConnectAiSchema,
  NoteConnectGeminiSchema,
  NoteExtractActionsAiSchema,
  NoteExtractActionsGeminiSchema,
  NoteMeetingRecapAiSchema,
  NoteMeetingRecapGeminiSchema,
  NoteOrganizeAiSchema,
  NoteOrganizeGeminiSchema,
  NoteResearchDistillAiSchema,
  NoteResearchDistillGeminiSchema,
  NoteRouteGeminiSchema,
  NoteRouteSuggestionSchema,
  NoteSummarizeAiSchema,
  NoteSummarizeGeminiSchema,
  type NoteAiMode,
} from "@/lib/ai/schemas/notes";
import {
  buildNoteAiPrompt,
  type NoteConnectionTarget,
} from "@/lib/ai/prompts/notes";
import {
  fallbackAsk,
  fallbackCapture,
  fallbackConnect,
  fallbackExtractActions,
  fallbackMeetingRecap,
  fallbackOrganize,
  fallbackResearchDistill,
  fallbackRoute,
  fallbackSummarize,
} from "@/lib/ai/notes-fallback";
import type { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

type NoteAiRequestBody = {
  mode?: string;
  locale?: string;
  language?: string;
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  question?: string;
  scope?: string;
  activeProjectId?: string | null;
  activeProjectName?: string | null;
};

const TODAY_FMT = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

async function generateStructured(
  apiKey: string,
  schema: z.ZodType<unknown>,
  geminiSchema: GeminiResponseSchema,
  system: string,
  user: string,
): Promise<Record<string, unknown>> {
  const { data } = await fetchGeminiStructured<unknown>({
    apiKey,
    model: getGeminiHabitsFlashModel(),
    systemInstruction: system,
    userText: user,
    responseSchema: geminiSchema,
    temperature: 0.35,
    maxOutputTokens: 3072,
  });
  return schema.parse(data) as Record<string, unknown>;
}

function logFail(mode: NoteAiMode, error: unknown) {
  console.warn("[notes-ai] Gemini failed; using fallback", {
    mode,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function safeTargets(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  noteId?: string,
): Promise<NoteConnectionTarget[]> {
  const targets: NoteConnectionTarget[] = [];

  type QueryResult<T> = { data: T[] | null; error: unknown };
  const read = async <T,>(query: PromiseLike<QueryResult<T>>) => {
    try {
      const { data, error } = await query;
      if (error) return [];
      return data ?? [];
    } catch {
      return [];
    }
  };

  const projects = await read<Record<string, unknown>>(
    supabase
      .from("projects")
      .select("id,name,status,description")
      .eq("user_id", userId)
      .limit(40),
  );
  for (const p of projects) {
    targets.push({
      targetType: "project",
      targetId: String(p.id ?? ""),
      targetTitle: String(p.name ?? "Untitled project"),
      context: [p.status, p.description].filter(Boolean).join(" "),
    });
  }

  const tasks = await read<Record<string, unknown>>(
    supabase
      .from("tasks")
      .select("id,title,status,priority,description")
      .eq("user_id", userId)
      .neq("status", "done")
      .limit(60),
  );
  for (const t of tasks) {
    targets.push({
      targetType: "task",
      targetId: String(t.id ?? ""),
      targetTitle: String(t.title ?? "Untitled task"),
      context: [t.status, t.priority, t.description].filter(Boolean).join(" "),
    });
  }

  const goals = await read<Record<string, unknown>>(
    supabase
      .from("goals")
      .select("id,name,status,description")
      .eq("user_id", userId)
      .limit(40),
  );
  for (const g of goals) {
    targets.push({
      targetType: "goal",
      targetId: String(g.id ?? ""),
      targetTitle: String(g.name ?? "Untitled goal"),
      context: [g.status, g.description].filter(Boolean).join(" "),
    });
  }

  const ideas = await read<Record<string, unknown>>(
    supabase
      .from("ideas")
      .select("id,title,content,category")
      .eq("user_id", userId)
      .limit(40),
  );
  for (const idea of ideas) {
    targets.push({
      targetType: "idea",
      targetId: String(idea.id ?? ""),
      targetTitle: String(idea.title ?? idea.content ?? "Untitled idea").slice(0, 140),
      context: String(idea.content ?? idea.category ?? "").slice(0, 220),
    });
  }

  let notesQuery = supabase
    .from("notes")
    .select("id,title,content,category")
    .eq("user_id", userId)
    .limit(40);
  if (noteId) notesQuery = notesQuery.neq("id", noteId);
  const notes = await read<Record<string, unknown>>(notesQuery);
  for (const note of notes) {
    targets.push({
      targetType: "note",
      targetId: String(note.id ?? ""),
      targetTitle: String(note.title ?? "Untitled note"),
      context: String(note.content ?? note.category ?? "").slice(0, 220),
    });
  }

  return targets.filter((target) => target.targetId && target.targetTitle);
}

function fallbackFor(mode: NoteAiMode, body: NoteAiRequestBody, locale: ReturnType<typeof parseAppLocale>, targets: NoteConnectionTarget[]) {
  const noteContent = String(body.noteContent ?? "");
  switch (mode) {
    case "capture":
      return fallbackCapture(noteContent, locale, body.noteTitle);
    case "route":
      return fallbackRoute(noteContent, locale);
    case "summarize":
      return fallbackSummarize(noteContent, locale);
    case "extract-actions":
      return fallbackExtractActions(noteContent, locale);
    case "organize":
      return fallbackOrganize(noteContent, locale, body.noteTitle);
    case "connect":
      return fallbackConnect(noteContent, targets);
    case "meeting-recap":
      return fallbackMeetingRecap(noteContent, locale);
    case "research-distill":
      return fallbackResearchDistill(noteContent, locale);
    case "ask":
      return fallbackAsk(noteContent, String(body.question ?? ""), locale);
  }
}

const schemaByMode = {
  capture: [NoteCaptureAiSchema, NoteCaptureGeminiSchema],
  route: [NoteRouteSuggestionSchema, NoteRouteGeminiSchema],
  summarize: [NoteSummarizeAiSchema, NoteSummarizeGeminiSchema],
  "extract-actions": [NoteExtractActionsAiSchema, NoteExtractActionsGeminiSchema],
  organize: [NoteOrganizeAiSchema, NoteOrganizeGeminiSchema],
  connect: [NoteConnectAiSchema, NoteConnectGeminiSchema],
  "meeting-recap": [NoteMeetingRecapAiSchema, NoteMeetingRecapGeminiSchema],
  "research-distill": [NoteResearchDistillAiSchema, NoteResearchDistillGeminiSchema],
  ask: [NoteAskAiSchema, NoteAskGeminiSchema],
} satisfies Record<NoteAiMode, readonly [z.ZodType<unknown>, GeminiResponseSchema]>;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: NoteAiRequestBody;
  try {
    body = (await request.json()) as NoteAiRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode as NoteAiMode | undefined;
  if (!mode || !(NOTE_AI_MODES as readonly string[]).includes(mode)) {
    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  }

  const noteContent = String(body.noteContent ?? "").trim();
  if (!noteContent) {
    return NextResponse.json({ error: "noteContent required" }, { status: 400 });
  }
  if (mode === "ask" && !String(body.question ?? "").trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const locale = parseAppLocale(body.locale ?? body.language);
  const languageRule = getLlmResponseLanguageDirective(locale);
  const today = TODAY_FMT(new Date());
  const apiKey = getGeminiServerApiKey();
  const targets = mode === "connect" ? await safeTargets(supabase, user.id, body.noteId) : [];

  if (!apiKey) {
    return NextResponse.json({
      ...fallbackFor(mode, body, locale, targets),
      source: "fallback" as const,
    });
  }

  try {
    const { system, user: userMsg } = buildNoteAiPrompt({
      mode,
      noteTitle: body.noteTitle,
      noteContent,
      question: body.question,
      scope: body.scope,
      today,
      languageRule,
      activeProjectName: body.activeProjectName ?? undefined,
      connectionTargets: targets,
    });
    const [schema, geminiSchema] = schemaByMode[mode];
    const result = await generateStructured(
      apiKey,
      schema,
      geminiSchema,
      system,
      userMsg,
    );
    return NextResponse.json({ ...result, source: "gemini" as const });
  } catch (error) {
    logFail(mode, error);
    return NextResponse.json({
      ...fallbackFor(mode, body, locale, targets),
      source: "fallback" as const,
    });
  }
}
