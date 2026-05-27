import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiGroundedText,
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiHabitsProModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { VaultAutofillGeminiSchema } from "@/lib/ai/schemas/vault/autofill";
import { searchDuckDuckGo } from "@/lib/search/duckduckgo-html";
import { parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";
import { fetchPageMeta, isValidPublicUrl } from "@/lib/vault/safe-fetch";
import { resolveIcon } from "@/lib/vault/icon-resolver";
import { uploadVaultIconFromRemoteUrl } from "@/lib/vault/icon-storage";
import { buildGitHubVaultContext, GITHUB_VAULT_SYSTEM_PROMPT } from "@/lib/vault/github-autofill";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";
import {
  buildFieldSources,
  computeNeedsConfirmation,
  extractionToFormFields,
  mergeFieldConfidence,
  normalizeAlternatives,
  normalizePricingPlans,
  normalizeTags,
  pricingPlansToLegacyOptions,
  vaultAutofillExtractionSchema,
  type VaultAutofillExtraction,
} from "@/lib/vault/autofill-v2";
import type { AppCandidate } from "@/types/vault-smart-autofill";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  query: z.string().trim().min(1).max(400),
  candidate: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      icon_url: z.string().optional(),
      official_url: z.string().optional(),
      github_url: z.string().optional(),
      company: z.string().optional(),
      software_type: z.string().optional(),
    })
    .optional(),
});

const RESEARCH_PROMPT = `You are researching a software product for a personal software vault catalog.
Use web search to find:
- Official product name and one-line positioning
- Official website and pricing page URL
- Public subscription tiers with prices (Free, Plus, Pro, Team, Enterprise, etc.)
- Top 3-5 competitor alternatives with one-line reasons
- Platforms supported (macOS, Windows, Web, CLI, etc.)
- Typical use cases and who it's for
- Main strengths and honest downsides
- What workflow or tools it replaces

Write structured research notes in plain text. Cite specific plan names and prices when found on official pages. If open-source, state license and that it's free.`;

const EXTRACTION_PROMPT = `Extract a complete software vault catalog entry from the research notes.
Return JSON matching the schema. Rules:
- Fill EVERY required field with concrete, specific text — no placeholders like "TBD" or "Manual workflow".
- tags: 5-10 short tags as array (category, tech, use case, platform).
- pricing_plans: include at least Free when applicable; include paid tiers with price when known from research.
- alternative_options: 3-5 objects with name and reason; best_alternative must equal the top alternative name.
- replaces: describe a specific workflow this tool replaces.
- default_tool_for: one clear job-to-be-done sentence.
- field_confidence: per-field high/medium/low based on how explicit the research was.
- status default Active, priority Nice-to-have.
- Never invent website URLs not supported by research.`;

const FORM_FIELD_KEYS = new Set([
  "app_name",
  "website_url",
  "icon_url",
  "category",
  "platforms",
  "use_cases",
  "status",
  "priority",
  "cost_type",
  "cost_amount",
  "cost_period",
  "why_i_use_it",
  "best_feature",
  "biggest_downside",
  "best_alternative",
  "replaces",
  "tags",
  "default_tool_for",
  "summary",
]);

async function resolveWebsiteFromQuery(query: string): Promise<string | null> {
  if (isValidPublicUrl(query)) return query;
  const withScheme = `https://${query}`;
  if (isValidPublicUrl(withScheme) && /\./.test(query)) return withScheme;
  const hits = await searchDuckDuckGo(`${query} official site`).catch(() => []);
  for (const hit of hits) {
    if (isValidPublicUrl(hit.url)) return hit.url;
  }
  return null;
}

async function buildPricingHintLines(query: string, resolvedUrl: string | null): Promise<string[]> {
  const searchQuery = resolvedUrl
    ? `${query} pricing plans subscription ${resolvedUrl}`
    : `${query} pricing plans subscription`;
  const hits = await searchDuckDuckGo(searchQuery, { maxHits: 5 }).catch(() => []);
  if (!hits.length) return [];
  return [
    "Pricing search hints:",
    ...hits.map((h) => `- ${h.title} | ${h.url}${h.snippet ? ` | ${h.snippet}` : ""}`),
  ];
}

