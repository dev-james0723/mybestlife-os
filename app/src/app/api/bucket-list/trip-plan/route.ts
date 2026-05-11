/**
 * POST /api/bucket-list/trip-plan
 *
 * Generate a day-by-day itinerary. Research-then-extract pattern identical to
 * /destination-brief — Gemini google_search gathers facts, a second structured
 * call normalises them to typed JSON.
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
  fetchGeminiGroundedText,
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
} from "@/lib/ai/gemini-text";
import {
  BUCKET_TRAVEL_STYLES,
  type BucketTripPlan,
  type BucketTravelStyle,
} from "@/types/bucket-list";

export const runtime = "nodejs";

const PlanDaySchema = z.object({
  day: z.number().int().min(1).max(60),
  theme: z.string().min(3).max(120),
  morning: z.string().min(3).max(400),
  afternoon: z.string().min(3).max(400),
  evening: z.string().min(3).max(400),
  anchor: z.string().max(160).optional().nullable(),
});

const PlanSchema = z.object({
  days: z.array(PlanDaySchema).min(1).max(30),
  unverified: z.boolean().optional(),
});

const PLAN_GEMINI_SCHEMA = {
  type: "object",
  required: ["days"],
  properties: {
    days: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["day", "theme", "morning", "afternoon", "evening"],
        properties: {
          day: { type: "integer" },
          theme: { type: "string" },
          morning: { type: "string" },
          afternoon: { type: "string" },
          evening: { type: "string" },
          anchor: { type: "string" },
        },
      },
    },
    unverified: { type: "boolean" },
  },
};

export async function POST(request: Request) {
  const auth = await requireBucketAiContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const destinationName =
    typeof bodyJson.destination_name === "string"
      ? bodyJson.destination_name.trim()
      : "";
  const destinationCity =
    typeof bodyJson.destination_city === "string"
      ? bodyJson.destination_city.trim()
      : "";
  const destinationCountry =
    typeof bodyJson.destination_country === "string"
      ? bodyJson.destination_country.trim()
      : "";
  const tripLength =
    typeof bodyJson.trip_length_days === "number" &&
    bodyJson.trip_length_days > 0 &&
    bodyJson.trip_length_days <= 30
      ? Math.floor(bodyJson.trip_length_days)
      : 5;
  const travelStyleRaw =
    typeof bodyJson.travel_style === "string"
      ? bodyJson.travel_style.trim()
      : "";
  const travelStyle: BucketTravelStyle | null = (
    BUCKET_TRAVEL_STYLES as readonly string[]
  ).includes(travelStyleRaw)
    ? (travelStyleRaw as BucketTravelStyle)
    : null;
  const budgetLevel =
    typeof bodyJson.travel_budget_level === "string"
      ? bodyJson.travel_budget_level.trim()
      : "";
  const priorities =
    typeof bodyJson.priorities === "string" ? bodyJson.priorities.trim() : "";

  if (!destinationName && !destinationCity && !destinationCountry) {
    return NextResponse.json(
      { error: "missing_destination" },
      { status: 400 },
    );
  }

  const quota = await assertBucketAiQuota(ctx, "trip_plan");
  if (!quota.ok) return quota.response;

  const apiKeyRes = getBucketAiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;
  const apiKey = apiKeyRes.apiKey;

  const destinationLabel = [destinationCity, destinationCountry, destinationName]
    .filter(Boolean)
    .join(", ");

  try {
    const research = await fetchGeminiGroundedText({
      apiKey,
      model: getGeminiHabitsProModel(),
      systemInstruction: [
        "You are a calm, experienced travel planner. Use Google Search when helpful for current conditions, opening hours, or season-specific recommendations.",
        "Keep each day realistic — one morning experience, one afternoon, and one evening; don't cram. Respect the travel style and budget.",
        "If something is uncertain, say so rather than invent detail.",
      ].join("\n"),
      userText: [
        `Destination: ${destinationLabel}`,
        `Trip length: ${tripLength} days`,
        travelStyle ? `Travel style: ${travelStyle}` : "",
        budgetLevel ? `Budget: ${budgetLevel}` : "",
        priorities ? `Priorities: ${priorities}` : "",
        "Write a day-by-day plan. Each day: theme, morning, afternoon, evening, optional anchor location.",
        "Plain text output, no markdown.",
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.45,
      maxOutputTokens: 3000,
      timeoutMs: 90_000,
    });

    const { data } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: [
        "You extract a typed JSON itinerary from a travel plan.",
        "Preserve day numbering; fill all four slots (theme, morning, afternoon, evening).",
      ].join("\n"),
      userText: [
        "Extract the day-by-day plan as JSON (array of days).",
        "",
        "Plan:",
        research.text.slice(0, 8000),
      ].join("\n"),
      responseSchema: PLAN_GEMINI_SCHEMA,
      temperature: 0.15,
      maxOutputTokens: 4096,
      timeoutMs: 60_000,
    });

    const parsed = PlanSchema.parse(data);

    await recordBucketAiUsage(ctx, "trip_plan");

    const plan: BucketTripPlan = {
      days: parsed.days.map((d) => ({
        day: d.day,
        theme: d.theme,
        morning: d.morning,
        afternoon: d.afternoon,
        evening: d.evening,
        anchor: d.anchor ?? null,
      })),
      travel_style: travelStyle,
      trip_length_days: tripLength,
      fetched_at: new Date().toISOString(),
      unverified: parsed.unverified ?? false,
    };

    const bucketId =
      typeof bodyJson.bucket_item_id === "string"
        ? bodyJson.bucket_item_id
        : null;
    if (bucketId) {
      await ctx.supabase
        .from("bucket_items")
        .update({ ai_trip_plan: plan })
        .eq("id", bucketId)
        .eq("user_id", ctx.userId);
    }

    return NextResponse.json({ plan });
  } catch (err) {
    return bucketAiError(err);
  }
}
