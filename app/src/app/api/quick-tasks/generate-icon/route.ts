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

export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * POST { taskLabel: string, presetKey?: QuickTaskPresetKey }
 * Returns { iconUrl, modelUsed } — image stored in `quick-task-icons` bucket.
 */
export async function POST(req: Request) {
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

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(json)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const taskLabel = typeof json.taskLabel === "string" ? json.taskLabel.trim() : "";
  if (!taskLabel || taskLabel.length > 240) {
    return NextResponse.json({ error: "taskLabel is required (max 240 chars)" }, { status: 400 });
  }

  const presetRaw = typeof json.presetKey === "string" ? json.presetKey.trim() : "";
  const presetKey: QuickTaskPresetKey | null =
    presetRaw && QUICK_TASK_PRESET_KEYS.includes(presetRaw as QuickTaskPresetKey)
      ? (presetRaw as QuickTaskPresetKey)
      : null;

  const subject = presetKey
    ? `${QUICK_TASK_PRESET_VISUAL_SUBJECT[presetKey]} Exact task label: ${taskLabel}.`
    : taskLabel;

  const prompt = buildLiquidGlassQuickTaskIconPrompt(subject);

  try {
    const generated = await generateQuoteThumbnailImage({ apiKey, prompt });
    const slug = slugifyQuickTaskLabel(taskLabel);
    const uploaded = await uploadQuickTaskIconToSupabase({
      supabase,
      userId: user.id,
      slug,
      bytes: generated.bytes,
      mimeType: generated.mimeType,
    });

    return NextResponse.json({
      iconUrl: uploaded.publicUrl,
      modelUsed: generated.modelUsed,
      modelsTried: generated.modelsTried,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "quick_task_icon_generation_failed", detail: msg.slice(0, 800) },
      { status: 502 },
    );
  }
}
