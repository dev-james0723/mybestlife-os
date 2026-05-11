/**
 * POST /api/ai/bio-lab/mind-triage
 *
 * Mind Sweep batch insight. Triggered when the panel has 3+ items captured;
 * returns one short observational sentence about the dominant theme.
 *
 * Request body:
 *   { items: { text: string; kind: "task"|"worry"|"idea"|"reminder" }[],
 *     language?: AppLocale, forceRefresh?: boolean }
 */

import { NextResponse } from "next/server";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
} from "@/lib/ai/gemini-text";
import {
  MindTriageSchema,
  MindTriageGeminiSchema,
} from "@/lib/ai/schemas/bio-lab/index";
import { buildMindTriagePrompt } from "@/lib/ai/prompts/bio-lab/index";
import { BIO_LAB_AI_INSIGHT_KINDS } from "@/lib/ai/bio-lab/insight-kinds";
import type { MindTriageResult } from "@/lib/ai/bio-lab/types";
import {
  requireAuthedContext,
  getApiKeyOrFail,
  withInsightCache,
  errorResponse,
} from "../_shared";

export const runtime = "nodejs";

const MIN_ITEMS = 3;
const MAX_ITEMS = 30;
const MAX_TEXT_LENGTH = 600;
const VALID_KINDS = new Set(["task", "worry", "idea", "reminder"]);

type Item = { text: string; kind: "task" | "worry" | "idea" | "reminder" };

export async function POST(request: Request) {
  const auth = await requireAuthedContext(request);
  if (!auth.ok) return auth.response;
  const { ctx, bodyJson } = auth;

  const items = parseItems(bodyJson.items);
  const forceRefresh = bodyJson.forceRefresh === true;

  if (!items) {
    return NextResponse.json({ error: "invalid_items" }, { status: 400 });
  }
  if (items.length < MIN_ITEMS) {
    return NextResponse.json({ error: "too_few_items" }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ error: "too_many_items" }, { status: 413 });
  }

  const apiKeyRes = getApiKeyOrFail();
  if (!apiKeyRes.ok) return apiKeyRes.response;

  try {
    const payload = await withInsightCache<MindTriageResult>({
      ctx,
      kind: BIO_LAB_AI_INSIGHT_KINDS.mindTriage,
      cacheInput: { items },
      forceRefresh,
      allowReturnWithoutCacheOnWriteFailure: true,
      generate: async () => {
        const { data, modelUsed } = await fetchGeminiStructured<unknown>({
          apiKey: apiKeyRes.apiKey,
          model: getGeminiHabitsFlashModel(),
          systemInstruction: buildMindTriagePrompt(ctx.language),
          userText: buildItemsList(items),
          responseSchema: MindTriageGeminiSchema,
          temperature: 0.4,
          maxOutputTokens: 384,
        });
        const validated = MindTriageSchema.parse(data);
        return { content: validated, modelUsed };
      },
    });

    return NextResponse.json(payload);
  } catch (e) {
    return errorResponse(e);
  }
}

function parseItems(raw: unknown): Item[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Item[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const rec = r as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    const kind = typeof rec.kind === "string" ? rec.kind : "";
    if (!text || text.length > MAX_TEXT_LENGTH) return null;
    if (!VALID_KINDS.has(kind)) return null;
    out.push({ text, kind: kind as Item["kind"] });
  }
  return out;
}

function buildItemsList(items: Item[]): string {
  return items.map((it, i) => `${i + 1}. [${it.kind}] ${it.text}`).join("\n");
}
