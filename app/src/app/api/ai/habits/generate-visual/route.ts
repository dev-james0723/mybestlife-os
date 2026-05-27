import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { stableHash } from "@/lib/habits/ai-cache";
import { generateQuoteThumbnailImage, mimeToExt } from "@/lib/quote-library/thumbnail/image";
import { buildHabitVisualPrompt } from "@/lib/ai/prompts/habits/habit-visual";
import {
  HabitVisualRequestSchema,
  HabitVisualResponseSchema,
} from "@/lib/ai/schemas/habits/habit-visual";

export const runtime = "nodejs";

const HABIT_VISUAL_BUCKET = "habit-visuals";

function slugify(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "habit";
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = HabitVisualRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const prompt = buildHabitVisualPrompt({
    habitName: input.habitName,
    description: input.description,
    type: input.type,
    timeOfDay: input.timeOfDay,
    sourceContext: input.sourceContext,
  });
  const sourceHash = stableHash({
    habitName: input.habitName,
    description: input.description ?? "",
    type: input.type ?? "",
    timeOfDay: input.timeOfDay ?? "",
    sourceContext: input.sourceContext ?? "",
    prompt,
  });
  const kind = input.routineId ? "routine" : "habit";

  if (!input.forceRefresh) {
    const query = supabase
      .from("habit_visuals")
      .select("image_url, storage_path, visual_prompt, model_used")
      .eq("user_id", user.id)
      .eq("kind", kind);

    const { data: cached, error: cacheError } = input.routineId
      ? await query.eq("routine_id", input.routineId).maybeSingle()
      : input.habitId
        ? await query.eq("habit_id", input.habitId).maybeSingle()
        : await query.eq("source_hash", sourceHash).maybeSingle();

    if (cacheError) {
      return NextResponse.json(
        { error: "visual_cache_lookup_failed", detail: cacheError.message },
        { status: 500 },
      );
    }

    if (cached?.image_url && cached.storage_path) {
      const response = HabitVisualResponseSchema.parse({
        imageUrl: cached.image_url,
        storagePath: cached.storage_path,
        prompt: cached.visual_prompt,
        modelUsed: cached.model_used ?? "cached",
        cached: true,
      });
      return NextResponse.json(response);
    }
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Image generation is not configured. Set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY on the server.",
      },
      { status: 503 },
    );
  }

  try {
    const generated = await generateQuoteThumbnailImage({
      apiKey,
      prompt,
      primaryModel: process.env.GEMINI_HABIT_VISUAL_MODEL,
    });
    const ext = mimeToExt(generated.mimeType);
    const entityId = input.routineId ?? input.habitId ?? slugify(input.habitName);
    const storagePath = `${user.id}/${kind}/${entityId}-${sourceHash.slice(0, 10)}-${randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(HABIT_VISUAL_BUCKET)
      .upload(storagePath, generated.bytes, {
        contentType: generated.mimeType,
        upsert: true,
        cacheControl: "31536000, immutable",
      });
    if (uploadError) throw new Error(`habit_visual_upload_failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from(HABIT_VISUAL_BUCKET)
      .getPublicUrl(storagePath);
    if (!urlData.publicUrl) throw new Error("habit_visual_public_url_missing");

    const payload = {
      user_id: user.id,
      habit_id: input.habitId ?? null,
      routine_id: input.routineId ?? null,
      kind,
      visual_prompt: prompt,
      image_url: urlData.publicUrl,
      storage_path: storagePath,
      model_used: generated.modelUsed,
      source_hash: sourceHash,
      updated_at: new Date().toISOString(),
    };

    if (input.habitId || input.routineId) {
      const existingQuery = supabase
        .from("habit_visuals")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind);
      const { data: existing, error: existingError } = input.routineId
        ? await existingQuery.eq("routine_id", input.routineId).maybeSingle()
        : await existingQuery.eq("habit_id", input.habitId).maybeSingle();
      if (existingError) throw existingError;
      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("habit_visuals")
          .update(payload)
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("habit_visuals").insert(payload);
        if (insertError) throw insertError;
      }
    } else {
      const { error: insertError } = await supabase.from("habit_visuals").insert(payload);
      if (insertError) throw insertError;
    }

    const response = HabitVisualResponseSchema.parse({
      imageUrl: urlData.publicUrl,
      storagePath,
      prompt,
      modelUsed: generated.modelUsed,
      cached: false,
    });
    return NextResponse.json(response);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "habit_visual_generation_failed", detail: detail.slice(0, 800) },
      { status: 502 },
    );
  }
}
