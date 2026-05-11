import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import {
  vaultBuildStackRequestSchema,
  type VaultBuildStackResponse,
} from "@/lib/vault/software-library-schema";
import { getVaultIndustryCatalogEntry } from "@/lib/vault/industry-catalog";
import { normalizeVaultBuildStackGeminiJson } from "@/lib/vault/stack-recommend-normalize";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";

export const runtime = "nodejs";

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no_json_object");
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  }
}

const SYSTEM_PROMPT = `You are a senior software stack architect for individuals and small teams.

Return ONLY valid JSON (no markdown fences) with this exact shape. Every field is optional except you MUST include at least one entry in "core_tools".

Shape:
{
  "stack_name": "short title",
  "core_tools": [
    {
      "id": "stable_slug",
      "name": "Product name",
      "website_url": "https://…" or null,
      "category": "short",
      "role_in_stack": "one line",
      "estimated_monthly_cost_usd": <number or null>,
      "workflow_tags": ["tag1", "tag2"]
    }
  ],
  "optional_tools": [ same object shape ],
  "rationale": "why this stack fits the user",
  "estimated_monthly_cost_usd": <rough total USD per month or null>,
  "setup_order": ["step 1", "step 2"],
  "overlap_warnings": ["possible redundancy or risk"],
  "notes": ["caveats"]
}

Rules:
- Prefer real products with real HTTPS URLs when you are confident; otherwise set website_url to null.
- Never invent pricing; use estimated_monthly_cost_usd only when order-of-magnitude is defensible, else null.
- Keep strings plain text — no markdown, no emoji.
- 3–8 core tools, up to 6 optional tools.
- "id" must be unique, lowercase slug, max 80 chars.
- Align tools with the user's industry, privacy, ecosystem, and technical comfort constraints.`;

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const bodyResult = vaultBuildStackRequestSchema.safeParse(parsedBody);
  if (!bodyResult.success) {
    return NextResponse.json({ error: "invalid_request", details: bodyResult.error.flatten() }, { status: 400 });
  }
  const req = bodyResult.data;

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", reset: quota.reset.toISOString() },
      { status: 429 },
    );
  }

  const apiKey = getGeminiServerApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "missing_gemini_key" }, { status: 503 });
  }

  const industryProfile = getVaultIndustryCatalogEntry(req.industry);
  const userText = [
    `industry_slug: ${req.industry}`,
    industryProfile
      ? `industry_profile: ${industryProfile.label} — ${industryProfile.description}`
      : "",
    `role: ${req.role}`,
    `goals: ${req.goals}`,
    `pain_points: ${req.pain_points}`,
    `budget_sensitivity: ${req.budget_sensitivity}`,
    `team_size: ${req.team_size}`,
    `privacy_sensitivity: ${req.privacy_sensitivity}`,
    `ecosystem_preference: ${req.ecosystem_preference}`,
    `technical_comfort: ${req.technical_comfort}`,
  ]
    .filter(Boolean)
    .join("\n");

  let raw: unknown;
  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: SYSTEM_PROMPT,
      userText,
    });
    raw = extractJsonObject(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "gemini_failed";
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/stack-recommend] gemini failed", e);
    }
    return NextResponse.json({ error: "gemini_failed", message: msg }, { status: 502 });
  }

  const normalized = normalizeVaultBuildStackGeminiJson(raw);
  if (!normalized.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/stack-recommend] normalize failed", normalized.error);
    }
    return NextResponse.json(
      { error: "invalid_model_output", code: normalized.error },
      { status: 422 },
    );
  }

  const stack: VaultBuildStackResponse = normalized.data;
  return NextResponse.json({ stack });
}
