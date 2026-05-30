/**
 * Shared schemas, prompts, and normalizers for the Asset Intelligence Hub AI
 * routes (`/api/ai/assets/*`).
 *
 * Pattern mirrors `role-model/_shared.ts`:
 *   - A Zod schema validates the model output at the route boundary before it
 *     is returned to the client (never trust AI blindly).
 *   - A matching `GeminiResponseSchema` (OpenAPI-3 subset) is sent to Gemini
 *     so it returns the right shape.
 *   - `normalize*` helpers clamp / coerce the validated data into the public
 *     transport type.
 *
 * Auth + API-key + error helpers are reused from the habits routes.
 */

import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  ASSET_CATEGORY_KEYS,
  isAssetCategoryKey,
  type AssetCategoryKey,
} from "@/types/assets";
import type {
  AssetAutofillResult,
  AssetFieldConfidence,
  AssetIntelligenceReport,
  AssetInsightContextPayload,
  PotentialAssetAnalysis,
  AssetRecommendedAction,
} from "@/types/asset-intelligence";

// Re-export the habits helpers so asset routes can import everything from here.
export {
  requireAuthedContext,
  getApiKeyOrFail,
  errorResponse,
} from "../habits/_shared";

const LOCALE_LABEL: Record<AppLocale, string> = {
  en: "English",
  "zh-TW": "Traditional Chinese (繁體中文)",
  "zh-CN": "Simplified Chinese (简体中文)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  fr: "French (Français)",
  it: "Italian (Italiano)",
  es: "Spanish (Español)",
  vi: "Vietnamese (Tiếng Việt)",
};

export function localeLabel(locale: AppLocale): string {
  return LOCALE_LABEL[locale] ?? "English";
}

const CONFIDENCE = ["high", "medium", "low", "missing"] as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ===========================================================================
// 1. AUTOFILL
// ===========================================================================

const AutofillZ = z.object({
  name: z.string().max(160).default(""),
  category_key: z.string().nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  location: z.string().max(160).nullable().optional(),
  purchase_date: z.string().max(40).nullable().optional(),
  serial_number: z.string().max(120).nullable().optional(),
  notes: z.string().max(800).nullable().optional(),
  extracted_document_type: z
    .enum(["receipt", "invoice", "warranty", "insurance", "manual", "photo", "unknown"])
    .default("unknown"),
  possible_brand: z.string().max(80).nullable().optional(),
  possible_model: z.string().max(120).nullable().optional(),
  warranty_expiration_date: z.string().max(40).nullable().optional(),
  confidence: z.number().default(0.5),
  field_confidence: z.record(z.string(), z.enum(CONFIDENCE)).default({}),
  missing_fields: z.array(z.string().max(60)).max(20).default([]),
  warnings: z.array(z.string().max(200)).max(10).default([]),
  suggested_next_actions: z.array(z.string().max(160)).max(10).default([]),
});

export type AutofillParsed = z.infer<typeof AutofillZ>;

export const AssetAutofillGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["name", "confidence"],
  properties: {
    name: { type: "string" },
    category_key: {
      type: "string",
      enum: [...ASSET_CATEGORY_KEYS],
      nullable: true,
    },
    category: { type: "string", nullable: true },
    value: { type: "number", nullable: true },
    current_value: { type: "number", nullable: true },
    location: { type: "string", nullable: true },
    purchase_date: { type: "string", nullable: true },
    serial_number: { type: "string", nullable: true },
    notes: { type: "string", nullable: true },
    extracted_document_type: {
      type: "string",
      enum: ["receipt", "invoice", "warranty", "insurance", "manual", "photo", "unknown"],
    },
    possible_brand: { type: "string", nullable: true },
    possible_model: { type: "string", nullable: true },
    warranty_expiration_date: { type: "string", nullable: true },
    confidence: { type: "number" },
    field_confidence: {
      type: "object",
      properties: {
        name: { type: "string", enum: [...CONFIDENCE] },
        category_key: { type: "string", enum: [...CONFIDENCE] },
        value: { type: "string", enum: [...CONFIDENCE] },
        current_value: { type: "string", enum: [...CONFIDENCE] },
        purchase_date: { type: "string", enum: [...CONFIDENCE] },
        serial_number: { type: "string", enum: [...CONFIDENCE] },
        warranty_expiration_date: { type: "string", enum: [...CONFIDENCE] },
      },
    },
    missing_fields: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    suggested_next_actions: { type: "array", items: { type: "string" } },
  },
};