function coerceExtraction(raw: unknown): VaultAutofillExtraction | null {
  const parsed = vaultAutofillExtractionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.tags === "string") {
      o.tags = o.tags.split(/[,;]+/).map((t) => t.trim());
    }
    const retry = vaultAutofillExtractionSchema.safeParse(o);
    if (retry.success) return retry.data;
  }
  return null;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { query, candidate: candidateInput } = parsed.data;

  const quota = await consumeVaultAutofillQuota({
    supabase,
    userId: user.id,
    cost: 2,
  });
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

  const candidate = candidateInput as AppCandidate | undefined;
  const resolvedUrl =
    candidate?.official_url ??
    candidate?.github_url ??
    (await resolveWebsiteFromQuery(query));

  const githubInputUrl =
    parseGitHubRepoUrl(query) != null
      ? query
      : resolvedUrl && parseGitHubRepoUrl(resolvedUrl) != null
        ? resolvedUrl
        : candidate?.github_url && parseGitHubRepoUrl(candidate.github_url) != null
          ? candidate.github_url
          : null;

  const githubContext = githubInputUrl
    ? await buildGitHubVaultContext(githubInputUrl).catch(() => null)
    : null;

  const pageMeta =
    resolvedUrl && !githubContext ? await fetchPageMeta(resolvedUrl) : null;

  const hintLines: string[] = [
    `User query: ${query}`,
    candidate ? `Selected product: ${candidate.name}` : "",
    candidate?.description ? `Product hint: ${candidate.description}` : "",
    ...(githubContext ? githubContext.hintLines : []),
    ...(!githubContext && resolvedUrl ? [`Canonical URL: ${resolvedUrl}`] : []),
    ...(pageMeta?.title ? [`Page title: ${pageMeta.title}`] : []),
    ...(pageMeta?.description ? [`Page description: ${pageMeta.description}`] : []),
    ...(await buildPricingHintLines(query, resolvedUrl)),
  ].filter((line): line is string => typeof line === "string" && line.length > 0);

  const model = getGeminiHabitsProModel();
  const fallback = getGeminiHabitsFlashModel();

  let extraction: VaultAutofillExtraction | null = null;

  try {
    const productLabel = candidate?.name ?? query;
    let researchNotes = "";

    if (githubContext) {
      researchNotes = [
        "GitHub README research:",
        githubContext.readmeMarkdown.slice(0, 10_000),
        ...githubContext.hintLines,
      ].join("\n");
    } else {
      const { text } = await fetchGeminiGroundedText({
        apiKey,
        model,
        systemInstruction: RESEARCH_PROMPT,
        userText: `Research this software product: ${productLabel}\n\nContext:\n${hintLines.join("\n")}`,
        temperature: 0.4,
        maxOutputTokens: 8192,
        timeoutMs: 50_000,
        fallbackModel: fallback,
      });
      researchNotes = text;
    }

    const systemInstruction = githubContext
      ? `${GITHUB_VAULT_SYSTEM_PROMPT}\n\n${EXTRACTION_PROMPT}`
      : EXTRACTION_PROMPT;

    const { data: rawJson } = await fetchGeminiStructured<unknown>({
      apiKey,
      model,
      systemInstruction,
      userText: ["Research notes:", "", researchNotes, "", "Context hints:", hintLines.join("\n")].join(
        "\n",
      ),
      responseSchema: VaultAutofillGeminiSchema,
      temperature: 0.3,
      maxOutputTokens: 4096,
      timeoutMs: 45_000,
      fallbackModel: fallback,
    });

    extraction = coerceExtraction(rawJson);
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/autofill] v2 pipeline failed", e);
    }
  }

  if (!extraction) {
    extraction = {
      app_name: candidate?.name ?? query,
      category: "Software",
      platforms: "Web",
      use_cases: "Productivity and workflow",
      summary: `${candidate?.name ?? query} is a software tool in your vault.`,
      best_feature: "Core product capabilities for your workflow",
      biggest_downside: "Verify pricing and fit before committing",
      best_alternative: "Comparable tool in the same category",
      replaces: "A less focused manual workflow",
      default_tool_for: `Using ${candidate?.name ?? query} for its primary job`,
      tags: ["Software", candidate?.name ?? query].filter(Boolean) as string[],
      why_i_use_it: `I'd use ${candidate?.name ?? query} when it fits my workflow best.`,
      cost_type: "Free",
      pricing_plans: normalizePricingPlans(undefined),
      alternative_options: [],
      field_confidence: {},
    };
  }

  if (!extraction.website_url) {
    extraction.website_url =
      candidate?.official_url ??
      githubContext?.repoMeta.homepage ??
      githubContext?.canonicalUrl ??
      resolvedUrl ??
      undefined;
  }
  if (!extraction.github_url && (candidate?.github_url ?? githubContext?.canonicalUrl)) {
    extraction.github_url = candidate?.github_url ?? githubContext?.canonicalUrl;
  }
  if (!extraction.app_name) {
    extraction.app_name =
      candidate?.name ??
      githubContext?.repoMeta.name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ??
      pageMeta?.title?.replace(/\s*[|—–-].*$/, "").trim().slice(0, 80) ??
      query;
  }

  const pricingPlans = normalizePricingPlans(extraction.pricing_plans);
  const alternativeOptions = normalizeAlternatives(
    extraction.alternative_options,
    extraction.best_alternative,
  );
  extraction.best_alternative = alternativeOptions[0]?.name ?? extraction.best_alternative;
  extraction.tags = normalizeTags(extraction.tags);

  const formFields = extractionToFormFields(extraction, candidate);
  let fieldConfidence = mergeFieldConfidence(extraction, []);
  const needsUserConfirmation = computeNeedsConfirmation(formFields, fieldConfidence);

  for (const key of needsUserConfirmation) {
    fieldConfidence = { ...fieldConfidence, [key]: "needs_user_confirmation" };
  }

  const fieldSources = buildFieldSources({
    fields: formFields,
    fieldConfidence,
    hasGithub: !!githubContext,
    hasOfficialPage: !!pageMeta || !!candidate?.official_url,
    hasPricingSearch: true,
  });

  let iconUrl: string | null = githubContext?.iconUrl ?? candidate?.icon_url ?? null;
  if (!iconUrl) {
    const websiteForIcon =
      extraction.website_url ?? githubContext?.repoMeta.homepage ?? resolvedUrl ?? null;
    const icon = await resolveIcon({
      websiteUrl: websiteForIcon,
      pageHtml: pageMeta?.html ?? null,
    });
    iconUrl = icon?.url ?? null;
  }

  let hostedIconUrl: string | null = null;
  if (iconUrl) {
    hostedIconUrl = await uploadVaultIconFromRemoteUrl(supabase, user.id, iconUrl);
  }
  const finalIconUrl = hostedIconUrl ?? iconUrl;
  if (finalIconUrl) {
    formFields.icon_url = finalIconUrl;
    fieldConfidence = { ...fieldConfidence, icon_url: "high" };
  }

  const aiGeneratedFields = Object.keys(formFields).filter(
    (k) => FORM_FIELD_KEYS.has(k) && formFields[k] != null && String(formFields[k]).trim() !== "",
  );

  return NextResponse.json({
    fields: formFields,
    pricing_plans: pricingPlans,
    pricing_options: pricingPlansToLegacyOptions(pricingPlans),
    alternative_options: alternativeOptions,
    field_sources: fieldSources,
    field_confidence: fieldConfidence,
    needs_user_confirmation: needsUserConfirmation,
    ai_generated_fields: aiGeneratedFields,
    debug:
      process.env.NODE_ENV !== "production"
        ? { resolvedUrl, github: githubContext?.repoMeta.fullName ?? null }
        : undefined,
  });
}
