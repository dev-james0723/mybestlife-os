import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiStructured,
  getGeminiPlannerTextModel,
  getGeminiServerApiKey,
  type GeminiResponseSchema,
} from "@/lib/ai/gemini-text";
import {
  isOverviewWorthyText,
  overviewLimitedText,
  type OverviewRequestItem,
  type OverviewResult,
} from "@/lib/signals/overview";

export const runtime = "nodejs";

/**
 * POST /api/signals/overview
 *
 * Body: `{ items: { id, headline, snippet, topic, sourceName }[], lang }`.
 *
 * Generates SOURCE-GROUNDED AI overviews for a few HERO items only (§16):
 *  - summarizes ONLY the provided snippet text — never the headline alone;
 *  - never invents facts/numbers/quotes; insufficient text → "Overview limited";
 *  - falls back to the deterministic snippet/limited string when Gemini is
 *    unavailable, over quota, or region-blocked.
 *
 * Cached per-item in memory so the same article is summarized once per process.
 */

type OverviewCacheEntry = { result: OverviewResult; at: number };
const CACHE = new Map<string, OverviewCacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ITEMS = 6;

const SYSTEM_INSTRUCTION = `You write SHORT, source-grounded overviews of news items for a calm daily briefing.

ABSOLUTE RULES:
- Summarize ONLY what is in the provided "snippet" text. Do NOT add facts, numbers, names, dates, or quotes that are not present in the snippet.
- NEVER summarize from the headline alone. If the snippet is thin or missing, return the exact string "Overview limited — open source for full details." for that item.
- Use calm, hedged language that matches the source. No hype, no clickbait, no opinions, no recommendations.
- 1–3 sentences. No preamble.

Return ONLY valid JSON of the shape:
{ "overviews": [ { "id": string, "overview": string } ] }`;

const RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: "object",
  properties: {
    overviews: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          overview: { type: "string" },
        },
        required: ["id", "overview"],
      },
    },
  },
  required: ["overviews"],
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { items?: OverviewRequestItem[]; lang?: string };
  try {
    body = (await request.json()) as { items?: OverviewRequestItem[]; lang?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const lang = body.lang ?? "en";
  const limited = overviewLimitedText(lang);
  const items = (body.items ?? []).slice(0, MAX_ITEMS);

  // Serve cache + collect the items that still need a Gemini summary.
  const out: OverviewResult[] = [];
  const pending: OverviewRequestItem[] = [];
  for (const item of items) {
    if (!item?.id) continue;
    const cached = CACHE.get(item.id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      out.push(cached.result);
      continue;
    }
    if (isOverviewWorthyText(item.snippet)) {
      pending.push(item);
    } else {
      // Honest: not enough source text to summarize.
      out.push({ id: item.id, overview: limited, grounded: false });
    }
  }

  const apiKey = getGeminiServerApiKey();
  if (apiKey && pending.length > 0) {
    try {
      const userText = JSON.stringify(
        pending.map((p) => ({
          id: p.id,
          headline: p.headline,
          source: p.sourceName,
          snippet: p.snippet.slice(0, 1200),
        })),
      );
      const { data } = await fetchGeminiStructured<{ overviews: OverviewResult[] }>({
        apiKey,
        model: getGeminiPlannerTextModel(),
        systemInstruction:
          lang === "zh-TW"
            ? `${SYSTEM_INSTRUCTION}\n\nWrite the overview text in Traditional Chinese. The "Overview limited" fallback string in Traditional Chinese is: "${limited}".`
            : SYSTEM_INSTRUCTION,
        userText,
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
        maxOutputTokens: 1024,
        timeoutMs: 11_000,
      });
      const byId = new Map((data.overviews ?? []).map((o) => [o.id, o.overview]));
      for (const p of pending) {
        const text = byId.get(p.id)?.trim();
        const result: OverviewResult = text
          ? { id: p.id, overview: text, grounded: true }
          : { id: p.id, overview: p.snippet.slice(0, 320), grounded: true };
        CACHE.set(p.id, { result, at: Date.now() });
        out.push(result);
      }
    } catch {
      // Graceful degradation: deterministic snippet stands in (still grounded).
      for (const p of pending) {
        out.push({ id: p.id, overview: p.snippet.slice(0, 320), grounded: true });
      }
    }
  } else {
    // No key — deterministic snippet (grounded, $0).
    for (const p of pending) {
      out.push({ id: p.id, overview: p.snippet.slice(0, 320), grounded: true });
    }
  }

  return NextResponse.json(
    { overviews: out },
    { headers: { "Cache-Control": "private, max-age=600" } },
  );
}
