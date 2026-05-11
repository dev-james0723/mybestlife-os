import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";
import { resolveScheduleImageStyle } from "@/lib/daily-planner/schedule-image-styles";
import {
  buildScheduleImagePrompt,
  buildScheduleRows,
} from "@/lib/daily-planner/schedule-prompt";
import type { DailyPlanTask } from "@/types/database";

export const runtime = "nodejs";

/**
 * Default image model for schedule PNGs. Pro preview often has no free-tier quota.
 * Override with GEMINI_SCHEDULE_IMAGE_MODEL when your project has quota.
 */
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

/** Tried in order after the primary when Google returns 429 / RESOURCE_EXHAUSTED (separate quota buckets). */
const IMAGE_MODEL_QUOTA_FALLBACKS = [
  "gemini-2.0-flash-preview-image-generation",
] as const;

type IncomingTask = { taskName?: unknown; blocks?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

type ParsedGeminiFailure = {
  code?: number;
  status?: string;
  message?: string;
  quotaModel?: string;
  limitZero?: boolean;
};

function parseGeminiFailureBody(raw: string): ParsedGeminiFailure {
  try {
    const j = JSON.parse(raw) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: unknown[];
      };
    };
    const e = j.error;
    if (!e) return {};
    let quotaModel: string | undefined;
    for (const d of Array.isArray(e.details) ? e.details : []) {
      if (!isRecord(d)) continue;
      if (d["@type"] !== "type.googleapis.com/google.rpc.QuotaFailure") continue;
      const violations = d.violations;
      if (!Array.isArray(violations)) continue;
      for (const v of violations) {
        if (!isRecord(v)) continue;
        const dims = v.quotaDimensions;
        if (isRecord(dims) && typeof dims.model === "string") {
          quotaModel = dims.model;
          break;
        }
      }
      if (quotaModel) break;
    }
    const msg = e.message ?? "";
    return {
      code: e.code,
      status: e.status,
      message: msg,
      quotaModel,
      limitZero: /\blimit:\s*0\b/i.test(msg),
    };
  } catch {
    return {};
  }
}

function buildImageModelTryChain(primaryRaw: string | undefined): string[] {
  const primary = primaryRaw?.trim() || DEFAULT_IMAGE_MODEL;
  const pool: string[] = [primary, DEFAULT_IMAGE_MODEL, ...IMAGE_MODEL_QUOTA_FALLBACKS];
  const out: string[] = [];
  for (const m of pool) {
    if (m.length > 0 && !out.includes(m)) out.push(m);
  }
  return out;
}

