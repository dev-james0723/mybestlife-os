import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthedContext } from "@/app/api/ai/habits/_shared";
import { buildLocalAIAnalyticsInsight } from "@/lib/analytics/build-ai-analytics-context";
import type { AIAnalyticsContext, AnalyticsAudioOverview } from "@/lib/analytics/types";
import {
  getDocOracleAudioProvider,
  isAudioProviderConfigured,
} from "@/lib/ai/audio-summary";
import { pingVoxCpm } from "@/lib/ai/audio-providers/voxcpm";
import { synthesizeAppSpeech } from "@/lib/ai/app-tts";
import { fetchGeminiPlannerJsonText, getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";

export const runtime = "nodejs";
export const maxDuration = 180;

const pulseScoreSchema = z.object({
  key: z.enum([
    "completion_momentum",
    "focus_consistency",
    "emotional_load",
    "system_coherence",
  ]),
  label: z.string(),
  score: z.number(),
  trend: z.enum(["up", "down", "steady"]),
  trendValue: z.number(),
  trendLabel: z.string(),
  interpretation: z.string(),
  signal: z.string(),
  tone: z.enum(["positive", "watch", "neutral", "load"]),
});

const metricsSchema = z.object({
  range: z.object({
    key: z.string(),
    label: z.string(),
    startISO: z.string(),
    endISO: z.string(),
    days: z.number(),
  }),
  pulseScores: z.array(pulseScoreSchema),
  totals: z.object({
    completedTasks: z.number(),
    completedTasksPrevious: z.number(),
    plannedItems: z.number(),
    overdueTasks: z.number(),
    studyMinutes: z.number(),
    journalEntries: z.number(),
    activeProjects: z.number(),
    activeGoals: z.number(),
    linkedTaskRatio: z.number(),
    projectGoalLinkRatio: z.number(),
  }),
  projectMomentum: z.object({
    stateCounts: z.record(z.string(), z.number()),
    stuckProjects: z.number(),
    overloadedProjects: z.number(),
    movingProjects: z.number(),
  }),
  emotionExecution: z.object({
    hasJournalData: z.boolean(),
    hasExecutionData: z.boolean(),
    interpretation: z.string(),
  }),
  brainHealth: z.object({
    totalNodes: z.number(),
    totalEdges: z.number(),
    orphanRate: z.number(),
    orphanCount: z.number(),
    averageDegree: z.number(),
    isolatedDomains: z.array(z.string()),
    topConnectedDomains: z.array(
      z.object({
        domain: z.string(),
        nodes: z.number(),
        degree: z.number(),
      }),
    ),
    suggestedMissingConnections: z.array(z.string()),
    interpretation: z.string(),
    hasBrainData: z.boolean(),
  }),
  domainRadar: z.object({
    points: z.array(
      z.object({
        key: z.string(),
        domain: z.string(),
        score: z.number(),
        confidence: z.enum(["low", "medium", "high"]),
        signal: z.string(),
      }),
    ),
    interpretation: z.string(),
  }),
});

const requestSchema = z.object({
  metrics: metricsSchema,
  language: z.string().optional(),
  voiceGender: z.enum(["male", "female"]).optional().default("female"),
});

const chapterSchema = z.object({
  title: z.string(),
  text: z.string(),
});

const scriptSchema = z.object({
  title: z.string(),
  summary: z.string(),
  transcript: z.string(),
  actionItems: z.array(z.string()).min(1).max(7),
  chapters: z.array(chapterSchema).min(2).max(6),
  confidence: z.enum(["low", "medium", "high"]),
});

/** Keep TTS within route timeout; VoxCPM chunks ~900 chars on MPS. */
const MAX_TTS_TRANSCRIPT_CHARS = 3_200;

function normalizeChapter(raw: unknown): z.infer<typeof chapterSchema> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const title =
    typeof record.title === "string"
      ? record.title.trim()
      : typeof record.heading === "string"
        ? record.heading.trim()
        : "";
  const text =
    typeof record.text === "string"
      ? record.text.trim()
      : typeof record.content === "string"
        ? record.content.trim()
        : typeof record.body === "string"
          ? record.body.trim()
          : typeof record.summary === "string"
            ? record.summary.trim()
            : "";
  if (!title || !text) return null;
  return { title, text };
}

function normalizeActionItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 7);
}

function parseGeneratedScript(raw: unknown): z.infer<typeof scriptSchema> | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const chapters = Array.isArray(record.chapters)
    ? record.chapters.map(normalizeChapter).filter((chapter): chapter is z.infer<typeof chapterSchema> => chapter != null)
    : [];
  const actionItems = normalizeActionItems(record.actionItems);
  const candidate = {
    title: typeof record.title === "string" ? record.title.trim() : "",
    summary: typeof record.summary === "string" ? record.summary.trim() : "",
    transcript:
      typeof record.transcript === "string"
        ? record.transcript.trim()
        : typeof record.script === "string"
          ? record.script.trim()
          : "",
    actionItems: actionItems.length > 0 ? actionItems : ["Review the strongest signal and adjust one habit."],
    chapters: chapters.slice(0, 6),
    confidence:
      record.confidence === "low" || record.confidence === "medium" || record.confidence === "high"
        ? record.confidence
        : "medium",
  };

  if (candidate.chapters.length < 2 && candidate.transcript) {
    const parts = candidate.transcript.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
    candidate.chapters = parts.slice(0, 4).map((text, index) => ({
      title: `Section ${index + 1}`,
      text,
    }));
  }

  const parsed = scriptSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function estimateSecondsFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(45, Math.round((words / 135) * 60));
}

function ttsLanguageFromLocale(locale: string): "en" | "zh-Hant" | "auto" {
  if (locale.toLowerCase().startsWith("zh")) return "zh-Hant";
  if (locale.toLowerCase().startsWith("en")) return "en";
  return "auto";
}

function buildFallbackScript(metrics: AIAnalyticsContext): z.infer<typeof scriptSchema> {
  const insight = buildLocalAIAnalyticsInsight(metrics);
  const completion =
    metrics.pulseScores.find((score) => score.key === "completion_momentum")?.score ?? 0;
  const focus =
    metrics.pulseScores.find((score) => score.key === "focus_consistency")?.score ?? 0;
  const load =
    metrics.pulseScores.find((score) => score.key === "emotional_load")?.score ?? 0;
  const coherence =
    metrics.pulseScores.find((score) => score.key === "system_coherence")?.score ?? 0;

  const transcript = [
    `Life Pulse audio overview for ${metrics.range.label}.`,
    `Completion momentum ${completion}, focus ${focus}, emotional load ${load}, system coherence ${coherence}.`,
    insight.summary,
    `Progress: ${insight.progress[0] ?? "Limited movement in this range."}`,
    `Friction: ${insight.blindSpots[0] ?? "No clear blind spot from current data."}`,
    `Pattern: ${insight.hiddenPattern}`,
    `Next move: ${insight.nextBestMove}`,
    `Stop: ${insight.stopDoing}. Protect: ${insight.protect}.`,
  ].join(" ");

  return {
    title: `Life Pulse Audio Overview · ${metrics.range.label}`,
    summary: insight.summary,
    transcript,
    actionItems: [
      insight.nextBestMove,
      insight.stopDoing,
      insight.protect,
    ],
    chapters: [
      { title: "Current state", text: insight.summary },
      { title: "Progress", text: insight.progress[0] ?? "Progress is limited in this range." },
      {
        title: "Blind spot",
        text: insight.blindSpots[0] ?? "No major blind spot is obvious from current data.",
      },
      { title: "Intervention", text: insight.nextBestMove },
    ],
    confidence: insight.confidence,
  };
}

