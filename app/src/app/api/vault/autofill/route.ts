import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { searchDuckDuckGo } from "@/lib/search/duckduckgo-html";
import {
  vaultAutofillRequestSchema,
  vaultAutofillSchema,
  type VaultAutofill,
} from "@/lib/vault/schema";
import { fetchPageMeta, isValidPublicUrl } from "@/lib/vault/safe-fetch";
import { resolveIcon } from "@/lib/vault/icon-resolver";
import { uploadVaultIconFromRemoteUrl } from "@/lib/vault/icon-storage";
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

async function resolveWebsiteFromQuery(query: string): Promise<string | null> {
  if (isValidPublicUrl(query)) return query;
  const withScheme = `https://${query}`;
  if (isValidPublicUrl(withScheme) && /\./.test(query)) {
    return withScheme;
  }
  const hits = await searchDuckDuckGo(`${query} official site`).catch(() => []);
  for (const hit of hits) {
    if (isValidPublicUrl(hit.url)) return hit.url;
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert software catalog assistant for a personal productivity app.
Given a software product (URL or name) along with scraped page hints, write a concise catalog entry.

Return ONLY valid JSON (no markdown fences) matching this shape exactly, with every field optional:
{
  "app_name": "string",
  "website_url": "https://…",
  "category": "Productivity | Dev Tools | Design | Communication | Finance | …",
  "platforms": "macOS, iOS, Web, …",
  "use_cases": "1-3 short phrases separated by commas",
  "status": "Testing | Active | Retired | Wishlist",
  "priority": "Must-have | Nice-to-have | Optional",
  "cost_type": "Free | Freemium | Paid | Subscription",
  "cost_amount": <number or null>,
  "cost_period": "month | year | one-time",
  "summary": "<= 1 sentence, under 160 characters",
  "best_feature": "<= 140 characters",
  "biggest_downside": "<= 140 characters",
  "best_alternative": "One or two product names",
  "tags": "comma-separated short tags",
  "default_tool_for": "What job this is the go-to tool for"
}

Guidelines:
- If you are unsure about a field, omit it rather than guess.
- Use "Active" as the default status, "Nice-to-have" as default priority.
- Derive cost_amount + cost_period only when the pricing page is unambiguous; leave null otherwise.
- Never invent a website URL; if unknown, omit it.
- Keep every string plain — no markdown, no emoji.`;

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

  const bodyResult = vaultAutofillRequestSchema.safeParse(parsedBody);
  if (!bodyResult.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { query } = bodyResult.data;

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

  // Step 1: resolve a canonical URL for the product.
  const resolvedUrl = await resolveWebsiteFromQuery(query);

  // Step 2: safely fetch page metadata if we have a URL.
  const pageMeta = resolvedUrl ? await fetchPageMeta(resolvedUrl) : null;

  // Step 3: call Gemini for catalog fields.
  const hintLines: string[] = [];
  hintLines.push(`User query: ${query}`);
  if (resolvedUrl) hintLines.push(`Canonical URL: ${resolvedUrl}`);
  if (pageMeta?.title) hintLines.push(`Page title: ${pageMeta.title}`);
  if (pageMeta?.description) hintLines.push(`Page description: ${pageMeta.description}`);

  let draft: VaultAutofill = {};
  try {
    const { text } = await fetchGeminiPlannerJsonText({
      apiKey,
      systemInstruction: SYSTEM_PROMPT,
      userText: hintLines.join("\n"),
    });
    const parsed = extractJsonObject(text);
    const schemaResult = vaultAutofillSchema.safeParse(parsed);
    if (schemaResult.success) {
      draft = schemaResult.data;
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/autofill] schema validation failed", schemaResult.error);
    }
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/autofill] gemini failed", e);
    }
  }

  // Step 4: resolve icon (best-effort).
  const websiteForIcon = draft.website_url ?? resolvedUrl ?? null;
  const icon = await resolveIcon({
    websiteUrl: websiteForIcon,
    pageHtml: pageMeta?.html ?? null,
  });

  // Merge fallback website URL if the model didn't return one.
  if (!draft.website_url && resolvedUrl) {
    draft.website_url = resolvedUrl;
  }
  if (!draft.app_name && pageMeta?.title) {
    draft.app_name = pageMeta.title.replace(/\s*[|—–-].*$/, "").trim().slice(0, 80);
  }

  let hostedIconUrl: string | null = null;
  if (icon?.url) {
    hostedIconUrl = await uploadVaultIconFromRemoteUrl(supabase, user.id, icon.url);
  }

  const aiGeneratedFields = Object.entries(draft)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k]) => k);

  const finalIconUrl = hostedIconUrl ?? icon?.url;
  if (finalIconUrl && !aiGeneratedFields.includes("icon_url")) {
    aiGeneratedFields.push("icon_url");
  }

  return NextResponse.json({
    fields: {
      ...draft,
      ...(finalIconUrl ? { icon_url: finalIconUrl } : {}),
    },
    ai_generated_fields: aiGeneratedFields,
    debug:
      process.env.NODE_ENV !== "production"
        ? {
            resolvedUrl,
            iconSource: icon?.source,
            iconHosted: !!hostedIconUrl,
            titleHint: pageMeta?.title,
          }
        : undefined,
  });
}