function extractInlineImage(data: unknown): { mimeType: string; data: string } | null {
  if (!isRecord(data)) return null;
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const first = candidates[0];
  if (!isRecord(first)) return null;
  const content = first.content;
  if (!isRecord(content)) return null;
  const parts = content.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    if (!isRecord(part)) continue;
    const inline =
      (part.inlineData as Record<string, unknown> | undefined) ??
      (part.inline_data as Record<string, unknown> | undefined);
    if (!inline) continue;
    const mime =
      (typeof inline.mimeType === "string" && inline.mimeType) ||
      (typeof inline.mime_type === "string" && inline.mime_type) ||
      "image/png";
    const b64 = inline.data;
    if (typeof b64 === "string" && b64.length > 0) {
      return { mimeType: mime, data: b64 };
    }
  }
  return null;
}

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

  const planDate = typeof json.planDate === "string" ? json.planDate.trim() : "";
  const startTime = typeof json.startTime === "string" ? json.startTime.trim() : "";
  const endTime = typeof json.endTime === "string" ? json.endTime.trim() : "";
  const styleId = typeof json.styleId === "string" ? json.styleId.trim() : "";
  const blockMinutes =
    typeof json.blockMinutes === "number" && Number.isFinite(json.blockMinutes) && json.blockMinutes > 0
      ? Math.min(120, Math.floor(json.blockMinutes))
      : 10;

  const rawTasks = json.tasks;
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    return NextResponse.json({ error: "tasks must be a non-empty array" }, { status: 400 });
  }

  const tasks: DailyPlanTask[] = [];
  for (const item of rawTasks as IncomingTask[]) {
    if (!item || typeof item !== "object") continue;
    const name = typeof item.taskName === "string" ? item.taskName : "";
    const blocksRaw = item.blocks;
    const blocks =
      typeof blocksRaw === "number" && Number.isFinite(blocksRaw)
        ? Math.max(1, Math.floor(blocksRaw))
        : 1;
    tasks.push({ taskName: name, blocks, order: tasks.length });
  }

  if (tasks.length === 0) {
    return NextResponse.json({ error: "No valid tasks in payload" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return NextResponse.json({ error: "planDate must be YYYY-MM-DD" }, { status: 400 });
  }
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }

  const resolvedStyle = resolveScheduleImageStyle(styleId || undefined);
  const rows = buildScheduleRows(startTime, tasks, blockMinutes);
  const prompt = buildScheduleImagePrompt({
    planDate,
    planDayWindow: `${startTime}–${endTime}`,
    styleCatalogLabel: resolvedStyle.label,
    styleCatalogId: resolvedStyle.id,
    stylePromptDirective: resolvedStyle.promptDirective,
    rows,
  });

  const modelChain = buildImageModelTryChain(process.env.GEMINI_SCHEDULE_IMAGE_MODEL);

  const requestBody = JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  let lastRawText = "";
  let lastModel = modelChain[modelChain.length - 1] ?? DEFAULT_IMAGE_MODEL;

  for (const model of modelChain) {
    lastModel = model;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const rawText = await res.text();
    lastRawText = rawText;

    if (!res.ok) {
      const fail = parseGeminiFailureBody(rawText);
      const quotaHit =
        fail.code === 429 ||
        fail.status === "RESOURCE_EXHAUSTED" ||
        res.status === 429;

      if (quotaHit) {
        const idx = modelChain.indexOf(model);
        if (idx < modelChain.length - 1) continue;

        const qm = fail.quotaModel ?? model;
        let clientError = `Gemini image quota exceeded (${qm}). Models tried: ${modelChain.join(", ")}.`;
        if (fail.limitZero) {
          clientError +=
            " Google reports limit 0 for this usage class: enable billing on the Cloud project tied to your API key, or create a new key in Google AI Studio with image generation access for your region.";
        } else {
          clientError +=
            " Wait a minute and retry, or review limits at https://ai.google.dev/gemini-api/docs/rate-limits";
        }
        return NextResponse.json(
          {
            error: clientError,
            detail: rawText.slice(0, 4000),
            model: lastModel,
            modelsTried: modelChain,
          },
          { status: 429 },
        );
      }

      const outStatus = res.status >= 400 && res.status < 600 ? res.status : 502;
      return NextResponse.json(
        {
          error: "Gemini image request failed",
          detail: rawText.slice(0, 4000),
          model,
          modelsTried: modelChain.slice(0, modelChain.indexOf(model) + 1),
        },
        { status: outStatus },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch {
      return NextResponse.json(
        { error: "Invalid response from Gemini", detail: rawText.slice(0, 500), model },
        { status: 502 },
      );
    }

    const picked = extractInlineImage(parsed);
    if (picked) {
      const dataUrl = `data:${picked.mimeType};base64,${picked.data}`;
      return NextResponse.json({
        imageUrl: dataUrl,
        mimeType: picked.mimeType,
        model,
      });
    }

    const idx = modelChain.indexOf(model);
    if (idx < modelChain.length - 1) continue;

    return NextResponse.json(
      {
        error: "No image returned by the model",
        hint:
          "Try GEMINI_SCHEDULE_IMAGE_MODEL=gemini-3-pro-image-preview if your project has Pro image quota; otherwise keep the default flash image model.",
        model,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      error: "Gemini image request failed",
      detail: lastRawText.slice(0, 4000),
      model: lastModel,
      modelsTried: modelChain,
    },
    { status: 502 },
  );
}