async function generateScript(metrics: AIAnalyticsContext, locale: string) {
  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return { script: buildFallbackScript(metrics), modelUsed: "local_analytics_generator" };
  }

  const targetLanguage = locale.toLowerCase().startsWith("zh")
    ? "Traditional Chinese with natural Hong Kong Cantonese phrasing"
    : "English";

  const systemInstruction = [
    "You generate a concise spoken audio overview for a personal Life OS analytics page.",
    "Use only the structured metrics provided. Do not invent raw database facts.",
    `Write in ${targetLanguage}.`,
    "Tone: direct, calm, emotionally aware, no motivational fluff, no shame language.",
    "Distinguish real progress from fake progress. Explain uncertainty when data is limited.",
    "The transcript should be 180 to 280 words for a single narrator (spoken in about 90 to 120 seconds).",
    "Return strict JSON: { title, summary, transcript, actionItems: string[], chapters: [{ title, text }] } with 2 to 4 chapters.",
  ].join("\n");

  const userText = JSON.stringify({ metrics }, null, 2);

  try {
    const generated = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction,
      userText,
    });
    const parsed = parseGeneratedScript(JSON.parse(generated.text) as unknown);
    if (parsed) {
      return { script: parsed, modelUsed: generated.modelUsed };
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[analytics/audio-overview] invalid script shape from Gemini");
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[analytics/audio-overview] script generation fell back:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  return { script: buildFallbackScript(metrics), modelUsed: "local_analytics_generator" };
}

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;

  const parsed = requestSchema.safeParse(auth.bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_analytics_audio_request", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!isAudioProviderConfigured()) {
    return NextResponse.json(
      {
        error: "audio_provider_not_configured",
        detail:
          "Configure VOXCPM_BASE_URL to generate audio.",
      },
      { status: 503 },
    );
  }

  const voxHealth = await pingVoxCpm();
  if (!voxHealth.ok) {
    return NextResponse.json(
      {
        error: "voxcpm_unreachable",
        detail:
          voxHealth.error ??
          "Start the VoxCPM sidecar with npm run dev:tts (see services/voxcpm-tts/README.md).",
      },
      { status: 503 },
    );
  }

  const metrics = parsed.data.metrics as unknown as AIAnalyticsContext;
  const locale = parsed.data.language ?? auth.ctx.language;

  // Step 1: transcript (Gemini or local fallback).
  const { script, modelUsed } = await generateScript(metrics, locale);
  const language = ttsLanguageFromLocale(locale);
  const ttsText = script.transcript.trim().slice(0, MAX_TTS_TRANSCRIPT_CHARS);
  if (!ttsText) {
    return NextResponse.json(
      { error: "audio_generation_failed", detail: "empty_transcript" },
      { status: 502 },
    );
  }

  // Step 2: VoxCPM synthesis via app TTS settings.
  let audioBytes: Buffer;
  let mimeType: string;
  let provider: string;
  let voiceName: string | undefined;

  try {
    const audio = await synthesizeAppSpeech({
      supabase: auth.ctx.supabase,
      userId: auth.ctx.userId,
      text: ttsText,
      language,
      voiceGender: parsed.data.voiceGender,
      format: "single_host",
      styleInstruction:
        "Life Pulse analytics narrator, direct and calm, emotionally aware, no motivational hype",
    });
    audioBytes = audio.audioBytes;
    mimeType = audio.mimeType;
    provider = audio.provider;
    voiceName = audio.voiceName;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[analytics/audio-overview] tts", message);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: message.slice(0, 220) },
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
  const storagePath = `${auth.ctx.userId}/analytics/audio-overviews/${metrics.range.key}-${objectId}.${ext}`;

  const { error: uploadError } = await auth.ctx.supabase.storage
    .from("knowledge-files")
    .upload(storagePath, audioBytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[analytics/audio-overview] storage", uploadError.message);
    return NextResponse.json(
      { error: "audio_generation_failed", detail: "storage_upload_failed" },
      { status: 502 },
    );
  }

  const response: AnalyticsAudioOverview & { modelUsed: string; audioProvider: string } = {
    title: script.title,
    summary: script.summary,
    transcript: script.transcript,
    actionItems: script.actionItems,
    chapters: script.chapters,
    audioUrl: knowledgeFilesProxyUrlFromStoragePath(storagePath),
    storagePath,
    provider: getDocOracleAudioProvider(),
    audioProvider: provider,
    voiceName,
    durationSeconds: estimateSecondsFromText(script.transcript),
    createdAt: new Date().toISOString(),
    modelUsed,
  };

  return NextResponse.json(response);
}
