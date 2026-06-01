/**
 * POST /api/bucket-list/analyze-dream
 *
 * Produces (and caches) a Dream Intelligence report: why it matters deeply,
 * the life chapter it belongs to, readiness, gentle blockers, the smallest
 * livable version, the next best step, and suggested connections.
 *
 * Cached in `bucket_dream_ai_reports` (one row per dream) — only regenerated
 * when `forceRefresh` is true. Readiness score is computed deterministically on
 * the server (shared with the client) so the persisted score matches the UI.
 * Suggested actions are previews; this route never creates cross-module records.
 *
 * Request body: { bucketItemId, forceRefresh?, locale? }
 * Response (200): { report: BucketDreamIntelligenceReport, cached: boolean }
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  assertBucketAiQuota,
  bucketAiError,
  getBucketAiKeyOrFail,
  recordBucketAiUsage,
  requireBucketAiContext,
} from "@/lib/ai/bucket-list/bucket-ai";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  computeDreamReadiness,
  readinessStatusFromScore,
} from "@/lib/bucket-list/readiness";
import {
  BUCKET_DREAM_ACTION_TYPES,
  BUCKET_DREAM_BLOCKER_TYPES,
  BUCKET_DREAM_READINESS_STATUSES,
  type BucketDreamIntelligenceReport,
  type BucketItem,
} from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Validation ──────────────────────────────────────────────────────────────
const ReportSchema = z.object({
  whyThisMattersDeeply: z.string().min(10).max(1200),
  identityChapter: z.string().min(2).max(300),
  emotionalMeaning: z.string().min(2).max(800),
  whyNow: z.string().max(800).optional().nullable(),
  dreamReadiness: z.object({
    score: z.number().min(0).max(100).optional(),
    status: z.enum(BUCKET_DREAM_READINESS_STATUSES).optional(),
    explanation: z.string().min(2).max(800),
    missingPieces: z.array(z.string().min(1).max(160)).max(12).optional(),
  }),
  blockers: z
    .array(
      z.object({
        title: z.string().min(2).max(120),
        type: z.enum(BUCKET_DREAM_BLOCKER_TYPES),
        explanation: z.string().min(2).max(600),
        suggestedAction: z.string().min(2).max(300),
      }),
    )
    .max(6)
    .optional(),
  smallestVersion: z.object({
    title: z.string().min(2).max(160),
    description: z.string().min(2).max(800),
    estimatedCost: z.number().nonnegative().optional().nullable(),
    timeRequired: z.string().max(120).optional().nullable(),
  }),
  nextBestStep: z.object({
    title: z.string().min(2).max(160),
    description: z.string().min(2).max(600),
    actionType: z.enum(BUCKET_DREAM_ACTION_TYPES).optional().nullable(),
  }),
  connections: z
    .object({
      projects: z.array(z.string().max(160)).max(8).optional(),
      tasks: z.array(z.string().max(160)).max(8).optional(),
      goals: z.array(z.string().max(160)).max(8).optional(),
      relationships: z.array(z.string().max(160)).max(8).optional(),
      assets: z.array(z.string().max(160)).max(8).optional(),
      notes: z.array(z.string().max(160)).max(8).optional(),
    })
    .optional(),
  suggestedActions: z
    .array(
      z.object({
        label: z.string().min(2).max(120),
        description: z.string().max(300).optional().nullable(),
        actionType: z.enum(BUCKET_DREAM_ACTION_TYPES),
      }),
    )
    .max(8)
    .optional(),
});

const strArr = { type: "array", items: { type: "string" } };
const ANALYZE_GEMINI_SCHEMA = {
  type: "object",
  required: [
    "whyThisMattersDeeply",
    "identityChapter",
    "emotionalMeaning",
    "dreamReadiness",
    "smallestVersion",
    "nextBestStep",
  ],
  properties: {
    whyThisMattersDeeply: { type: "string" },
    identityChapter: { type: "string" },
    emotionalMeaning: { type: "string" },
    whyNow: { type: "string" },
    dreamReadiness: {
      type: "object",
      required: ["explanation"],
      properties: {
        score: { type: "number" },
        status: {
          type: "string",
          enum: BUCKET_DREAM_READINESS_STATUSES as readonly string[],
        },
        explanation: { type: "string" },
        missingPieces: strArr,
      },
    },
    blockers: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "type", "explanation", "suggestedAction"],
        properties: {
          title: { type: "string" },
          type: {
            type: "string",
            enum: BUCKET_DREAM_BLOCKER_TYPES as readonly string[],
          },
          explanation: { type: "string" },
          suggestedAction: { type: "string" },
        },
      },
    },
    smallestVersion: {
      type: "object",
      required: ["title", "description"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        estimatedCost: { type: "number" },
        timeRequired: { type: "string" },
      },
    },
    nextBestStep: {
      type: "object",
      required: ["title", "description"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        actionType: {
          type: "string",
          enum: BUCKET_DREAM_ACTION_TYPES as readonly string[],
        },
      },
    },
    connections: {
      type: "object",
      properties: {
        projects: strArr,
        tasks: strArr,
        goals: strArr,
        relationships: strArr,
        assets: strArr,
        notes: strArr,
      },
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object",
        required: ["label", "actionType"],
        properties: {
          label: { type: "string" },
          description: { type: "string" },
          actionType: {
            type: "string",
            enum: BUCKET_DREAM_ACTION_TYPES as readonly string[],
          },
        },
      },
    },
  },
};

function buildSystemInstruction(): string {
  return [
    "You are a warm, perceptive life coach helping someone understand one of their life dreams (a 'bucket list' item).",
    "Tone: encouraging, non-judgmental, never shaming. Use gentle, human language.",
    "Goal: help them understand WHY it matters, what life chapter / identity it belongs to, what's quietly blocking it, the smallest version they could live soon, and the single next best step.",
    "",
    "Rules:",
    "- `whyThisMattersDeeply`: go one layer deeper than their stated reason, but stay grounded in what they wrote — never invent biography.",
    "- `identityChapter`: the season/identity this belongs to (e.g. 'becoming someone who travels boldly').",
    "- `blockers`: only real, likely blockers. Use gentle framing like 'This doesn't seem blocked by desire — it seems blocked by lack of a first step.' Prefer 0–3 blockers; if nothing blocks it, return an empty list.",
    "- `smallestVersion`: a concrete, low-cost, soon-doable version that keeps the soul of the dream (e.g. a 'Northern Lights night' instead of the full Iceland trip).",
    "- `nextBestStep`: ONE small, concrete action with an actionType. Keep it ~20 minutes where possible.",
    "- `whyNow`: only fill this if there is a clear reason it matters now; otherwise omit it. Do not over-infer.",
    "- `connections`: suggest, by short name, which projects/tasks/goals/relationships/assets/notes this could connect to. These are suggestions only.",
    "- `suggestedActions`: 2–5 concrete next moves, each with an actionType from the allowed set.",
    "- Never fabricate prices, dates, or facts. Estimated numbers must be round and clearly approximate.",
    "- `dreamReadiness.explanation` should be short and kind (e.g. 'Emotionally clear, logistically underplanned.').",
  ].join("\n");
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

function buildUserText(item: BucketItem, language: string, imageCount: number): string {
  const lines: string[] = [];
  lines.push(`Respond in language code: ${language}.`);
  lines.push("");
  lines.push("DREAM:");
  lines.push(`- Title: ${item.title}`);
  lines.push(`- Type: ${item.type}`);
  lines.push(`- Status: ${item.status}`);
  if (item.description) lines.push(`- Description: ${item.description}`);
  if (item.why_this_matters) lines.push(`- Why it matters (their words): ${item.why_this_matters}`);
  lines.push(`- Difficulty: ${item.difficulty}; Time horizon: ${item.time_horizon ?? "unspecified"}`);
  lines.push(
    `- Target: ${item.target_month || item.target_date || "none set"}; Estimated cost: ${
      item.estimated_cost != null ? `${item.estimated_cost} ${item.cost_currency}` : "unknown"
    }; Cost band: ${item.cost_band ?? "unknown"}`,
  );
  if (item.category_tags.length) lines.push(`- Tags: ${item.category_tags.join(", ")}`);
  if (item.type === "travel") {
    lines.push(
      `- Travel: destination ${item.destination_name ?? "?"} (${item.destination_country ?? "?"}), airports ${
        item.origin_airport ?? "?"
      }→${item.destination_airport ?? "?"}, best season ${item.best_season ?? "?"}, style ${
        item.travel_style ?? "?"
      }`,
    );
  }
  lines.push("");
  lines.push("WHAT IS ALREADY CONNECTED / DONE:");
  lines.push(`- Linked project: ${item.linked_project_id ? "yes" : "no"}`);
  lines.push(`- Linked tasks: ${item.linked_task_ids.length}`);
  lines.push(
    `- Savings/budget linked: ${item.linked_savings_goal_id || item.linked_budget_id ? "yes" : "no"}`,
  );
  lines.push(`- Inspiration images: ${imageCount}`);
  lines.push(`- Smaller versions already drafted: ${item.ai_reframe_suggestions ? "yes" : "no"}`);
  if (item.type === "travel") {
    lines.push(`- Destination brief generated: ${item.ai_destination_brief ? "yes" : "no"}`);
    lines.push(`- Trip plan generated: ${item.ai_trip_plan ? "yes" : "no"}`);
    lines.push(`- Flight watch on: ${item.flight_watch_enabled ? "yes" : "no"}`);
  }
  return lines.join("\n");
}

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const bucketItemId =
    typeof bodyJson.bucketItemId === "string" ? bodyJson.bucketItemId.trim() : "";
  const forceRefresh = bodyJson.forceRefresh === true;
  if (!bucketItemId) {
    return NextResponse.json({ error: "missing_bucket_item_id" }, { status: 400 });
  }

  // Load + ownership check.
  const { data: row } = await ctx.supabase
    .from("bucket_items")
    .select("*")
    .eq("id", bucketItemId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const item = {
    ...(row as BucketItem),
    category_tags: asArray((row as Record<string, unknown>).category_tags),
    linked_task_ids: asArray((row as Record<string, unknown>).linked_task_ids),
    linked_calendar_event_ids: asArray(
      (row as Record<string, unknown>).linked_calendar_event_ids,
    ),
    linked_knowledge_resource_ids: asArray(
      (row as Record<string, unknown>).linked_knowledge_resource_ids,
    ),
  } as BucketItem;

  // Serve cache unless a refresh was explicitly requested.
  if (!forceRefresh) {
    const { data: cached } = await ctx.supabase
      .from("bucket_dream_ai_reports")
      .select("report_json")
      .eq("bucket_item_id", bucketItemId)
      .eq("report_type", "dream_intelligence")
      .maybeSingle();
    if (cached?.report_json) {
      return NextResponse.json({ report: cached.report_json, cached: true });
    }
  }

  const quota = await assertBucketAiQuota(ctx, "reframe");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const { count: imageCount } = await ctx.supabase
    .from("bucket_dream_images")
    .select("id", { count: "exact", head: true })
    .eq("bucket_item_id", bucketItemId);

  try {
    const { data, modelUsed } = await fetchGeminiStructured<unknown>({
      apiKey: apiKeyRes.apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: buildSystemInstruction(),
      userText: buildUserText(item, ctx.language, imageCount ?? 0),
      responseSchema: ANALYZE_GEMINI_SCHEMA,
      temperature: 0.55,
      maxOutputTokens: 2600,
      timeoutMs: 45_000,
    });

    const parsed = ReportSchema.parse(data);

    // Deterministic readiness — the authoritative score shown to the user.
    const readiness = computeDreamReadiness(item, {
      imageCount: imageCount ?? 0,
      hasReport: true,
    });
    const hasBlockers = (parsed.blockers ?? []).length > 0;
    const status =
      hasBlockers && readiness.score < 40
        ? "blocked"
        : readinessStatusFromScore(item, readiness);

    const report: BucketDreamIntelligenceReport = {
      bucketItemId,
      whyThisMattersDeeply: parsed.whyThisMattersDeeply,
      identityChapter: parsed.identityChapter,
      emotionalMeaning: parsed.emotionalMeaning,
      whyNow: parsed.whyNow ?? null,
      dreamReadiness: {
        score: readiness.score,
        status,
        explanation: parsed.dreamReadiness.explanation,
        missingPieces: parsed.dreamReadiness.missingPieces ?? [],
      },
      blockers: (parsed.blockers ?? []).map((b) => ({
        title: b.title,
        type: b.type,
        explanation: b.explanation,
        suggestedAction: b.suggestedAction,
      })),
      smallestVersion: {
        title: parsed.smallestVersion.title,
        description: parsed.smallestVersion.description,
        estimatedCost: parsed.smallestVersion.estimatedCost ?? null,
        timeRequired: parsed.smallestVersion.timeRequired ?? null,
      },
      nextBestStep: {
        title: parsed.nextBestStep.title,
        description: parsed.nextBestStep.description,
        actionType: parsed.nextBestStep.actionType ?? null,
      },
      connections: {
        projects: asArray(parsed.connections?.projects),
        tasks: asArray(parsed.connections?.tasks),
        goals: asArray(parsed.connections?.goals),
        relationships: asArray(parsed.connections?.relationships),
        assets: asArray(parsed.connections?.assets),
        notes: asArray(parsed.connections?.notes),
      },
      suggestedActions: (parsed.suggestedActions ?? []).map((a) => ({
        label: a.label,
        description: a.description ?? null,
        actionType: a.actionType,
      })),
      generatedAt: new Date().toISOString(),
      modelUsed,
    };

    await recordBucketAiUsage(ctx, "reframe");

    await ctx.supabase.from("bucket_dream_ai_reports").upsert(
      {
        user_id: ctx.userId,
        bucket_item_id: bucketItemId,
        report_type: "dream_intelligence",
        report_json: report,
        model_used: modelUsed,
        generated_at: report.generatedAt,
      },
      { onConflict: "user_id,bucket_item_id,report_type" },
    );

    return NextResponse.json({ report, cached: false });
  } catch (err) {
    return bucketAiError(err);
  }
}
