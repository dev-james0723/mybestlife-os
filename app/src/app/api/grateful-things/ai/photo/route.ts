import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGeminiServerApiKey } from "@/lib/ai/gemini-text";

export const runtime = "nodejs";

const GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const IMAGE_MODEL_QUOTA_FALLBACKS = ["gemini-2.0-flash-preview-image-generation"] as const;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
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

  const journalText = typeof json.text === "string" ? json.text.trim() : "";
  if (!journalText) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (journalText.length > 4_000) {
    return NextResponse.json({ error: "text is too long" }, { status: 400 });
  }

  const prompt = `Create a single square-friendly illustration (no text, no letters, no watermark) for a personal gratitude journal entry.
Mood: warm, hopeful, gentle. Style: soft editorial illustration or painterly digital art, cohesive palette.
Inspiration from the writer (do not depict private real people; use symbolic scenes, nature, light, objects, abstract figures):
${journalText}`;

  const modelChain = buildImageModelTryChain(process.env.GEMINI_SCHEDULE_IMAGE_MODEL);

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  let lastRawText = "";
  let lastModel = modelChain[modelChain.length - 1] ?? DEFAULT_IMAGE_MODEL;

  for (const model of modelChain) {
    lastModel = model;
    const endpoint = `${GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
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
        fail.code === 429 || fail.status === "RESOURCE_EXHAUSTED" || res.status === 429;

      if (quotaHit) {
        const idx = modelChain.indexOf(model);
        if (idx < modelChain.length - 1) continue;

        const qm = fail.quotaModel ?? model;
        let clientError = `Gemini image quota exceeded (${qm}). Models tried: ${modelChain.join(", ")}.`;
        if (fail.limitZero) {
          clientError +=
            " Google reports limit 0 for this usage class: enable billing on the Cloud project tied to your API key, or use a key with image generation access.";
        } else {
          clientError += " Wait and retry, or check https://ai.google.dev/gemini-api/docs/rate-limits";
        }
        return NextResponse.json(
          {
            error: clientError,
            detail: rawText.slice(0, 2000),
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
          detail: rawText.slice(0, 2000),
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
      const imageUrl = `data:${picked.mimeType};base64,${picked.data}`;
      return NextResponse.json({ imageUrl, mimeType: picked.mimeType, model });
    }

    const idx = modelChain.indexOf(model);
    if (idx < modelChain.length - 1) continue;

    return NextResponse.json(
      {
        error: "No image returned by the model",
        hint: "Try another GEMINI_SCHEDULE_IMAGE_MODEL if your project has quota for Pro image models.",
        model,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      error: "Gemini image request failed",
      detail: lastRawText.slice(0, 2000),
      model: lastModel,
      modelsTried: modelChain,
    },
    { status: 502 },
  );
}
