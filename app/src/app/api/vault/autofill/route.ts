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
import { isLikelyProductCandidate } from "@/lib/vault/identity-resolver";
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
import type { AppCandidate, ConfidenceLevel, FieldSource } from "@/types/vault-smart-autofill";

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
Use official pages, GitHub, and web search to find evidence-backed facts:
- Official product name and one-line positioning
- Official website and pricing page URL
- Public subscription tiers with prices when an official pricing page is found
- Top competitor alternatives with one-line reasons
- Platforms supported (macOS, Windows, Web, CLI, etc.)
- Typical public use cases and who it's for
- Main strengths and honest downsides
- The workflow category it usually replaces

Write structured research notes in plain text. Separate verified facts from uncertain or missing information. Do not fill gaps with generic product assumptions.`;

const EXTRACTION_PROMPT = `Extract a software vault catalog entry from the research notes.
Return JSON matching the schema. Rules:
- Only include a field when the notes provide evidence for that exact product.
- Leave unknown fields omitted or empty. Never use generic placeholders like "Productivity and workflow", "Core product capabilities", "Comparable tool", or "Manual workflow".
- Do not fill user-specific fields such as status, priority, or why_i_use_it.
- pricing_plans: include tiers only when they are found in official pricing or trusted public notes. Do not invent a Free plan.
- alternative_options: include competitors only when research notes identify them.
- field_confidence: high for official/GitHub facts, medium for supported search facts, low only when uncertain.
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
    if (isValidPublicUrl(hit.url) && isLikelyProductCandidate(query, hit.title, hit.url)) {
      return hit.url;
    }
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

function confidenceForFallbackField(field: string, hasSource: boolean): ConfidenceLevel {
  if (field === "app_name" && !hasSource) return "user_confirmed";
  return hasSource ? "high" : "user_confirmed";
}

function buildMinimalAutofillResponse(params: {
  query: string;
  candidate?: AppCandidate;
  resolvedUrl: string | null;
  githubUrl: string | null;
  pageTitle?: string | null;
}) {
  const appName =
    params.candidate?.name ??
    params.pageTitle?.replace(/\s*[|—–-].*$/, "").trim().slice(0, 80) ??
    params.query;
  const websiteUrl =
    params.candidate?.official_url ??
    params.resolvedUrl ??
    params.githubUrl ??
    "";
  const hasNameSource = Boolean(params.candidate || params.pageTitle);
  const fields: Record<string, string> = { app_name: appName };
  const fieldConfidence: Record<string, ConfidenceLevel> = {
    app_name: confidenceForFallbackField("app_name", hasNameSource),
  };
  const fieldSources: FieldSource[] = [
    {
      field: "app_name",
      source_type: hasNameSource ? "official_site" : "user_input",
      confidence: fieldConfidence.app_name,
      fetched_at: new Date().toISOString(),
    },
  ];

  if (websiteUrl) {
    fields.website_url = websiteUrl;
    fieldConfidence.website_url = "high";
    fieldSources.push({
      field: "website_url",
      source_type: params.githubUrl ? "github" : "official_site",
      source_url: websiteUrl,
      confidence: "high",
      fetched_at: new Date().toISOString(),
    });
  }

  const aiGeneratedFields = Object.entries(fieldConfidence)
    .filter(([, confidence]) => confidence !== "user_confirmed")
    .map(([field]) => field);

  return {
    fields,
    pricing_plans: [],
    pricing_options: [],
    alternative_options: [],
    field_sources: fieldSources,
    field_confidence: fieldConfidence,
    needs_user_confirmation: [],
    ai_generated_fields: aiGeneratedFields,
    partial: true,
  };
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
    return NextResponse.json(
      buildMinimalAutofillResponse({
        query,
        candidate,
        resolvedUrl,
        githubUrl: githubContext?.canonicalUrl ?? githubInputUrl,
        pageTitle: pageMeta?.title,
      }),
    );
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
  delete formFields.why_i_use_it;
  delete formFields.status;
  delete formFields.priority;
  let fieldConfidence = mergeFieldConfidence(extraction, []);
  for (const [field, confidence] of Object.entries(fieldConfidence)) {
    if (confidence === "low" || confidence === "needs_user_confirmation") {
      delete formFields[field];
    }
  }
  fieldConfidence = Object.fromEntries(
    Object.entries(fieldConfidence).filter(([field]) => {
      const value = formFields[field];
      return value != null && String(value).trim() !== "";
    }),
  ) as Record<string, ConfidenceLevel>;
  for (const [field, value] of Object.entries(formFields)) {
    if (value != null && String(value).trim() !== "" && !fieldConfidence[field]) {
      fieldConfidence[field] = "medium";
    }
  }
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
    hasSearch: true,
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
