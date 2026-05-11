// Supabase Edge Function — `suggest-file-metadata`
//
// Accepts a small JSON payload describing a career document and returns a
// strict JSON suggestion block. Never stores the file content.
//
// Request body:
//   {
//     "filename":        string,
//     "mimeType":        string,
//     "contentSample":   string,   // up to 5000 chars of text already extracted client-side
//     "imageBase64":     string?   // optional; set for images when text can't be extracted
//   }
//
// Response body (always JSON):
//   {
//     "suggestedCategory":    CareerVaultCategory | null,
//     "suggestedTags":        string[],
//     "suggestedDescription": string | null,
//     "confidenceScore":      number,          // 0..1
//     "detectedLanguage":     string | null    // ISO-639-1 guess
//   }
//
// Errors: 4xx on auth / payload issues, 5xx on upstream LLM failure. The
// client treats any non-200 or parse error as "no suggestion" and falls back
// to manual entry silently.
//
// Required env:
//   ANTHROPIC_API_KEY
//
// Notes:
// - Model: claude-haiku-4-5-20251001 (cheap, fast, JSON-steady).
// - Timeout: 10s via AbortController so we never block the upload UI.
// - No user content is logged.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — this file targets the Supabase Edge runtime, not the Next.js TS project.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const ALLOWED_CATEGORIES = new Set([
  "resume",
  "cover_letter",
  "photo",
  "bio",
  "portfolio",
  "credential",
  "reference",
  "application",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clean(str: string | null | undefined): string {
  return (str ?? "").slice(0, 5000);
}

function coerceSuggestion(raw: any) {
  if (!raw || typeof raw !== "object") {
    return {
      suggestedCategory: null,
      suggestedTags: [],
      suggestedDescription: null,
      confidenceScore: 0,
      detectedLanguage: null,
    };
  }

  const rawCategory =
    typeof raw.suggestedCategory === "string" ? raw.suggestedCategory : null;
  const suggestedCategory =
    rawCategory && ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : null;

  const suggestedTags = Array.isArray(raw.suggestedTags)
    ? raw.suggestedTags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t: string) =>
          t
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]+/g, ""),
        )
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const rawDescription =
    typeof raw.suggestedDescription === "string"
      ? raw.suggestedDescription.trim().slice(0, 120)
      : null;

  const confidenceScore =
    typeof raw.confidenceScore === "number" &&
    Number.isFinite(raw.confidenceScore)
      ? Math.max(0, Math.min(1, raw.confidenceScore))
      : 0;

  const detectedLanguage =
    typeof raw.detectedLanguage === "string"
      ? raw.detectedLanguage.trim().slice(0, 8) || null
      : null;

  return {
    suggestedCategory,
    suggestedTags,
    suggestedDescription: rawDescription || null,
    confidenceScore,
    detectedLanguage,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  // Require an authenticated user; we don't persist anything, but this keeps
  // anonymous users from burning through our quota.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer token" });
  }
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult?.user) {
      return json(401, { error: "Not authenticated" });
    }
  }

  if (!ANTHROPIC_API_KEY) {
    return json(500, { error: "ANTHROPIC_API_KEY is not configured" });
  }

  let payload: {
    filename?: string;
    mimeType?: string;
    contentSample?: string;
    imageBase64?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const filename = clean(payload.filename).slice(0, 180);
  const mimeType = clean(payload.mimeType).slice(0, 80);
  const textSample = clean(payload.contentSample);
  const imageBase64 =
    typeof payload.imageBase64 === "string" && payload.imageBase64.length < 2_000_000
      ? payload.imageBase64
      : null;

  if (!filename && !textSample && !imageBase64) {
    return json(400, { error: "Provide at least filename or content" });
  }

  const instructions = `You analyze career-related documents and return compact metadata.

Filename: ${filename}
MIME type: ${mimeType}

Return ONLY valid JSON with this shape:
{
  "suggestedCategory": "resume" | "cover_letter" | "photo" | "bio" | "portfolio" | "credential" | "reference" | "application" | null,
  "suggestedTags": string[],
  "suggestedDescription": string,
  "confidenceScore": number,
  "detectedLanguage": string
}

Rules:
- Pick suggestedCategory from the list. If truly unclear, use null.
- suggestedTags: up to 5 lowercase hyphenated tags (e.g. "senior-level", "bay-area", "tech"). No leading "#".
- suggestedDescription: factual, <= 100 characters, no markdown.
- confidenceScore: 0.0 to 1.0.
- detectedLanguage: ISO-639-1 code (e.g. "en", "zh", "ja").
- Output JSON only, no fencing, no preamble.

Content sample:
${textSample || "(no text extracted; rely on filename or image)"}`;

  const userContent: any[] = [{ type: "text", text: instructions }];
  if (imageBase64) {
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: mimeType || "image/png", data: imageBase64 },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: userContent }],
      }),
      signal: controller.signal,
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      return json(502, {
        error: "LLM upstream error",
        detail: errText.slice(0, 400),
      });
    }

    const llm = await anthropicResponse.json();
    const textBlock = Array.isArray(llm?.content)
      ? llm.content.find((b: any) => b?.type === "text")?.text ?? ""
      : "";

    let parsed: unknown = null;
    const trimmed = String(textBlock).trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = null;
      }
    }

    return json(200, coerceSuggestion(parsed));
  } catch (err) {
    const aborted =
      err instanceof DOMException && err.name === "AbortError";
    return json(aborted ? 504 : 500, {
      error: aborted ? "Upstream timeout" : "Unexpected failure",
    });
  } finally {
    clearTimeout(timeout);
  }
});
