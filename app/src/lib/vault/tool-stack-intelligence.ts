import type { SoftwareVaultEntry } from "@/types/database";
import type {
  DefaultToolRecommendation,
  DefaultToolRecommendationResponse,
  OverlapAuditResponse,
  PageIntelligenceResponse,
  ProjectStackRequest,
  ProjectStackResponse,
  SubscriptionAuditResponse,
  ToolStackInsight,
  WorkflowRecipeRequest,
  WorkflowRecipeResponse,
} from "@/lib/vault/intelligence-schemas";

const CAPABILITY_RULES = [
  {
    id: "documentation",
    title: "Documentation layer",
    keywords: [/doc/i, /wiki/i, /note/i, /knowledge/i, /notion/i, /obsidian/i],
    detail: "No obvious documentation or notes layer was detected in the saved tool stack.",
    recommendation: "Review whether a durable notes/wiki tool should be part of your default stack.",
  },
  {
    id: "automation",
    title: "Automation layer",
    keywords: [/automation/i, /zapier/i, /make\b/i, /n8n/i, /workflow/i],
    detail: "No obvious automation layer was detected from categories, tags, or use cases.",
    recommendation: "Consider whether recurring handoffs should be turned into a tool-backed workflow.",
  },
  {
    id: "communication",
    title: "Communication layer",
    keywords: [/slack/i, /chat/i, /email/i, /message/i, /meeting/i, /zoom/i],
    detail: "No obvious communication or meeting layer was detected.",
    recommendation: "Confirm where project communication, meetings, and async updates actually happen.",
  },
  {
    id: "storage",
    title: "Storage layer",
    keywords: [/drive/i, /storage/i, /dropbox/i, /cloud/i, /file/i, /asset/i],
    detail: "No obvious file storage or asset source of truth was detected.",
    recommendation: "Pick one default place for project files before tool links fragment.",
  },
  {
    id: "finance",
    title: "Finance layer",
    keywords: [/finance/i, /account/i, /invoice/i, /billing/i, /quickbooks/i, /stripe/i],
    detail: "No obvious finance, billing, or accounting layer was detected.",
    recommendation: "Review whether money-related workflows need a dedicated default tool.",
  },
] as const;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "tool",
  "app",
  "software",
  "platform",
  "project",
  "work",
  "use",
  "using",
  "from",
  "into",
]);

export function estimateMonthlyUsd(entry: SoftwareVaultEntry): number {
  if (entry.cost_amount == null) return 0;
  const amount = Number(entry.cost_amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const period = (entry.cost_period ?? "").toLowerCase();
  if (/(year|yr|annual)/.test(period)) return amount / 12;
  if (/(week|wk)/.test(period)) return amount * (52 / 12);
  if (/(day|daily)/.test(period)) return amount * (365 / 12);
  if (/(quarter)/.test(period)) return amount / 3;
  return amount;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/www\./g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function tokenSet(entry: SoftwareVaultEntry): Set<string> {
  const text = [
    entry.app_name,
    entry.category,
    entry.use_cases,
    entry.tags,
    entry.default_tool_for,
    entry.why_i_use_it,
    entry.summary,
  ]
    .filter(Boolean)
    .join(" ");
  return new Set(
    normalizeText(text)
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t)),
  );
}

function entrySource(entry: SoftwareVaultEntry) {
  return {
    title: entry.app_name,
    url: entry.website_url,
    sourceType: "vault" as const,
    usedFor: ["saved vault fields"],
  };
}

function sourceList(entries: SoftwareVaultEntry[]) {
  return entries.map(entrySource).slice(0, 8);
}

function activeRecurring(entries: SoftwareVaultEntry[]) {
  return entries.filter(
    (e) => e.status === "Active" && (e.cost_type === "Subscription" || e.cost_type === "Paid"),
  );
}

