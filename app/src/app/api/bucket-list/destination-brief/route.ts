/**
 * POST /api/bucket-list/destination-brief
 *
 * Uses Gemini's `google_search` tool to research the destination, then a
 * second Gemini call extracts a typed JSON brief. Two-call pattern because
 * grounded search cannot be combined with `responseSchema`.
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
import type { BucketDestinationBrief } from "@/types/bucket-list";

export const runtime = "nodejs";

const BriefSchema = z.object({
  overview: z.string().min(20).max(800),
  best_time: z.string().min(5).max(200),
  food: z.array(z.string().min(3).max(160)).min(1).max(8),
  stay: z.array(z.string().min(3).max(160)).min(1).max(8),
  transport: z.array(z.string().min(3).max(160)).min(1).max(8),
  must_do: z.array(z.string().min(3).max(160)).min(1).max(10),
  weather_note: z.string().max(400).optional().nullable(),
  unverified: z.boolean().optional(),
});

const BRIEF_GEMINI_SCHEMA = {
  type: "object",
  required: ["overview", "best_time", "food", "stay", "transport", "must_do"],
  properties: {
    overview: { type: "string" },
    best_time: { type: "string" },
    food: { type: "array", items: { type: "string" }, minItems: 1 },
    stay: { type: "array", items: { type: "string" }, minItems: 1 },
    transport: { type: "array", items: { type: "string" }, minItems: 1 },
    must_do: { type: "array", items: { type: "string" }, minItems: 1 },
    weather_note: { type: "string" },
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
  const destinationCountry =
    typeof bodyJson.destination_country === "string"
      ? bodyJson.destination_country.trim()
      : "";
  const destinationCity =
    typeof bodyJson.destination_city === "string"
      ? bodyJson.destination_city.trim()
      : "";
  const travelStyle =
    typeof bodyJson.travel_style === "string"
      ? bodyJson.travel_style.trim()
      : "";
  const bestSeason =
    typeof bodyJson.best_season === "string" ? bodyJson.best_season.trim() : "";

  if (!destinationName && !destinationCity && !destinationCountry) {
    return NextResponse.json(
      { error: "missing_destination" },
      { status: 400 },
    );
  }

  const quota = await assertBucketAiQuota(ctx, "destination_brief");
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
        "You are a calm, concise travel researcher. Use Google Search to find up-to-date practical information about the destination.",
        "Favor facts with high signal — best time of year, notable food experiences, a few good stay areas (not specific hotel names unless iconic), transport tips (airport → city, intra-city), and the 3–5 must-do experiences.",
        "If information is uncertain or you can't verify, say so plainly instead of inventing detail. Never make up prices.",
      ].join("\n"),
      userText: [
        `Destination: ${destinationLabel}`,
        bestSeason ? `User's target season: ${bestSeason}` : "",
        travelStyle ? `Travel style: ${travelStyle}` : "",
        "Write a short practical travel brief covering:",
        "- overview (1–2 sentences: vibe / character of the place)",
        "- best time to visit",
        "- 3–5 notable food experiences",
        "- 3–5 good stay areas",
        "- transport tips",
        "- 5–7 must-do experiences",
        "- a weather / conditions note if relevant.",
        "Plain text, no markdown formatting.",
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.4,
      maxOutputTokens: 2048,
      timeoutMs: 60_000,
    });

    const { data } = await fetchGeminiStructured<unknown>({
      apiKey,
      model: getGeminiHabitsFlashModel(),
      systemInstruction: [
        "You extract a typed JSON object from a travel brief. Keep each list item short and practical.",
        "If the brief explicitly flags a piece of information as unverified, omit it from the lists or set `unverified: true`.",
        "Do not invent. If a field has no confident answer, mirror the brief's hedged language.",
      ].join("\n"),
      userText: [
        "Extract:",
        "- overview (1–2 sentences)",
        "- best_time (string)",
        "- food (up to 6 short items)",
        "- stay (up to 6 short items)",
        "- transport (up to 6 short items)",
        "- must_do (up to 8 short items)",
        "- weather_note (optional string)",
        "- unverified (optional boolean)",
        "",
        "Travel brief:",
        research.text.slice(0, 6000),
      ].join("\n"),
      responseSchema: BRIEF_GEMINI_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 2048,
      timeoutMs: 30_000,
    });

    const parsed = BriefSchema.parse(data);

    await recordBucketAiUsage(ctx, "destination_brief");

    const brief: BucketDestinationBrief = {
      overview: parsed.overview,
      best_time: parsed.best_time,
      food: parsed.food,
      stay: parsed.stay,
      transport: parsed.transport,
      must_do: parsed.must_do,
      weather_note: parsed.weather_note ?? null,
      fetched_at: new Date().toISOString(),
      unverified: parsed.unverified ?? false,
    };

    // Persist on the bucket item if one was specified.
    const bucketId =
      typeof bodyJson.bucket_item_id === "string"
        ? bodyJson.bucket_item_id
        : null;
    if (bucketId) {
      await ctx.supabase
        .from("bucket_items")
        .update({ ai_destination_brief: brief })
        .eq("id", bucketId)
        .eq("user_id", ctx.userId);
    }

    return NextResponse.json({ brief });
  } catch (err) {
    return bucketAiError(err);
  }
}
