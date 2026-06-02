import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fetchGeminiPlannerJsonText,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import { parseGitHubRepoUrl } from "@/lib/knowledge/github-readme";
import { buildGitHubVaultContext } from "@/lib/vault/github-autofill";
import { resolveCandidates } from "@/lib/vault/identity-resolver";
import { fetchPageMeta, isValidPublicUrl } from "@/lib/vault/safe-fetch";
import { resolveIcon } from "@/lib/vault/icon-resolver";
import { consumeVaultAutofillQuota } from "@/lib/vault/rate-limit";
import {
  DEFAULT_PRODUCT_RESEARCH_SETTINGS,
  productResearchRequestSchema,
  productResearchResponseSchema,
  type ProductResearchResponse,
} from "@/lib/vault/intelligence-schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("no_json_object");
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

function firstSentence(value: string | null | undefined): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const match = text.match(/^(.{20,220}?[.!?])\s/);
  return (match?.[1] ?? text.slice(0, 220)).trim();
}

function isGithubUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return parseGitHubRepoUrl(value) != null;
}

function officialSource(title: string, url: string, usedFor: string[]) {
  return { title, url, sourceType: "official" as const, usedFor };
}

function buildManualIllustrationPrompt(report: ProductResearchResponse): string {
  const features =
    report.analysisReport?.coreFeatures
      ?.filter((f) => f.confirmed)
      .slice(0, 5)
      .map((f) => `${f.title}: ${f.description}`)
      .join("; ") || "confirmed product capabilities from the research report";
  return [
    "Create a 16:9 horizontal manual-style feature explanation illustration.",
    `Product: ${report.productName}.`,
    report.iconLogo ? `Use the source-backed logo/icon as a small header mark: ${report.iconLogo.imageUrl}.` : "",
    `One-line explanation: ${report.oneSentenceSummary ?? "Explain what the product does without inventing details."}`,
    `Feature breakdown: ${features}.`,
    "Layout: clean modern manual page, labeled panels, arrows, callouts, step-by-step user flow.",
    "Do not invent fake features, pricing, screenshots, or UI details.",
  ]
    .filter(Boolean)
    .join(" ");
}

function fallbackReport(params: {
  productName: string;
  targetUrl: string | null;
  activeSettings: ProductResearchResponse["activeSettings"];
  pageTitle?: string | null;
  pageDescription?: string | null;
  github?: Awaited<ReturnType<typeof buildGitHubVaultContext>> | null;
  iconLogo?: ProductResearchResponse["iconLogo"];
  modelUsed?: string | null;
}): ProductResearchResponse {
  const github = params.github;
  const canonicalUrl = github?.canonicalUrl ?? params.targetUrl ?? null;
  const productName =
    github?.repoMeta.name.replace(/[-_]+/g, " ") ||
    params.pageTitle?.replace(/\s*[|—–-].*$/, "").trim() ||
    params.productName;
  const summary =
    github?.repoMeta.description ??
    firstSentence(params.pageDescription) ??
    `Research report for ${productName}.`;
  const sources = [
    ...(canonicalUrl ? [officialSource(github ? "GitHub repository" : "Official/product page", canonicalUrl, ["identity", "overview"])] : []),
  ];

  const report: ProductResearchResponse = {
    activeSettings: params.activeSettings,
    productName,
    officialLinks: {
      officialWebsite: github?.repoMeta.homepage ?? (!github ? canonicalUrl : null),
      githubRepo: github?.canonicalUrl ?? null,
    },
    iconLogo: params.activeSettings.fetchIconLogo ? params.iconLogo ?? null : null,
    oneSentenceSummary: summary,
    analysisReport: params.activeSettings.generateAnalysisReport
      ? {
          productOverview: summary,
          coreFeatures: github?.repoMeta.topics?.slice(0, 5).map((topic) => ({
            title: topic,
            description: `Repository topic listed by GitHub: ${topic}.`,
            confirmed: true,
            sourceUrls: [github.canonicalUrl],
          })) ?? [],
          userWorkflow: [],
          mainUseCases: [],
          targetUsers: [],
          strengths: github?.repoMeta.stars != null ? [`Public repository has ${github.repoMeta.stars.toLocaleString()} GitHub stars.`] : [],
          weaknessesOrLimitations: ["Feature/pricing details need confirmation from official documentation."],
          competitivePositioning: params.activeSettings.includeSimilarProducts
            ? "Alternatives were not generated from verified sources in the fallback report."
            : null,
          finalVerdict: github ? "Technically interesting; review README and setup fit before adding." : "Worth reviewing with official sources before adding.",
        }
      : null,
    similarProducts: params.activeSettings.includeSimilarProducts ? [] : null,
    technicalGithubAnalysis:
      params.activeSettings.includeTechnicalGithubAnalysis === true && github
        ? {
            repoUrl: github.canonicalUrl,
            description: github.repoMeta.description ?? undefined,
            stars: github.repoMeta.stars,
            forks: null,
            license: github.repoMeta.license,
            primaryLanguage: null,
            techStack: github.repoMeta.topics ?? [],
            documentationQuality: github.readmeMarkdown.length > 2000 ? "okay" : "unknown",
            repoActivity: "unknown",
            openIssues: null,
            maintainabilityNotes: ["Repo activity and issue volume were not fetched in this fallback analysis."],
            developerExperience: github.readmeMarkdown ? "README is available for manual review." : "README was not available.",
            risks: ["GitHub activity, forks, issues, and install reliability should be verified before relying on this tool."],
          }
        : null,
    manualIllustrationPrompt: null,
    sources,
    unknowns: [
      "Official pricing unless a pricing source is listed.",
      "Repo activity and issue count unless shown in GitHub analysis.",
      "Exact feature set beyond source-backed snippets.",
    ],
    warnings: ["Fallback report avoids unsupported claims; run refresh with official sources if more detail is needed."],
    generatedAt: new Date().toISOString(),
    modelUsed: params.modelUsed ?? null,
  };

  if (params.activeSettings.generateManualIllustration) {
    report.manualIllustrationPrompt = buildManualIllustrationPrompt(report);
  }
  return productResearchResponseSchema.parse(report);
}