function isStaleDate(value: string | null | undefined, days: number): boolean {
  if (!value) return true;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > days * 24 * 60 * 60 * 1000;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function missingCapabilityInsights(entries: SoftwareVaultEntry[]): ToolStackInsight[] {
  if (entries.length < 3) return [];
  const haystack = normalizeText(
    entries
      .flatMap((e) => [e.app_name, e.category, e.use_cases, e.tags, e.default_tool_for, e.summary])
      .filter(Boolean)
      .join(" "),
  );
  return CAPABILITY_RULES.filter((rule) => !rule.keywords.some((kw) => kw.test(haystack))).map(
    (rule): ToolStackInsight => ({
      id: `missing_${rule.id}`,
      title: `Missing capability: ${rule.title}`,
      detail: rule.detail,
      severity: "info",
      action: "missing_capability",
      recommendation: rule.recommendation,
      relatedEntryIds: [],
      sources: [
        {
          title: "Current Software Vault",
          sourceType: "vault",
          usedFor: ["category", "tags", "use cases", "default jobs"],
        },
      ],
    }),
  );
}

function overlapInsight(
  id: string,
  title: string,
  entries: SoftwareVaultEntry[],
  detail: string,
  recommendation: string,
  severity: ToolStackInsight["severity"] = "notice",
): ToolStackInsight {
  const monthly = entries.reduce((sum, e) => sum + estimateMonthlyUsd(e), 0);
  return {
    id,
    title,
    detail,
    severity,
    action: monthly > 0 ? "downgrade_review" : "replace_review",
    recommendation,
    relatedEntryIds: entries.map((e) => e.id),
    estimatedMonthlyUsd: monthly > 0 ? Number(monthly.toFixed(2)) : null,
    sources: sourceList(entries),
  };
}

export function buildOverlapAudit(entries: SoftwareVaultEntry[]): OverlapAuditResponse {
  const generatedAt = nowIso();
  const groups: ToolStackInsight[] = [];

  for (const [name, dupes] of groupBy(entries, (e) => normalizeText(e.app_name))) {
    if (dupes.length < 2) continue;
    groups.push(
      overlapInsight(
        `duplicate_name_${name.slice(0, 32).replace(/\s+/g, "_")}`,
        "Possible duplicate vault entries",
        dupes,
        `${dupes.length} saved tools share the normalized name "${dupes[0]?.app_name}".`,
        "Review whether notes, pricing, and usage should be consolidated into one entry.",
        "warning",
      ),
    );
  }

  for (const [host, dupes] of groupBy(entries, (e) => safeHost(e.website_url))) {
    if (dupes.length < 2) continue;
    groups.push(
      overlapInsight(
        `duplicate_host_${host.replace(/[^a-z0-9]/g, "_")}`,
        "Multiple entries point to the same product domain",
        dupes,
        `${dupes.length} saved tools point to ${host}.`,
        "Review whether these are separate products, plan variants, or duplicate rows.",
        "warning",
      ),
    );
  }

  const categoryGroups = groupBy(
    entries.filter((e) => e.status !== "Retired"),
    (e) => normalizeText(e.category),
  );
  for (const [category, group] of categoryGroups) {
    if (category.length < 3 || group.length < 3) continue;
    const paid = group.filter((e) => estimateMonthlyUsd(e) > 0);
    groups.push(
      overlapInsight(
        `category_overlap_${category.replace(/\s+/g, "_").slice(0, 48)}`,
        `Dense category: ${group[0]?.category ?? category}`,
        group,
        `${group.length} active/testing tools sit in the same category.`,
        paid.length > 1
          ? "Compare the paid tools first, then pick defaults for the jobs that genuinely differ."
          : "Assign a clear job to each tool or move extras to Wishlist/Retired after review.",
        paid.length > 1 ? "warning" : "notice",
      ),
    );
  }

  const defaultJobGroups = groupBy(
    entries.filter((e) => e.status !== "Retired"),
    (e) => normalizeText(e.default_tool_for),
  );
  for (const [job, group] of defaultJobGroups) {
    if (job.length < 3 || group.length < 2) continue;
    groups.push(
      overlapInsight(
        `default_job_overlap_${job.replace(/\s+/g, "_").slice(0, 48)}`,
        `Competing defaults: ${group[0]?.default_tool_for ?? job}`,
        group,
        `${group.length} tools are saved for the same default job.`,
        "Choose one default, then document exceptions for the others.",
        "notice",
      ),
    );
  }

  const tokenGroups: ToolStackInsight[] = [];
  const seenPairs = new Set<string>();
  const active = entries.filter((e) => e.status !== "Retired");
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i]!;
      const b = active[j]!;
      const ak = tokenSet(a);
      const bk = tokenSet(b);
      const shared = [...ak].filter((t) => bk.has(t));
      if (shared.length < 4) continue;
      const key = [a.id, b.id].sort().join(":");
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      tokenGroups.push(
        overlapInsight(
          `workflow_overlap_${a.id.slice(0, 8)}_${b.id.slice(0, 8)}`,
          "Workflow language overlaps",
          [a, b],
          `${a.app_name} and ${b.app_name} share workflow terms: ${shared.slice(0, 6).join(", ")}.`,
          "Review whether both tools are needed for different workflow stages.",
          "info",
        ),
      );
    }
  }
  groups.push(...tokenGroups.slice(0, 6));

  const missingCapabilities = missingCapabilityInsights(entries);
  const monthlyOverlapUsd = groups.reduce((sum, group) => sum + (group.estimatedMonthlyUsd ?? 0), 0);

  return {
    generatedAt,
    summary: {
      totalTools: entries.length,
      overlapGroups: groups.length,
      monthlyOverlapUsd: Number(monthlyOverlapUsd.toFixed(2)),
      missingCapabilityCount: missingCapabilities.length,
    },
    groups: groups.slice(0, 18),
    missingCapabilities: missingCapabilities.slice(0, 8),
  };
}