export function parseAutofill(raw: unknown): AutofillParsed | null {
  const parsed = AutofillZ.safeParse(raw);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[assets/autofill] zod failed:", parsed.error.flatten());
    }
    return null;
  }
  return parsed.data;
}

function coerceCategoryKey(value: unknown): AssetCategoryKey | null {
  return isAssetCategoryKey(value) ? value : null;
}

function coerceFieldConfidence(
  rec: Record<string, string>,
): AssetAutofillResult["field_confidence"] {
  const out: AssetAutofillResult["field_confidence"] = {};
  const keys = [
    "name",
    "category_key",
    "value",
    "current_value",
    "purchase_date",
    "serial_number",
    "warranty_expiration_date",
  ] as const;
  for (const k of keys) {
    const v = rec[k];
    if (v && (CONFIDENCE as readonly string[]).includes(v)) {
      out[k] = v as AssetFieldConfidence;
    }
  }
  return out;
}

export function normalizeAutofill(data: AutofillParsed): AssetAutofillResult {
  return {
    name: data.name.trim(),
    category_key: coerceCategoryKey(data.category_key),
    category: data.category?.trim() || null,
    value: data.value ?? null,
    current_value: data.current_value ?? null,
    location: data.location?.trim() || null,
    purchase_date: data.purchase_date?.trim() || null,
    serial_number: data.serial_number?.trim() || null,
    notes: data.notes?.trim() || null,
    extracted_document_type: data.extracted_document_type,
    possible_brand: data.possible_brand?.trim() || null,
    possible_model: data.possible_model?.trim() || null,
    warranty_expiration_date: data.warranty_expiration_date?.trim() || null,
    confidence: clamp(data.confidence, 0, 1),
    field_confidence: coerceFieldConfidence(data.field_confidence),
    missing_fields: data.missing_fields,
    warnings: data.warnings,
    suggested_next_actions: data.suggested_next_actions,
  };
}

export function buildAutofillPrompt(locale: AppLocale): string {
  return [
    "You are an asset-cataloguing assistant inside a personal Life OS.",
    "The user has dropped evidence about something they own — a receipt,",
    "invoice, warranty, insurance document, product photo, a product name, or",
    "a one-line description. Extract a structured asset record.",
    "",
    "Rules:",
    "- Only state values you can actually justify from the input. Never invent",
    "  a serial number, price, or date. If unknown, return null and mark the",
    "  field confidence as \"missing\".",
    "- `category_key` must be one of: " + ASSET_CATEGORY_KEYS.join(", ") + ".",
    "- `value` is the original purchase price; `current_value` is an estimate of",
    "  today's worth (only if you can reasonably infer it). Numbers only, no",
    "  currency symbols.",
    "- Dates as ISO YYYY-MM-DD when possible.",
    "- `field_confidence` rates how sure you are per field: high | medium | low | missing.",
    "- `missing_fields`: list the important fields a user should still add.",
    "- `warnings`: note anything ambiguous or low-confidence.",
    "- `suggested_next_actions`: 2-5 short, concrete next steps (e.g.",
    "  \"Upload the warranty document\", \"Add a serial-number photo\").",
    "- `notes`: a one or two sentence neutral description of the item.",
    "",
    `Write all human-readable text (name, notes, warnings, suggested actions) in ${localeLabel(locale)}.`,
  ].join("\n");
}

// ===========================================================================
// 2. INTELLIGENCE REPORT (analyze)
// ===========================================================================

const RECOMMENDED_ACTIONS = [
  "keep", "sell", "repair", "upgrade", "insure", "document",
  "activate", "archive", "donate", "replace", "review_later",
] as const;

const DnaDimZ = z.object({
  key: z.string().max(40),
  label: z.string().max(60),
  score: z.number(),
  explanation: z.string().max(240).optional(),
});

const HiddenConnZ = z.object({
  title: z.string().max(120),
  sourceType: z.enum([
    "project", "task", "goal", "note", "idea", "document", "asset", "pattern",
  ]),
  sourceId: z.string().max(80).optional(),
  sourceTitle: z.string().max(160).optional(),
  explanation: z.string().max(400),
  confidence: z.number(),
  suggestedAction: z.string().max(160).optional(),
});

