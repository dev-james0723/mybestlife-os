/**
 * POST /api/bucket-list/autofill
 *
 * AI-first dream capture. Turns a short sentence, a messy idea dump, or an
 * uploaded inspiration / screenshot image into a *structured, editable* dream
 * draft ({@link BucketDreamAutofillResult}).
 *
 * Safety:
 *   - This route NEVER persists a dream. It only proposes a draft the user
 *     reviews and confirms in the wizard.
 *   - Output is validated with Zod at the boundary; raw model output is not
 *     trusted.
 *   - Quota is enforced via the shared `inspire` usage kind (no schema change).
 *
 * Request body:
 *   { text?: string; imageUrl?: string; locale?: AppLocale;
 *     currentBucketItems?: BucketItemSummary[] }
 * Response (200): { result: BucketDreamAutofillResult }
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
  fetchGeminiStructuredFromParts,
  getGeminiHabitsFlashModel,
  type GeminiStructuredPart,
} from "@/lib/ai/gemini-text";
import {
  decodeImageInput,
  type DecodedImage,
} from "@/lib/ai/bucket-list/image-input";
import {
  BUCKET_COST_BANDS,
  BUCKET_DIFFICULTIES,
  BUCKET_FIELD_CONFIDENCE_LEVELS,
  BUCKET_PRIORITIES,
  BUCKET_STATUSES,
  BUCKET_TIME_HORIZONS,
  BUCKET_TRAVEL_BUDGET_LEVELS,
  BUCKET_TRAVEL_STYLES,
  BUCKET_TYPES,
  type BucketDreamAutofillResult,
  type BucketFieldConfidence,
} from "@/types/bucket-list";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Validation (boundary) ─────────────────────────────────────────────────────

const TravelSchema = z
  .object({
    destination_name: z.string().max(160).optional().nullable(),
    destination_country: z.string().max(160).optional().nullable(),
    destination_city: z.string().max(160).optional().nullable(),
    destination_airport: z.string().max(8).optional().nullable(),
    origin_airport: z.string().max(8).optional().nullable(),
    best_season: z.string().max(120).optional().nullable(),
    travel_budget_level: z.enum(BUCKET_TRAVEL_BUDGET_LEVELS).optional().nullable(),
    travel_style: z.enum(BUCKET_TRAVEL_STYLES).optional().nullable(),
    trip_length_days: z.number().int().min(1).max(365).optional().nullable(),
    flight_watch_enabled: z.boolean().optional(),
  })
  .optional()
  .nullable();

const AutofillSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  why_this_matters: z.string().max(1200).optional().nullable(),
  type: z.enum(BUCKET_TYPES),
  status: z.enum(BUCKET_STATUSES).optional(),
  priority: z.enum(BUCKET_PRIORITIES).optional(),
  difficulty: z.enum(BUCKET_DIFFICULTIES).optional(),
  time_horizon: z.enum(BUCKET_TIME_HORIZONS).optional().nullable(),
  estimated_cost: z.number().nonnegative().optional().nullable(),
  cost_currency: z.string().regex(/^[A-Z]{3}$/u).optional().nullable(),
  cost_band: z.enum(BUCKET_COST_BANDS).optional().nullable(),
  target_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional()
    .nullable(),
  target_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/u)
    .optional()
    .nullable(),
  category_tags: z.array(z.string().min(1).max(40)).max(12).optional(),
  quote_inspiration: z.string().max(400).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  travel: TravelSchema,
  confidence: z.number().min(0).max(1).optional(),
  field_confidence: z
    .array(
      z.object({
        field: z.string().min(1).max(60),
        level: z.enum(BUCKET_FIELD_CONFIDENCE_LEVELS),
      }),
    )
    .max(40)
    .optional(),
  missing_fields: z.array(z.string().min(1).max(60)).max(40).optional(),
  suggested_next_actions: z.array(z.string().min(1).max(160)).max(12).optional(),
  warnings: z.array(z.string().min(1).max(240)).max(12).optional(),
});

// Gemini's responseSchema uses an OpenAPI-3 subset (no `record`/map types), so
// `field_confidence` is modeled as an array of {field, level} and folded into a
// Record after Zod validation.
const AUTOFILL_GEMINI_SCHEMA = {
  type: "object",
  required: ["title", "type"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    why_this_matters: { type: "string" },
    type: { type: "string", enum: BUCKET_TYPES as readonly string[] },
    status: { type: "string", enum: BUCKET_STATUSES as readonly string[] },
    priority: { type: "string", enum: BUCKET_PRIORITIES as readonly string[] },
    difficulty: {
      type: "string",
      enum: BUCKET_DIFFICULTIES as readonly string[],
    },
    time_horizon: {
      type: "string",
      enum: BUCKET_TIME_HORIZONS as readonly string[],
    },
    estimated_cost: { type: "number" },
    cost_currency: { type: "string" },
    cost_band: { type: "string", enum: BUCKET_COST_BANDS as readonly string[] },
    target_date: { type: "string" },
    target_month: { type: "string" },
    category_tags: { type: "array", items: { type: "string" } },
    quote_inspiration: { type: "string" },
    notes: { type: "string" },
    travel: {
      type: "object",
      properties: {
        destination_name: { type: "string" },
        destination_country: { type: "string" },
        destination_city: { type: "string" },
        destination_airport: { type: "string" },
        origin_airport: { type: "string" },
        best_season: { type: "string" },
        travel_budget_level: {
          type: "string",
          enum: BUCKET_TRAVEL_BUDGET_LEVELS as readonly string[],
        },
        travel_style: {
          type: "string",
          enum: BUCKET_TRAVEL_STYLES as readonly string[],
        },
        trip_length_days: { type: "number" },
        flight_watch_enabled: { type: "boolean" },
      },
    },
    confidence: { type: "number" },
    field_confidence: {
      type: "array",
      items: {
        type: "object",
        required: ["field", "level"],
        properties: {
          field: { type: "string" },
          level: {
            type: "string",
            enum: BUCKET_FIELD_CONFIDENCE_LEVELS as readonly string[],
          },
        },
      },
    },
    missing_fields: { type: "array", items: { type: "string" } },
    suggested_next_actions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildSystemInstruction(): string {
  return [
    "You are a thoughtful life-coaching assistant that turns a person's raw dream — a short sentence, a messy idea dump, or an inspiration/screenshot image — into ONE structured 'bucket list' dream draft.",
    "",
    "Rules:",
    "- Extract a single primary dream. Write a clear, motivating `title` in the user's language.",
    "- Choose `type` from: travel, achievement, growth, relationship, purchase, lifestyle.",
    "- Infer `difficulty`, `time_horizon`, `priority`, and a rough `cost_band` ONLY when the input gives reasonable signal. Otherwise omit them and add the field name to `missing_fields`.",
    "- For travel dreams, fill the nested `travel` object: destination_name/country/city, a likely `best_season`, and IATA airport codes (3 letters, uppercase) ONLY if you are confident; otherwise leave airports out.",
    "- Draft a gentle first-person `why_this_matters` the user can edit. Mark its confidence as 'medium' or 'low' — it is a suggestion, not their words.",
    "- NEVER invent precise figures (exact prices, exact dates) as if they were facts. If you estimate `estimated_cost`, keep it round and mark confidence 'low'.",
    "- `field_confidence` is an array of { field, level } for the fields you set (level ∈ high|medium|low|missing).",
    "- `missing_fields` lists important fields you could not determine and the user should review.",
    "- `suggested_next_actions` is 2–4 short, encouraging next steps the user could take (e.g. 'Set a target month', 'Generate a destination brief').",
    "- `warnings` is for anything the user should sanity-check.",
    "- `confidence` is your overall 0–1 confidence in the extraction.",
    "- Default `status` to 'dreaming' unless the input clearly implies more progress.",
    "- Do not fabricate details the input does not support.",
  ].join("\n");
}

function buildUserText(params: {
  text: string;
  hasImage: boolean;
  currentTitles: string[];
  language: string;
}): string {
  const lines: string[] = [];
  lines.push(`Respond in this language code: ${params.language}.`);
  if (params.currentTitles.length > 0) {
    lines.push(
      "The user already has these dreams (avoid creating a near-duplicate; if the new input clearly matches one, still extract it but add a warning):",
    );
    for (const t of params.currentTitles.slice(0, 20)) lines.push(`- ${t}`);
    lines.push("");
  }
  if (params.text) {
    lines.push("User input:");
    lines.push(params.text);
  } else if (params.hasImage) {
    lines.push(
      "The user uploaded an inspiration/screenshot image. Read it and extract the dream it represents.",
    );
  }
  return lines.join("\n");
}

function toFieldConfidenceRecord(
  entries: { field: string; level: BucketFieldConfidence }[] | undefined,
): Record<string, BucketFieldConfidence> {
  const out: Record<string, BucketFieldConfidence> = {};
  for (const e of entries ?? []) out[e.field] = e.level;
  return out;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const text = typeof bodyJson.text === "string" ? bodyJson.text.trim() : "";
  const imageUrl =
    typeof bodyJson.imageUrl === "string" ? bodyJson.imageUrl.trim() : "";

  if (!text && !imageUrl) {
    return NextResponse.json(
      { error: "missing_input", detail: "Provide text or an image." },
      { status: 400 },
    );
  }
  if (text.length > 6000) {
    return NextResponse.json(
      { error: "text_too_long" },
      { status: 400 },
    );
  }

  const currentTitles: string[] = Array.isArray(bodyJson.currentBucketItems)
    ? bodyJson.currentBucketItems
        .map((it) =>
          it && typeof it === "object" && typeof (it as { title?: unknown }).title === "string"
            ? ((it as { title: string }).title)
            : null,
        )
        .filter((t): t is string => Boolean(t))
    : [];

  const quota = await assertBucketAiQuota(ctx, "inspire");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  const systemInstruction = buildSystemInstruction();
  const userText = buildUserText({
    text,
    hasImage: Boolean(imageUrl),
    currentTitles,
    language: ctx.language,
  });

  try {
    let raw: unknown;

    if (imageUrl) {
      let decoded: DecodedImage;
      try {
        decoded = await decodeImageInput(imageUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const status = msg === "image_too_large" ? 413 : 400;
        return NextResponse.json({ error: "invalid_image", detail: msg }, { status });
      }
      const parts: GeminiStructuredPart[] = [
        { text: userText },
        { inlineData: { mimeType: decoded.mimeType, data: decoded.base64 } },
      ];
      const { data } = await fetchGeminiStructuredFromParts<unknown>({
        apiKey: apiKeyRes.apiKey,
        model: getGeminiHabitsFlashModel(),
        systemInstruction,
        userParts: parts,
        responseSchema: AUTOFILL_GEMINI_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 2048,
        timeoutMs: 45_000,
      });
      raw = data;
    } else {
      const { data } = await fetchGeminiStructured<unknown>({
        apiKey: apiKeyRes.apiKey,
        model: getGeminiHabitsFlashModel(),
        systemInstruction,
        userText,
        responseSchema: AUTOFILL_GEMINI_SCHEMA,
        temperature: 0.4,
        maxOutputTokens: 2048,
        timeoutMs: 30_000,
      });
      raw = data;
    }

    const parsed = AutofillSchema.parse(raw);

    await recordBucketAiUsage(ctx, "inspire");

    const result: BucketDreamAutofillResult = {
      title: parsed.title.trim(),
      description: parsed.description?.trim() || null,
      why_this_matters: parsed.why_this_matters?.trim() || null,
      type: parsed.type,
      status: parsed.status ?? "dreaming",
      priority: parsed.priority ?? "medium",
      difficulty: parsed.difficulty ?? "med",
      time_horizon: parsed.time_horizon ?? null,
      estimated_cost: parsed.estimated_cost ?? null,
      cost_currency: parsed.cost_currency ?? undefined,
      cost_band: parsed.cost_band ?? null,
      target_date: parsed.target_date ?? null,
      target_month: parsed.target_month ?? null,
      category_tags: parsed.category_tags ?? [],
      quote_inspiration: parsed.quote_inspiration?.trim() || null,
      notes: parsed.notes?.trim() || null,
      travel:
        parsed.type === "travel" && parsed.travel
          ? {
              destination_name: parsed.travel.destination_name ?? null,
              destination_country: parsed.travel.destination_country ?? null,
              destination_city: parsed.travel.destination_city ?? null,
              destination_airport:
                parsed.travel.destination_airport?.toUpperCase().slice(0, 3) ?? null,
              origin_airport:
                parsed.travel.origin_airport?.toUpperCase().slice(0, 3) ?? null,
              best_season: parsed.travel.best_season ?? null,
              travel_budget_level: parsed.travel.travel_budget_level ?? null,
              travel_style: parsed.travel.travel_style ?? null,
              trip_length_days: parsed.travel.trip_length_days ?? null,
              flight_watch_enabled: parsed.travel.flight_watch_enabled ?? false,
            }
          : null,
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.6,
      field_confidence: toFieldConfidenceRecord(parsed.field_confidence),
      missing_fields: parsed.missing_fields ?? [],
      suggested_next_actions: parsed.suggested_next_actions ?? [],
      warnings: parsed.warnings ?? [],
    };

    return NextResponse.json({ result });
  } catch (err) {
    return bucketAiError(err);
  }
}