export function buildSubscriptionAudit(entries: SoftwareVaultEntry[]): SubscriptionAuditResponse {
  const generatedAt = nowIso();
  const recurring = activeRecurring(entries);
  const reviews: ToolStackInsight[] = [];

  for (const entry of recurring) {
    const monthly = estimateMonthlyUsd(entry);
    const stalePricing = isStaleDate(entry.pricing_last_checked_at, 90);
    const hasUsage = (entry.launch_count ?? 0) > 0 || !isStaleDate(entry.last_opened_at, 45);
    const hasDependency = Boolean(entry.is_default_stack || entry.default_tool_for || entry.replaces);

    if (stalePricing) {
      reviews.push({
        id: `stale_pricing_${entry.id.slice(0, 8)}`,
        title: "Pricing needs review",
        detail: `${entry.app_name} has no recent pricing verification saved.`,
        severity: "notice",
        action: "research_first",
        recommendation: "Refresh pricing from official sources before trusting this monthly estimate.",
        relatedEntryIds: [entry.id],
        estimatedMonthlyUsd: monthly,
        sources: [entrySource(entry)],
      });
    }

    if (monthly > 0 && !hasUsage && !hasDependency) {
      reviews.push({
        id: `paid_without_usage_${entry.id.slice(0, 8)}`,
        title: "Paid tool without usage or dependency evidence",
        detail: `${entry.app_name} is active and paid, but the vault has no launch/default/project role signal.`,
        severity: monthly >= 50 ? "warning" : "notice",
        action: "cancel_review",
        recommendation: "Do not cancel automatically. Review usage, linked work, and renewal timing before deciding.",
        relatedEntryIds: [entry.id],
        estimatedMonthlyUsd: monthly,
        sources: [entrySource(entry)],
      });
    } else if (monthly >= 30 && !entry.is_default_stack) {
      reviews.push({
        id: `paid_non_default_${entry.id.slice(0, 8)}`,
        title: "Paid non-default tool",
        detail: `${entry.app_name} costs about $${monthly.toFixed(2)}/mo and is not marked as default stack.`,
        severity: "info",
        action: "downgrade_review",
        recommendation: "Confirm the role, downgrade path, or default exception before renewal.",
        relatedEntryIds: [entry.id],
        estimatedMonthlyUsd: monthly,
        sources: [entrySource(entry)],
      });
    }
  }

  const estimatedMonthlyUsd = recurring.reduce((sum, e) => sum + estimateMonthlyUsd(e), 0);
  const stalePricingCount = recurring.filter((e) => isStaleDate(e.pricing_last_checked_at, 90)).length;

  return {
    generatedAt,
    summary: {
      activeRecurringTools: recurring.length,
      estimatedMonthlyUsd: Number(estimatedMonthlyUsd.toFixed(2)),
      stalePricingCount,
      reviewCount: reviews.length,
    },
    reviews: reviews.slice(0, 24),
  };
}

function scoreEntryForText(entry: SoftwareVaultEntry, text: string): number {
  const tokens = normalizeText(text)
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  if (tokens.length === 0) return entry.is_default_stack ? 2 : 0;
  const entryTokens = tokenSet(entry);
  let score = entry.is_default_stack ? 2 : 0;
  if (entry.status === "Active") score += 1;
  for (const token of tokens) {
    if (entryTokens.has(token)) score += 2;
  }
  return score + Math.min(entry.launch_count ?? 0, 10) / 10;
}