const ActivationDayZ = z.object({
  day: z.number(),
  action: z.string().max(240),
  reflectionQuestion: z.string().max(200).optional(),
});

const SuggestedActionZ = z.object({
  label: z.string().max(120),
  detail: z.string().max(240).optional(),
  kind: z.enum(["task", "reminder", "document", "review"]).optional(),
});

const ReportZ = z.object({
  whyThisAssetMatters: z.string().max(900).default(""),
  dna: z.array(DnaDimZ).max(14).default([]),
  documentHealth: z
    .object({
      score: z.number().default(0),
      status: z.enum(["strong", "okay", "weak", "critical"]).default("weak"),
      missingItems: z.array(z.string().max(60)).max(20).default([]),
      existingItems: z.array(z.string().max(60)).max(20).default([]),
      explanation: z.string().max(500).default(""),
    })
    .default({ score: 0, status: "weak", missingItems: [], existingItems: [], explanation: "" }),
  hiddenConnections: z.array(HiddenConnZ).max(8).default([]),
  ifDisappearedTomorrow: z.string().max(700).default(""),
  recommendedAction: z
    .object({
      action: z.enum(RECOMMENDED_ACTIONS).default("keep"),
      label: z.string().max(80).default("Keep"),
      reason: z.string().max(500).default(""),
      urgency: z.enum(["low", "medium", "high"]).default("low"),
    })
    .default({ action: "keep", label: "Keep", reason: "", urgency: "low" }),
  insuranceReadiness: z
    .object({
      score: z.number().default(0),
      explanation: z.string().max(400).default(""),
      missingProof: z.array(z.string().max(60)).max(12).default([]),
    })
    .default({ score: 0, explanation: "", missingProof: [] }),
  maintenanceSuggestions: z
    .array(
      z.object({
        title: z.string().max(120),
        detail: z.string().max(300),
        cadence: z.string().max(60).optional(),
      }),
    )
    .max(6)
    .default([]),
  activationPlan: z
    .object({
      title: z.string().max(120),
      goal: z.string().max(240),
      days: z.array(ActivationDayZ).max(7),
    })
    .nullable()
    .optional(),
  personalMeaningInsight: z.string().max(600).optional(),
  suggestedNextActions: z.array(SuggestedActionZ).max(8).default([]),
});

export type ReportParsed = z.infer<typeof ReportZ>;

const dnaShape = {
  type: "object",
  required: ["key", "label", "score"],
  properties: {
    key: { type: "string" },
    label: { type: "string" },
    score: { type: "number" },
    explanation: { type: "string" },
  },
};

export const AssetReportGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: [
    "whyThisAssetMatters",
    "dna",
    "documentHealth",
    "hiddenConnections",
    "ifDisappearedTomorrow",
    "recommendedAction",
    "insuranceReadiness",
    "suggestedNextActions",
  ],
  properties: {
    whyThisAssetMatters: { type: "string" },
    dna: { type: "array", items: dnaShape },
    documentHealth: {
      type: "object",
      properties: {
        score: { type: "number" },
        status: { type: "string", enum: ["strong", "okay", "weak", "critical"] },
        missingItems: { type: "array", items: { type: "string" } },
        existingItems: { type: "array", items: { type: "string" } },
        explanation: { type: "string" },
      },
    },
    hiddenConnections: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "sourceType", "explanation", "confidence"],
        properties: {
          title: { type: "string" },
          sourceType: {
            type: "string",
            enum: ["project", "task", "goal", "note", "idea", "document", "asset", "pattern"],
          },
          sourceId: { type: "string" },
          sourceTitle: { type: "string" },
          explanation: { type: "string" },
          confidence: { type: "number" },
          suggestedAction: { type: "string" },
        },
      },
    },
    ifDisappearedTomorrow: { type: "string" },
    recommendedAction: {
      type: "object",
      required: ["action", "label", "reason", "urgency"],
      properties: {
        action: { type: "string", enum: [...RECOMMENDED_ACTIONS] },
        label: { type: "string" },
        reason: { type: "string" },
        urgency: { type: "string", enum: ["low", "medium", "high"] },
      },
    },
    insuranceReadiness: {
      type: "object",
      properties: {
        score: { type: "number" },
        explanation: { type: "string" },
        missingProof: { type: "array", items: { type: "string" } },
      },
    },
    maintenanceSuggestions: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "detail"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          cadence: { type: "string" },
        },
      },
    },
    activationPlan: {
      type: "object",
      properties: {
        title: { type: "string" },
        goal: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            required: ["day", "action"],
            properties: {
              day: { type: "number" },
              action: { type: "string" },
              reflectionQuestion: { type: "string" },
            },
          },
        },
      },
    },
    personalMeaningInsight: { type: "string" },
    suggestedNextActions: {
      type: "array",
      items: {
        type: "object",
        required: ["label"],
        properties: {
          label: { type: "string" },
          detail: { type: "string" },
          kind: { type: "string", enum: ["task", "reminder", "document", "review"] },
        },
      },
    },
  },
};

