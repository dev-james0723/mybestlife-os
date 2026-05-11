// Supabase Edge Function — `idea-ai-assist`
//
// Takes a captured idea text blob and returns structured suggestions:
// a short title, tags, likely destinations (task / kb / timeline / graph),
// and a suggested capture kind (idea / task / note / goal).
//
// Request body:
//   {
//     "content":      string,  // the idea text (user-authored or voice transcript)
//     "existingKind": string?  // current captureKind, for stability
//   }
//
// Response body (always JSON):
//   {
//     "title":                  string | null,     // <= 60 chars, no trailing period
//     "ai_tags":                string[],           // up to 5 lowercase hyphenated tags
//     "suggestedDestinations":  ("task" | "kb" | "timeline" | "graph")[],
//     "suggestedKind":          "idea" | "task" | "note" | "goal" | null,
//     "relatedNodeIds":         string[]            // reserved for future graph lookup
//   }
//
// Errors: 4xx on auth/payload issues, 5xx on upstream. Client treats any non-200
// as "no suggestion" and keeps manual input intact.
//
// Required env: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.
// Model: claude-haiku-4-5-20251001. Timeout: 10s.

// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Supabase Edge runtime, not the Next.js TS project.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const ALLOWED_DESTINATIONS = new Set(["task", "kb", "timeline", "graph"]);
const ALLOWED_KINDS = new Set(["idea", "task", "note", "goal"]);

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

function clean(s: string | null | undefined, max = 8000): string {
  return (s ?? "").slice(0, max);
}

function coerceSuggestion(raw: any) {
  if (!raw || typeof raw !== "object") {
    return {
      title: null,
      ai_tags: [],
      suggestedDestinations: [],
      suggestedKind: null,
      relatedNodeIds: [],
    };
  }

  const title =
    typeof raw.title === "string"
      ? raw.title.trim().replace(/\.+$/, "").slice(0, 60) || null
      : null;

  const ai_tags = Array.isArray(raw.ai_tags)
    ? raw.ai_tags
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

  const suggestedDestinations = Array.isArray(raw.suggestedDestinations)
    ? raw.suggestedDestinations
        .filter((d: unknown): d is string => typeof d === "string")
        .map((d: string) => d.trim().toLowerCase())
        .filter((d: string) => ALLOWED_DESTINATIONS.has(d))
        .slice(0, 4)
    : [];

  const rawKind =
    typeof raw.suggestedKind === "string"
      ? raw.suggestedKind.trim().toLowerCase()
      : null;
  const suggestedKind =
    rawKind && ALLOWED_KINDS.has(rawKind) ? rawKind : null;

  return {
    title,
    ai_tags,
    suggestedDestinations,
    suggestedKind,
    relatedNodeIds: [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

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

  let payload: { content?: string; existingKind?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const content = clean(payload.content).trim();
  const existingKind = clean(payload.existingKind, 20).trim().toLowerCase();

  if (!content) {
    return json(400, { error: "content is required" });
  }

  const instructions = `You analyze a captured idea or note and return structured metadata to help route it.

Current capture kind (may override if very confident): ${existingKind || "(none)"}

Return ONLY valid JSON with this exact shape:
{
  "title": string,
  "ai_tags": string[],
  "suggestedDestinations": ("task" | "kb" | "timeline" | "graph")[],
  "suggestedKind": "idea" | "task" | "note" | "goal"
}

Rules:
- title: concise noun phrase, <= 60 chars, no trailing period, no quotes.
- ai_tags: up to 5 lowercase hyphenated tags (e.g. "side-project", "career", "learning"). No leading "#".
- suggestedDestinations: pick any that fit (multiple allowed). Heuristics:
  * "task" — the idea includes an actionable verb or clear next step.
  * "kb" — the idea is a fact, quote, reference, or longer reflection worth archiving.
  * "timeline" — the idea is time-bound or marks a moment.
  * "graph" — the idea names a specific person, organization, or project to track.
- suggestedKind: your best guess. Prefer the existing kind unless confidence is high.
- Output JSON only, no fencing, no preamble.

Idea content:
${content}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: instructions }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      return json(502, {
        error: "LLM upstream error",
        detail: errText.slice(0, 400),
      });
    }

    const llm = await response.json();
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
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return json(aborted ? 504 : 500, {
      error: aborted ? "Upstream timeout" : "Unexpected failure",
    });
  } finally {
    clearTimeout(timeout);
  }
});
