import type { KnowledgeItem, SmartCollection } from "@/types/knowledge";
import { getCategoryLabel, getSourceTypeInfo } from "@/lib/knowledge/labels";

export type KnowledgeMatchLevel = "very-high" | "high" | "medium" | "low";

export type KnowledgeMatchField =
  | "title"
  | "summary"
  | "overview"
  | "tags"
  | "questions"
  | "actions"
  | "category"
  | "source"
  | "collection"
  | "content";

export type KnowledgeMatchResult = {
  item: KnowledgeItem;
  score: number;
  normalizedScore: number;
  confidence: KnowledgeMatchLevel;
  reasons: string[];
  matchedKeywords: string[];
  matchedConcepts: string[];
  matchedFields: KnowledgeMatchField[];
  suggestedAction: string;
};

export type KnowledgeInquiryProfile = {
  original: string;
  normalized: string;
  terms: string[];
  expandedTerms: string[];
  concepts: string[];
};

type ConceptDefinition = {
  id: string;
  label: string;
  terms: string[];
};

type FieldHit = {
  field: KnowledgeMatchField;
  label: string;
  weight: number;
  terms: string[];
  concepts: string[];
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "does",
  "for",
  "from",
  "have",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "page",
  "that",
  "the",
  "this",
  "to",
  "want",
  "with",
]);

const CONCEPTS: ConceptDefinition[] = [
  {
    id: "saas",
    label: "SaaS",
    terms: [
      "saas",
      "software as a service",
      "subscription",
      "b2b",
      "multi tenant",
      "dashboard",
      "onboarding",
      "pricing",
      "startup",
    ],
  },
  {
    id: "payment",
    label: "payment and billing",
    terms: [
      "payment",
      "payments",
      "billing",
      "checkout",
      "stripe",
      "paddle",
      "invoice",
      "subscription",
      "credit card",
      "pricing page",
      "paywall",
      "revenue",
      "monetization",
      "付款",
      "支付",
      "結帳",
      "订阅",
      "訂閱",
    ],
  },
  {
    id: "cloud-code-skills",
    label: "Cloud Code / agent skills",
    terms: [
      "cloud code",
      "claude code",
      "codex",
      "code skill",
      "coding skill",
      "agent skill",
      "skills",
      "skill",
      "prompt",
      "playbook",
      "workflow",
      "template",
      "cloud",
      "技能",
      "模版",
      "模板",
    ],
  },
  {
    id: "codebase",
    label: "codebase and repositories",
    terms: [
      "codebase",
      "repository",
      "repo",
      "github",
      "readme",
      "source code",
      "implementation",
      "typescript",
      "next.js",
      "react",
      "api",
      "integration",
    ],
  },
  {
    id: "frontend-ux",
    label: "frontend UX",
    terms: [
      "frontend",
      "front end",
      "ui",
      "ux",
      "design",
      "interface",
      "component",
      "layout",
      "flow",
      "wireframe",
      "prototype",
      "網站",
      "网页",
      "網頁",
    ],
  },
  {
    id: "templates",
    label: "templates and reusable resources",
    terms: [
      "template",
      "templates",
      "prompt",
      "boilerplate",
      "starter",
      "checklist",
      "framework",
      "resource",
      "example",
      "pattern",
      "模版",
      "模板",
      "資源",
      "资源",
    ],
  },
  {
    id: "research",
    label: "research and references",
    terms: [
      "research",
      "reference",
      "article",
      "paper",
      "guide",
      "notes",
      "summary",
      "learn",
      "knowledge",
      "insight",
    ],
  },
];

const FIELD_WEIGHTS: Record<KnowledgeMatchField, number> = {
  title: 18,
  tags: 15,
  category: 11,
  source: 10,
  collection: 9,
  questions: 8,
  actions: 8,
  summary: 7,
  overview: 7,
  content: 3,
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}.#+/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));
}

function conceptMatchesText(concept: ConceptDefinition, normalizedText: string): string[] {
  return concept.terms.filter((term) => normalizedText.includes(normalizeText(term)));
}

export function buildKnowledgeInquiryProfile(query: string): KnowledgeInquiryProfile {
  const normalized = normalizeText(query);
  const terms = tokenize(query);
  const concepts = CONCEPTS.filter((concept) => conceptMatchesText(concept, normalized).length > 0);
  const expandedTerms = uniq([
    ...terms,
    ...concepts.flatMap((concept) => concept.terms.flatMap(tokenize)),
  ]).slice(0, 80);

  return {
    original: query,
    normalized,
    terms,
    expandedTerms,
    concepts: concepts.map((concept) => concept.id),
  };
}