export function parseReport(raw: unknown): ReportParsed | null {
  const parsed = ReportZ.safeParse(raw);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[assets/analyze] zod failed:", parsed.error.flatten());
    }
    return null;
  }
  return parsed.data;
}

export function normalizeReport(
  assetId: string,
  data: ReportParsed,
  modelUsed: string,
): AssetIntelligenceReport {
  return {
    assetId,
    whyThisAssetMatters: data.whyThisAssetMatters,
    dna: data.dna.map((d) => ({
      key: d.key,
      label: d.label,
      score: clamp(Math.round(d.score), 0, 100),
      explanation: d.explanation ?? null,
    })),
    documentHealth: {
      score: clamp(Math.round(data.documentHealth.score), 0, 100),
      status: data.documentHealth.status,
      missingItems: data.documentHealth.missingItems,
      existingItems: data.documentHealth.existingItems,
      explanation: data.documentHealth.explanation,
    },
    hiddenConnections: data.hiddenConnections.map((c) => ({
      title: c.title,
      sourceType: c.sourceType,
      sourceId: c.sourceId ?? null,
      sourceTitle: c.sourceTitle ?? null,
      explanation: c.explanation,
      confidence: clamp(c.confidence, 0, 1),
      suggestedAction: c.suggestedAction ?? null,
    })),
    ifDisappearedTomorrow: data.ifDisappearedTomorrow,
    recommendedAction: {
      action: data.recommendedAction.action as AssetRecommendedAction,
      label: data.recommendedAction.label,
      reason: data.recommendedAction.reason,
      urgency: data.recommendedAction.urgency,
    },
    insuranceReadiness: {
      score: clamp(Math.round(data.insuranceReadiness.score), 0, 100),
      explanation: data.insuranceReadiness.explanation,
      missingProof: data.insuranceReadiness.missingProof,
    },
    maintenanceSuggestions: data.maintenanceSuggestions.map((m) => ({
      title: m.title,
      detail: m.detail,
      cadence: m.cadence ?? null,
    })),
    activationPlan: data.activationPlan
      ? {
          title: data.activationPlan.title,
          goal: data.activationPlan.goal,
          days: data.activationPlan.days.slice(0, 7).map((d) => ({
            day: clamp(Math.round(d.day), 1, 7),
            action: d.action,
            reflectionQuestion: d.reflectionQuestion ?? null,
          })),
        }
      : null,
    personalMeaningInsight: data.personalMeaningInsight ?? null,
    suggestedNextActions: data.suggestedNextActions.map((a) => ({
      label: a.label,
      detail: a.detail ?? null,
      kind: a.kind ?? null,
    })),
    generatedAt: new Date().toISOString(),
    modelUsed,
  };
}