export function buildProjectStack(
  entries: SoftwareVaultEntry[],
  req: ProjectStackRequest,
): ProjectStackResponse {
  const selected = new Set(req.selectedEntryIds ?? []);
  const scored = entries
    .filter((e) => e.status !== "Retired")
    .map((entry) => ({
      entry,
      score:
        selected.has(entry.id)
          ? 100
          : scoreEntryForText(entry, `${req.targetName} ${req.description ?? ""}`),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const picked =
    scored.length > 0
      ? scored
      : entries
          .filter((e) => e.status === "Active" || e.is_default_stack)
          .slice(0, 6)
          .map((entry) => ({ entry, score: entry.is_default_stack ? 2 : 1 }));

  const missingCapabilities = missingCapabilityInsights(picked.map((p) => p.entry)).slice(0, 5);
  const items: ProjectStackResponse["items"] = picked.map(({ entry, score }, index) => ({
    entryId: entry.id,
    appName: entry.app_name,
    role:
      entry.default_tool_for ??
      entry.use_cases ??
      entry.summary ??
      `Support ${req.targetName} with a documented role.`,
    fit: index < 3 || entry.is_default_stack ? "core" : score >= 3 ? "supporting" : "optional",
    reason:
      selected.has(entry.id)
        ? "Selected by the user for this stack."
        : entry.is_default_stack
          ? "Already marked as part of the default stack."
          : "Matched saved category, tags, use cases, or workflow language.",
    estimatedMonthlyUsd: estimateMonthlyUsd(entry) || null,
  }));

  if (items.length === 0) {
    items.push({
      entryId: null,
      appName: "Missing first project tool",
      role: "Capture at least one real tool before saving a stack blueprint.",
      fit: "missing",
      reason: "The vault has no active tools to reuse.",
      estimatedMonthlyUsd: null,
    });
  }

  return {
    generatedAt: nowIso(),
    name: `${req.targetName} software stack`,
    targetType: req.targetType,
    rationale:
      "This stack reuses saved Software Vault entries first, then flags missing layers for review. It does not add new subscriptions or change billing.",
    items,
    missingCapabilities,
    setupOrder: items
      .filter((item) => item.fit !== "missing")
      .slice(0, 8)
      .map((item, index) => `${index + 1}. Confirm ${item.appName} as ${item.fit} for ${req.targetName}.`),
  };
}

function pickByKeyword(entries: SoftwareVaultEntry[], patterns: RegExp[]): SoftwareVaultEntry | null {
  return (
    entries.find((entry) =>
      patterns.some((pattern) =>
        pattern.test(
          [entry.app_name, entry.category, entry.use_cases, entry.tags, entry.default_tool_for]
            .filter(Boolean)
            .join(" "),
        ),
      ),
    ) ?? null
  );
}

export function buildWorkflowRecipe(
  entries: SoftwareVaultEntry[],
  req: WorkflowRecipeRequest,
): WorkflowRecipeResponse {
  const selected = new Set(req.selectedEntryIds ?? []);
  const usable =
    selected.size > 0
      ? entries.filter((e) => selected.has(e.id))
      : entries.filter((e) => e.status === "Active" || e.is_default_stack).slice(0, 8);
  const docs = pickByKeyword(usable, [/doc/i, /note/i, /wiki/i, /knowledge/i]);
  const automation = pickByKeyword(usable, [/automation/i, /zapier/i, /make\b/i, /n8n/i]);
  const communication = pickByKeyword(usable, [/slack/i, /chat/i, /email/i, /meeting/i, /zoom/i]);
  const storage = pickByKeyword(usable, [/drive/i, /storage/i, /file/i, /asset/i]);
  const core = usable[0] ?? docs ?? automation ?? communication ?? storage;

  const steps = [
    {
      title: "Capture the input",
      entryIds: [core?.id].filter((id): id is string => Boolean(id)),
      instruction: core
        ? `Start in ${core.app_name} and capture the request, source links, and desired output.`
        : "Capture the request, source links, and desired output in the chosen project tool.",
      output: "A single source of truth for the workflow request.",
    },
    {
      title: "Clarify and organize",
      entryIds: [docs?.id ?? core?.id].filter((id): id is string => Boolean(id)),
      instruction: docs
        ? `Use ${docs.app_name} to organize notes, assumptions, and open questions.`
        : "Write the assumptions and open questions before doing tool work.",
      output: "A reviewed plan with enough context to execute.",
    },
    {
      title: "Execute the repeatable work",
      entryIds: [automation?.id ?? core?.id].filter((id): id is string => Boolean(id)),
      instruction: automation
        ? `Use ${automation.app_name} only for the repeatable handoff or automation portion.`
        : "Perform the repeatable work and document what should become automated later.",
      output: "Completed workflow output or a clear automation candidate.",
    },
    {
      title: "Review and hand off",
      entryIds: [communication?.id ?? storage?.id ?? core?.id].filter((id): id is string => Boolean(id)),
      instruction: communication
        ? `Send the reviewed result through ${communication.app_name} with links back to the source.`
        : "Review the result, store the final link, and notify the relevant person/channel.",
      output: "A final result, owner, and next action.",
    },
  ].map((step, index) => ({
    stepIndex: index + 1,
    ...step,
  }));

  return {
    generatedAt: nowIso(),
    name: req.name,
    goal: req.goal,
    overview:
      "A repeatable workflow recipe generated from tools already saved in the vault. It stays review-first and does not trigger external automations by itself.",
    steps,
    requiredEntryIds: [...new Set(steps.flatMap((step) => step.entryIds))],
    missingCapabilities: missingCapabilityInsights(usable).slice(0, 4),
  };
}

function jobFromEntry(entry: SoftwareVaultEntry): string | null {
  return (
    entry.default_tool_for?.trim() ||
    entry.use_cases?.split(/[,.]/)[0]?.trim() ||
    entry.category?.trim() ||
    null
  );
}

export function buildDefaultToolRecommendations(
  entries: SoftwareVaultEntry[],
): DefaultToolRecommendationResponse {
  const groups = groupBy(
    entries.filter((e) => e.status !== "Retired"),
    (e) => normalizeText(jobFromEntry(e)),
  );
  const recommendations: DefaultToolRecommendation[] = [];

  for (const [job, group] of groups) {
    if (job.length < 3 || group.length < 1) continue;
    const sorted = [...group].sort((a, b) => {
      const aScore = (a.is_default_stack ? 5 : 0) + (a.status === "Active" ? 2 : 0) + (a.launch_count ?? 0);
      const bScore = (b.is_default_stack ? 5 : 0) + (b.status === "Active" ? 2 : 0) + (b.launch_count ?? 0);
      return bScore - aScore;
    });
    const winner = sorted[0]!;
    recommendations.push({
      job: jobFromEntry(winner) ?? job,
      lifeArea: winner.category,
      recommendedEntryId: winner.id,
      recommendedAppName: winner.app_name,
      reason:
        winner.is_default_stack
          ? "Already marked as default stack and has the strongest saved signal."
          : "Best current candidate based on active status, usage count, and saved role fields.",
      alternatives: sorted.slice(1, 4).map((entry) => ({
        entryId: entry.id,
        appName: entry.app_name,
        reason: "Same saved job/category; keep as an exception only if it has a distinct use case.",
      })),
    });
  }

  return {
    generatedAt: nowIso(),
    recommendations: recommendations.slice(0, 12),
  };
}

export function buildPageIntelligence(entries: SoftwareVaultEntry[]): PageIntelligenceResponse {
  const overlap = buildOverlapAudit(entries);
  const subscription = buildSubscriptionAudit(entries);
  const toolsWithoutRoles = entries.filter((e) => !e.default_tool_for && !e.why_i_use_it && !e.use_cases);
  const staleResearch = entries.filter((e) => isStaleDate(e.pricing_last_checked_at, 120));
  const penalties =
    overlap.summary.overlapGroups * 4 +
    subscription.summary.reviewCount * 5 +
    toolsWithoutRoles.length * 2 +
    Math.min(staleResearch.length, 10) * 2;
  const healthScore = Math.max(0, Math.min(100, 100 - penalties));
  const nextActions: ToolStackInsight[] = [
    ...subscription.reviews.slice(0, 3),
    ...overlap.groups.slice(0, 3),
    ...overlap.missingCapabilities.slice(0, 2),
  ].slice(0, 6);

  return {
    generatedAt: nowIso(),
    healthScore,
    summaryCards: [
      {
        id: "spend",
        label: "Monthly spend",
        value: `$${subscription.summary.estimatedMonthlyUsd.toFixed(2)}`,
        detail: `${subscription.summary.activeRecurringTools} active recurring tools`,
        severity: subscription.summary.estimatedMonthlyUsd > 300 ? "warning" : "info",
      },
      {
        id: "overlap",
        label: "Overlap groups",
        value: String(overlap.summary.overlapGroups),
        detail: "Duplicate, category, default-job, and workflow-language overlap.",
        severity: overlap.summary.overlapGroups > 3 ? "warning" : "notice",
      },
      {
        id: "missing",
        label: "Missing layers",
        value: String(overlap.summary.missingCapabilityCount),
        detail: "Capability gaps inferred from saved fields.",
        severity: overlap.summary.missingCapabilityCount > 2 ? "notice" : "info",
      },
      {
        id: "roles",
        label: "No clear role",
        value: String(toolsWithoutRoles.length),
        detail: "Tools without use case, role, or why-I-use-it fields.",
        severity: toolsWithoutRoles.length > 5 ? "warning" : "info",
      },
    ],
    nextActions,
  };
}