function conceptLabel(id: string): string {
  return CONCEPTS.find((concept) => concept.id === id)?.label ?? id;
}

function itemCollections(item: KnowledgeItem, smartCollections: SmartCollection[]): string[] {
  return smartCollections.filter((col) => col.itemIds.includes(item.id)).map((col) => col.name);
}

function fieldText(item: KnowledgeItem, smartCollections: SmartCollection[]): Array<{
  field: KnowledgeMatchField;
  label: string;
  value: string;
}> {
  const sourceInfo = item.sourceType ? getSourceTypeInfo(item.sourceType) : null;
  return [
    { field: "title", label: "title", value: item.title },
    { field: "summary", label: "summary", value: [item.aiTldr, item.aiSummary].filter(Boolean).join(" ") },
    { field: "overview", label: "overview", value: item.aiContentOverview ?? "" },
    { field: "tags", label: "tags", value: [...item.aiTags, ...item.manualTags].join(" ") },
    { field: "questions", label: "questions answered", value: item.aiQuestionsAnswered.join(" ") },
    { field: "actions", label: "action items", value: item.aiActionItems.join(" ") },
    {
      field: "category",
      label: "category",
      value: item.category ? getCategoryLabel(item.category) : item.contentType,
    },
    {
      field: "source",
      label: "source",
      value: [
        item.label,
        sourceInfo?.label,
        item.sourceDomain,
        item.provider,
        item.sourceType,
        item.sourceUrl,
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      field: "collection",
      label: "collection",
      value: itemCollections(item, smartCollections).join(" "),
    },
    {
      field: "content",
      label: "content",
      value: [
        item.rawContent?.slice(0, 32000),
        item.aiKeyInsights.join(" "),
        item.aiKeyQuotes.join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    },
  ];
}

function scoreField(
  value: string,
  field: KnowledgeMatchField,
  label: string,
  profile: KnowledgeInquiryProfile,
): FieldHit | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const directTerms = profile.terms.filter((term) => normalized.includes(term));
  const expandedTerms = profile.expandedTerms.filter((term) => normalized.includes(term));
  const conceptIds = CONCEPTS.filter(
    (concept) =>
      profile.concepts.includes(concept.id) &&
      conceptMatchesText(concept, normalized).length > 0,
  ).map((concept) => concept.id);

  const exactQueryHit =
    profile.normalized.length >= 5 && normalized.includes(profile.normalized);
  const terms = uniq([...directTerms, ...expandedTerms]).slice(0, 12);

  if (terms.length === 0 && conceptIds.length === 0 && !exactQueryHit) return null;

  const directScore = directTerms.length * 1.6;
  const expandedScore = Math.max(0, expandedTerms.length - directTerms.length) * 0.55;
  const conceptScore = conceptIds.length * 2.5;
  const exactScore = exactQueryHit ? 4 : 0;
  const weight = FIELD_WEIGHTS[field] * (directScore + expandedScore + conceptScore + exactScore);

  return {
    field,
    label,
    weight,
    terms,
    concepts: conceptIds,
  };
}

function confidenceForScore(normalizedScore: number): KnowledgeMatchLevel {
  if (normalizedScore >= 76) return "very-high";
  if (normalizedScore >= 52) return "high";
  if (normalizedScore >= 28) return "medium";
  return "low";
}

function titleCaseList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function buildReasons(
  item: KnowledgeItem,
  profile: KnowledgeInquiryProfile,
  hits: FieldHit[],
  matchedKeywords: string[],
  matchedConcepts: string[],
): string[] {
  const reasons: string[] = [];
  const topHit = hits[0];
  const conceptText = titleCaseList(matchedConcepts.slice(0, 3));
  const keywordText = titleCaseList(matchedKeywords.slice(0, 5));

  if (conceptText) {
    reasons.push(
      `Matches the inquiry intent around ${conceptText}${
        keywordText ? `, with overlap on ${keywordText}` : ""
      }.`,
    );
  } else if (keywordText) {
    reasons.push(`Shares concrete terms with your inquiry: ${keywordText}.`);
  }

  if (topHit) {
    reasons.push(`Strongest signal comes from the item's ${topHit.label}.`);
  }

  if (item.category || item.sourceType || item.provider) {
    const sourceInfo = item.sourceType ? getSourceTypeInfo(item.sourceType) : null;
    const sourceLabel =
      sourceInfo?.label ?? item.label ?? item.provider ?? item.category ?? item.contentType;
    reasons.push(`Useful source type for this task: ${sourceLabel}.`);
  }

  if (profile.concepts.includes("payment") && profile.concepts.includes("frontend-ux")) {
    reasons.push("Relevant to designing or implementing a checkout, pricing, or billing step.");
  } else if (profile.concepts.includes("cloud-code-skills")) {
    reasons.push("Relevant when you need a reusable skill, prompt, workflow, or code-facing resource.");
  }

  return uniq(reasons).slice(0, 3);
}

function suggestedActionFor(item: KnowledgeItem, matchedConcepts: string[]): string {
  if (item.askEnabled || item.sourceType === "youtube_video" || item.sourceType === "file_upload") {
    return "Open item and ask follow-up questions";
  }
  if (
    item.provider === "github" ||
    item.sourceType === "github_repository" ||
    item.category === "repository"
  ) {
    return "Open the repository note";
  }
  if (matchedConcepts.some((concept) => /skill|template|codebase/i.test(concept))) {
    return "Open item and copy the relevant prompt or workflow";
  }
  if (item.sourceUrl) return "Open item and inspect the original source";
  return "Open item details";
}

export function scoreKnowledgeItem(
  item: KnowledgeItem,
  query: string,
  smartCollections: SmartCollection[] = [],
): KnowledgeMatchResult | null {
  const profile = buildKnowledgeInquiryProfile(query);
  if (!profile.normalized) return null;

  const hits = fieldText(item, smartCollections)
    .map(({ field, label, value }) => scoreField(value, field, label, profile))
    .filter((hit): hit is FieldHit => Boolean(hit))
    .sort((a, b) => b.weight - a.weight);

  if (hits.length === 0) return null;

  const score = hits.reduce((sum, hit) => sum + hit.weight, 0);
  const matchedKeywords = uniq(hits.flatMap((hit) => hit.terms))
    .filter((term) => term.length >= 2)
    .slice(0, 12);
  const matchedConceptIds = uniq(hits.flatMap((hit) => hit.concepts));
  const matchedConcepts = matchedConceptIds.map(conceptLabel);
  const fieldDiversityBoost = Math.min(12, uniq(hits.map((hit) => hit.field)).length * 2);
  const normalizedScore = Math.min(100, Math.round(score / 4 + fieldDiversityBoost));
  const confidence = confidenceForScore(normalizedScore);

  return {
    item,
    score,
    normalizedScore,
    confidence,
    matchedKeywords,
    matchedConcepts,
    matchedFields: uniq(hits.map((hit) => hit.field)),
    reasons: buildReasons(item, profile, hits, matchedKeywords, matchedConcepts),
    suggestedAction: suggestedActionFor(item, matchedConcepts),
  };
}

export function matchKnowledgeItems(
  items: KnowledgeItem[],
  query: string,
  smartCollections: SmartCollection[] = [],
  options: { limit?: number; minScore?: number } = {},
): KnowledgeMatchResult[] {
  const minScore = options.minScore ?? 8;
  const results = items
    .map((item) => scoreKnowledgeItem(item, query, smartCollections))
    .filter((result): result is KnowledgeMatchResult =>
      Boolean(result && result.normalizedScore >= minScore),
    )
    .sort((a, b) => {
      if (b.normalizedScore !== a.normalizedScore) return b.normalizedScore - a.normalizedScore;
      return new Date(b.item.dateAdded).getTime() - new Date(a.item.dateAdded).getTime();
    });

  return typeof options.limit === "number" ? results.slice(0, options.limit) : results;
}

export function hasKnowledgeMatch(
  item: KnowledgeItem,
  query: string,
  smartCollections: SmartCollection[] = [],
): boolean {
  return Boolean(scoreKnowledgeItem(item, query, smartCollections));
}

export function knowledgeSearchScore(
  item: KnowledgeItem,
  query: string,
  smartCollections: SmartCollection[] = [],
): number {
  return scoreKnowledgeItem(item, query, smartCollections)?.normalizedScore ?? 0;
}