async function buildAiReport(params: {
  apiKey: string;
  productName: string;
  targetUrl: string | null;
  activeSettings: ProductResearchResponse["activeSettings"];
  sourceNotes: string;
  fallback: ProductResearchResponse;
}): Promise<ProductResearchResponse | null> {
  const systemInstruction = `You are a careful product research analyst for a personal Software Vault.
Return ONLY valid JSON. Do not use markdown.
Do not invent pricing, logos, screenshots, GitHub stats, repo activity, license, or features.
Only include facts supported by the supplied source notes. If a fact is missing, put it in unknowns.
Respect activeSettings: disabled sections must be null or empty. Recommendations are review suggestions, not commands.`;

  const userText = [
    `activeSettings: ${JSON.stringify(params.activeSettings)}`,
    `target product: ${params.productName}`,
    params.targetUrl ? `target URL: ${params.targetUrl}` : "",
    "Required JSON keys:",
    JSON.stringify({
      activeSettings: params.activeSettings,
      productName: "string",
      officialLinks: {
        officialWebsite: "url or null",
        githubRepo: "url or null",
        appStore: "url or null",
        googlePlay: "url or null",
        documentation: "url or null",
        pricing: "url or null",
      },
      iconLogo: "object or null",
      oneSentenceSummary: "string or null",
      analysisReport: "object or null",
      similarProducts: "array or null",
      technicalGithubAnalysis: "object or null",
      manualIllustrationPrompt: "string or null",
      sources: "array",
      unknowns: "array",
      warnings: "array",
      generatedAt: new Date().toISOString(),
      modelUsed: "string",
    }),
    "Source notes:",
    params.sourceNotes,
    "Fallback report to improve, preserving its caution:",
    JSON.stringify(params.fallback),
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { text, modelUsed } = await fetchGeminiPlannerJsonText({
      apiKey: params.apiKey,
      systemInstruction,
      userText,
    });
    const raw = extractJsonObject(text);
    const parsed = productResearchResponseSchema.safeParse({
      ...(raw && typeof raw === "object" ? raw : {}),
      activeSettings: params.activeSettings,
      generatedAt:
        raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).generatedAt === "string"
          ? (raw as Record<string, string>).generatedAt
          : new Date().toISOString(),
      modelUsed,
    });
    if (!parsed.success) return null;
    const data = parsed.data;
    if (params.activeSettings.generateManualIllustration && !data.manualIllustrationPrompt) {
      data.manualIllustrationPrompt = buildManualIllustrationPrompt(data);
    }
    return data;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[vault/product-research] AI report failed", e);
    }
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = productResearchRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const quota = await consumeVaultAutofillQuota({ supabase, userId: user.id, cost: 3 });
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "rate_limited", reset: quota.reset.toISOString() },
      { status: 429 },
    );
  }

  const req = parsed.data;
  const settings = { ...DEFAULT_PRODUCT_RESEARCH_SETTINGS, ...(req.settings ?? {}) };
  const candidate = await resolveCandidates(req.targetUrl ?? req.productName).catch(() => null);
  const targetUrl =
    req.targetUrl ??
    candidate?.autoSelect?.official_url ??
    candidate?.autoSelect?.github_url ??
    candidate?.candidates[0]?.official_url ??
    candidate?.candidates[0]?.github_url ??
    (isValidPublicUrl(req.productName) ? req.productName : null);
  const githubUrl =
    isGithubUrl(targetUrl) ? targetUrl : candidate?.autoSelect?.github_url ?? candidate?.candidates[0]?.github_url ?? null;
  const github = githubUrl ? await buildGitHubVaultContext(githubUrl).catch(() => null) : null;
  const includeGithub =
    settings.includeTechnicalGithubAnalysis === true ||
    (settings.includeTechnicalGithubAnalysis === "only_if_github_repo_available" && !!github);
  const activeSettings: ProductResearchResponse["activeSettings"] = {
    generateAnalysisReport: Boolean(settings.generateAnalysisReport),
    generateManualIllustration: Boolean(settings.generateManualIllustration),
    fetchIconLogo: Boolean(settings.fetchIconLogo),
    includeSimilarProducts: Boolean(settings.includeSimilarProducts),
    includeTechnicalGithubAnalysis: includeGithub ? true : "skipped",
  };

  const pageUrl = github?.repoMeta.homepage ?? (targetUrl && !github ? targetUrl : null);
  const pageMeta = pageUrl ? await fetchPageMeta(pageUrl).catch(() => null) : null;
  const icon =
    activeSettings.fetchIconLogo && (github?.iconUrl || pageUrl)
      ? github?.iconUrl
        ? { url: github.iconUrl, sourceUrl: github.canonicalUrl, sourceType: "github_avatar" as const }
        : await resolveIcon({ websiteUrl: pageUrl, pageHtml: pageMeta?.html ?? null }).catch(() => null)
      : null;
  const iconLogo: ProductResearchResponse["iconLogo"] | null =
    activeSettings.fetchIconLogo && icon?.url
      ? {
          imageUrl: icon.url,
          sourceUrl: "sourceUrl" in icon ? icon.sourceUrl : pageUrl ?? icon.url,
          sourceType:
            "sourceType" in icon
              ? icon.sourceType
              : icon.url.includes("favicon")
                ? "favicon"
                : "official_website",
          confidence: github?.iconUrl ? "medium" : "medium",
          notes: icon.url.includes("favicon") ? "Favicon candidate; may be low resolution." : undefined,
        }
      : null;

  const fallback = fallbackReport({
    productName: req.productName,
    targetUrl,
    activeSettings,
    pageTitle: pageMeta?.title,
    pageDescription: pageMeta?.description,
    github,
    iconLogo,
  });

  const sourceNotes = [
    `Product name: ${req.productName}`,
    targetUrl ? `Target URL: ${targetUrl}` : "",
    pageMeta?.title ? `Page title: ${pageMeta.title}` : "",
    pageMeta?.description ? `Page description: ${pageMeta.description}` : "",
    github
      ? [
          `GitHub repo: ${github.canonicalUrl}`,
          `Description: ${github.repoMeta.description ?? "unknown"}`,
          `Stars: ${github.repoMeta.stars ?? "unknown"}`,
          `License: ${github.repoMeta.license ?? "unknown"}`,
          `Topics: ${github.repoMeta.topics.join(", ") || "unknown"}`,
          `README excerpt:\n${github.readmeMarkdown.slice(0, 7000)}`,
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const apiKey = getGeminiServerApiKey();
  const ai = apiKey
    ? await buildAiReport({
        apiKey,
        productName: req.productName,
        targetUrl,
        activeSettings,
        sourceNotes,
        fallback,
      })
    : null;

  return NextResponse.json(ai ?? fallback);
}
