import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { generateQuoteThumbnailImage } from "@/lib/quote-library/thumbnail/image";
import { buildLiquidGlassQuickTaskIconPrompt } from "@/lib/daily-planner/quick-task-icon-prompt";
import {
  slugifyQuickTaskLabel,
  uploadQuickTaskIconToSupabase,
} from "@/lib/daily-planner/quick-task-icon-storage";
import {
  QUICK_TASK_PRESET_KEYS,
  QUICK_TASK_PRESET_VISUAL_SUBJECT,
  type QuickTaskPresetKey,
} from "@/lib/daily-planner/quick-task-preset-meta";
import { normalizeQuickTasksJson } from "@/lib/daily-planner/normalize-quick-task";
import type { QuickTaskDef } from "@/types/database";

export const runtime = "nodejs";

const MAX_PER_REQUEST = 14;

/**
 * Fills `iconUrl` on profile.quick_tasks rows that don't have one yet.
 * Uses Gemini + Liquid Glass prompt; uploads to `quick-task-icons`.
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Image generation is not configured. Set GEMINI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY) on the server.",
      },
      { status: 503 },
    );
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("quick_tasks")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  const rawTasks = profile?.quick_tasks;
  const parsed = normalizeQuickTasksJson(rawTasks);
  if (!parsed || parsed.length === 0) {
    return NextResponse.json({ error: "no_quick_tasks", updated: 0 }, { status: 400 });
  }

  const next: QuickTaskDef[] = parsed.map((t) => ({ ...t }));
  let updated = 0;

  for (let i = 0; i < next.length; i++) {
    if (updated >= MAX_PER_REQUEST) break;
    if (next[i].iconUrl?.trim()) continue;

    const label = next[i].name.trim();
    if (!label) continue;

    const presetFromRow = next[i].presetKey;
    const presetKey: QuickTaskPresetKey | null =
      typeof presetFromRow === "string" &&
      QUICK_TASK_PRESET_KEYS.includes(presetFromRow as QuickTaskPresetKey)
        ? (presetFromRow as QuickTaskPresetKey)
        : null;

    const subject = presetKey
      ? `${QUICK_TASK_PRESET_VISUAL_SUBJECT[presetKey]} Exact task label: ${label}.`
      : label;

    try {
      const prompt = buildLiquidGlassQuickTaskIconPrompt(subject);
      const generated = await generateQuoteThumbnailImage({ apiKey, prompt });
      const slug = slugifyQuickTaskLabel(label);
      const uploaded = await uploadQuickTaskIconToSupabase({
        supabase,
        userId: user.id,
        slug,
        bytes: generated.bytes,
        mimeType: generated.mimeType,
      });
      next[i] = { ...next[i], iconUrl: uploaded.publicUrl };
      updated++;
    } catch {
      // Continue other rows — partial success is OK.
    }
  }

  const { error: upErr } = await supabase
    .from("profiles")
    .update({
      quick_tasks: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ updated, total: next.length, quick_tasks: next });
}