export function buildAnalyzePrompt(locale: AppLocale): string {
  return [
    "You are the Asset Intelligence engine inside a personal Life OS. Given one",
    "asset and a compact slice of the user's projects, tasks, goals, notes, and",
    "other assets, produce a rich, honest analysis that treats the object as a",
    "Life OS resource node — carrying value, utility, risk, memory, and future",
    "potential.",
    "",
    "Produce:",
    "- whyThisAssetMatters: 2-4 sentences connecting it to the user's real life.",
    "- dna: 6-10 scored dimensions (0-100) such as Utility, Emotional Value,",
    "  Financial Value, Replacement Difficulty, Maintenance Risk, Documentation",
    "  Health, Resale Liquidity, Creative Leverage, Professional Importance,",
    "  Daily Dependence, Memory Value, Upgrade Pressure. Each with a short label",
    "  and a one-line explanation.",
    "- documentHealth: estimate how well-documented the asset is (score 0-100),",
    "  list existing vs missing proof.",
    "- hiddenConnections: 2-5 non-obvious links to the provided projects/tasks/",
    "  goals/notes. Use the provided ids in sourceId when you reference a real",
    "  item. Never fabricate ids.",
    "- ifDisappearedTomorrow: what would break if this asset were gone.",
    "- recommendedAction: one of keep|sell|repair|upgrade|insure|document|",
    "  activate|archive|donate|replace|review_later, with a reason and urgency.",
    "- insuranceReadiness: score 0-100 + what proof is missing.",
    "- maintenanceSuggestions: 0-4 concrete upkeep items.",
    "- activationPlan: a 7-day plan to make the asset earn its place (optional;",
    "  include when the asset seems underused).",
    "- personalMeaningInsight: what this asset says about the user's life direction.",
    "- suggestedNextActions: 3-6 concrete actions, each tagged kind=task|reminder|document|review.",
    "",
    "Be specific and grounded in the provided context. Do not give financial,",
    "legal, tax, or insurance guarantees. Estimates are estimates.",
    `Write all human-readable text in ${localeLabel(locale)}.`,
  ].join("\n");
}

export function buildAnalyzeUserText(ctx: AssetInsightContextPayload): string {
  return JSON.stringify(ctx, null, 2);
}

// ===========================================================================
// 3. POTENTIAL ASSET ANALYZER
// ===========================================================================

const POTENTIAL_RECS = [
  "buy", "wait", "rent", "repair_existing", "buy_used", "skip", "need_more_context",
] as const;

const PotentialZ = z.object({
  recommendation: z.enum(POTENTIAL_RECS).default("need_more_context"),
  recommendationLabel: z.string().max(80).default(""),
  summary: z.string().max(900).default(""),
  alreadyOwnSimilar: z.string().max(400).nullable().optional(),
  supportedProjects: z.array(z.string().max(160)).max(10).default([]),
  needVsDesire: z.string().max(500).default(""),
  opportunityCost: z.string().max(500).default(""),
  whatItWouldReplace: z.string().max(300).nullable().optional(),
  documentsToCollect: z.array(z.string().max(80)).max(10).default([]),
  confidence: z.number().default(0.5),
});

export type PotentialParsed = z.infer<typeof PotentialZ>;

export const PotentialAssetGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["recommendation", "recommendationLabel", "summary"],
  properties: {
    recommendation: { type: "string", enum: [...POTENTIAL_RECS] },
    recommendationLabel: { type: "string" },
    summary: { type: "string" },
    alreadyOwnSimilar: { type: "string", nullable: true },
    supportedProjects: { type: "array", items: { type: "string" } },
    needVsDesire: { type: "string" },
    opportunityCost: { type: "string" },
    whatItWouldReplace: { type: "string", nullable: true },
    documentsToCollect: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export function parsePotential(raw: unknown): PotentialParsed | null {
  const parsed = PotentialZ.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export function normalizePotential(data: PotentialParsed): PotentialAssetAnalysis {
  return {
    recommendation: data.recommendation,
    recommendationLabel: data.recommendationLabel,
    summary: data.summary,
    alreadyOwnSimilar: data.alreadyOwnSimilar?.trim() || null,
    supportedProjects: data.supportedProjects,
    needVsDesire: data.needVsDesire,
    opportunityCost: data.opportunityCost,
    whatItWouldReplace: data.whatItWouldReplace?.trim() || null,
    documentsToCollect: data.documentsToCollect,
    confidence: clamp(data.confidence, 0, 1),
  };
}

export function buildPotentialPrompt(locale: AppLocale): string {
  return [
    "You are a thoughtful purchasing advisor inside a personal Life OS. The user",
    "is considering acquiring something. Given the candidate item and a compact",
    "slice of what they already own plus their projects/goals, give honest,",
    "non-pushy guidance. You are NOT a salesperson — protect the user from",
    "impulse spending while respecting genuine needs.",
    "",
    "Decide a recommendation: buy | wait | rent | repair_existing | buy_used |",
    "skip | need_more_context. Consider: do they already own something similar,",
    "which projects this would support, practical need vs emotional desire,",
    "opportunity cost, what it would replace, and what proof/documents to collect",
    "after purchase. Frame gaps as coverage, never as aggressive shopping.",
    `Write all human-readable text in ${localeLabel(locale)}.`,
  ].join("\n");
}
