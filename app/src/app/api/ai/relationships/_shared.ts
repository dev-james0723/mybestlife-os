/**
 * Shared helpers for `app/api/ai/relationships/*` route handlers.
 *
 * Holds the locale label map, project-context parsing, Gemini response
 * schemas (OpenAPI-3 subset), and Zod validators for the four AI routes:
 * autofill, log-interaction, analyze, and draft-message.
 *
 * Design rules baked into the prompts (spec §10/§25):
 *   - Distinguish extracted fact vs. user note vs. inference vs. suggestion.
 *   - Never infer sensitive traits (sexuality, religion, politics, health…).
 *   - Never diagnose the relationship or manipulate; suggestions stay gentle.
 *   - The handler NEVER auto-saves — the client reviews everything first.
 */

import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_STRENGTHS,
  type RelationshipCategory,
  type RelationshipStrength,
} from "@/types/relationship";
import { INTERACTION_TYPES } from "@/types/relationship-intelligence";

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------

export const LOCALE_LABEL: Record<AppLocale, string> = {
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

/** Today's date as ISO `YYYY-MM-DD` (server clock). */
export function serverTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Tuple enums for Gemini responseSchema + Zod
// ---------------------------------------------------------------------------

const CATEGORY_ENUM = [...RELATIONSHIP_CATEGORIES] as [
  RelationshipCategory,
  ...RelationshipCategory[],
];
const STRENGTH_ENUM = [...RELATIONSHIP_STRENGTHS] as [
  RelationshipStrength,
  ...RelationshipStrength[],
];
const INTERACTION_ENUM = [...INTERACTION_TYPES] as [
  (typeof INTERACTION_TYPES)[number],
  ...(typeof INTERACTION_TYPES)[number][],
];

// ---------------------------------------------------------------------------
// Project context (the only cross-entity data we forward for linking)
// ---------------------------------------------------------------------------

export type ParsedProjectContext = {
  id: string;
  name: string;
  description: string | null;
}[];

const MAX_CONTEXT_ITEMS = 40;
const MAX_CONTEXT_TEXT = 200;

function clip(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > MAX_CONTEXT_TEXT ? `${t.slice(0, MAX_CONTEXT_TEXT)}…` : t;
}

export function parseProjectContext(raw: unknown): ParsedProjectContext {
  if (!raw || typeof raw !== "object") return [];
  const c = raw as { projects?: unknown };
  const list = Array.isArray(c.projects) ? c.projects : [];
  return list
    .filter(
      (p): p is { id: string; name: string; description?: string | null } =>
        Boolean(p) &&
        typeof (p as { id?: unknown }).id === "string" &&
        typeof (p as { name?: unknown }).name === "string",
    )
    .slice(0, MAX_CONTEXT_ITEMS)
    .map((p) => ({
      id: p.id.trim(),
      name: p.name.trim(),
      description: clip(p.description ?? null),
    }));
}

export function buildProjectBlock(projects: ParsedProjectContext): string {
  if (projects.length === 0) {
    return "USER'S PROJECTS: (none supplied — use null for linked_project_id).";
  }
  const lines = [
    "USER'S PROJECTS (for optional linking — copy an `id` verbatim or use null):",
  ];
  for (const p of projects) {
    lines.push(
      `  - id=${p.id} | name=${JSON.stringify(p.name)} | description=${JSON.stringify(p.description ?? "")}`,
    );
  }
  return lines.join("\n");
}

export function sanitizeProjectId(
  allowed: ReadonlySet<string>,
  id: unknown,
): string | null {
  if (typeof id !== "string") return null;
  const t = id.trim();
  return t && allowed.has(t) ? t : null;
}

const SAFETY_RULES = [
  "SAFETY & ETHICS (mandatory):",
  "  - Treat the input as the user's private memory. Distinguish facts the user",
  "    stated from your own inferences; when unsure, lower the confidence.",
  "  - NEVER infer sensitive traits (sexuality, religion, politics, health,",
  "    trauma, immigration status) unless the user explicitly wrote them.",
  "  - NEVER diagnose the relationship, manipulate, or recommend deception.",
  "  - Keep tone warm, respectful, and non-transactional. Do not rank the person.",
].join("\n");

// ===========================================================================
// AUTOFILL
// ===========================================================================

export const AutofillGeminiSchema = {
  type: "object",
  properties: {
    person_name: { type: "string" },
    category: { type: "string", enum: CATEGORY_ENUM, nullable: true },
    relationship_strength: {
      type: "string",
      enum: STRENGTH_ENUM,
      nullable: true,
    },
    email: { type: "string", nullable: true },
    phone: { type: "string", nullable: true },
    last_contact_date: { type: "string", nullable: true },
    last_interaction_notes: { type: "string", nullable: true },
    next_action: { type: "string", nullable: true },
    next_action_date: { type: "string", nullable: true },
    commitments_made: { type: "string", nullable: true },
    preferences_and_details: { type: "string", nullable: true },
    general_notes: { type: "string", nullable: true },
    tags: { type: "array", items: { type: "string" } },
    linked_project_id: { type: "string", nullable: true },
    confidence: { type: "number" },
    field_confidence: {
      type: "object",
      properties: {},
      nullable: true,
    },
    missing_fields: { type: "array", items: { type: "string" } },
    suggested_next_actions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["person_name", "tags", "confidence"],
} as const;

const nullableStr = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t ? t.slice(0, max) : null;
    });

const FieldConfidenceZ = z.enum(["high", "medium", "low", "missing"]);

export const AutofillResultZ = z.object({
  person_name: z.string().min(1).max(120),
  category: z.enum(CATEGORY_ENUM).nullable().optional(),
  relationship_strength: z.enum(STRENGTH_ENUM).nullable().optional(),
  email: nullableStr(160),
  phone: nullableStr(60),
  last_contact_date: nullableStr(10),
  last_interaction_notes: nullableStr(2000),
  next_action: nullableStr(400),
  next_action_date: nullableStr(10),
  commitments_made: nullableStr(2000),
  preferences_and_details: nullableStr(2000),
  general_notes: nullableStr(2000),
  tags: z.array(z.string().min(1).max(40)).max(16).default([]),
  linked_project_id: z.union([z.string(), z.null()]).optional(),
  confidence: z.number().min(0).max(1).catch(0.5),
  field_confidence: z.record(z.string(), FieldConfidenceZ).optional(),
  missing_fields: z.array(z.string().max(60)).max(20).default([]),
  suggested_next_actions: z.array(z.string().min(1).max(200)).max(8).default([]),
  warnings: z.array(z.string().min(1).max(300)).max(8).default([]),
});

export function buildAutofillPrompt(
  locale: AppLocale,
  projects: ParsedProjectContext,
): string {
  return [
    "You convert a user's messy memory about ONE person (pasted notes, an email",
    "snippet, a meeting summary, or a one-line description) into a structured",
    "relationship profile for a private life-OS app. The schema is enforced.",
    "",
    buildProjectBlock(projects),
    "",
    `Today's date is ${serverTodayIso()}. Resolve relative dates ("today",`,
    '"tomorrow", "last Friday") to absolute ISO `YYYY-MM-DD`. If a date is',
    "implied but not certain, put it in next_action and leave the date null.",
    "",
    "FIELD GUIDELINES:",
    "  - person_name: the person's name. If truly unknown, use a short placeholder.",
    "  - category: pick the single best fit from the allowed enum, else null.",
    "  - relationship_strength: 'new' unless the notes imply more history.",
    "  - email/phone: only if literally present in the text.",
    "  - last_contact_date: the date of the described interaction, if any.",
    "  - last_interaction_notes: 1-3 sentence summary of what happened.",
    "  - next_action: the single most useful next step for the USER to take.",
    "  - commitments_made: what the user owes this person (promises).",
    "  - preferences_and_details: communication style, likes, important facts.",
    "  - tags: 2-6 short lowercase tags.",
    "  - linked_project_id: copy an id from USER'S PROJECTS only if clearly related, else null.",
    "  - confidence: 0..1 overall. field_confidence: map of field→high|medium|low|missing.",
    "  - missing_fields: fields a thoughtful CRM would still want (e.g. 'next_action_date').",
    "  - suggested_next_actions: 1-4 gentle, optional follow-up ideas.",
    "  - warnings: note anything ambiguous or inferred rather than stated.",
    "",
    SAFETY_RULES,
    "",
    `Write all free-text fields in ${localeLabel(locale)}.`,
  ].join("\n");
}

// ===========================================================================
// LOG INTERACTION
// ===========================================================================

export const LogInteractionGeminiSchema = {
  type: "object",
  properties: {
    interaction_date: { type: "string", nullable: true },
    interaction_type: { type: "string", enum: INTERACTION_ENUM },
    summary: { type: "string" },
    commitments: { type: "array", items: { type: "string" } },
    preferences_and_details: { type: "string", nullable: true },
    next_action: { type: "string", nullable: true },
    next_action_date: { type: "string", nullable: true },
    tags: { type: "array", items: { type: "string" } },
    suggested_strength: { type: "string", enum: STRENGTH_ENUM, nullable: true },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["interaction_type", "summary", "commitments", "tags"],
} as const;

export const LogInteractionZ = z.object({
  interaction_date: nullableStr(10),
  interaction_type: z.enum(INTERACTION_ENUM).catch("other"),
  summary: z.string().max(2000).default(""),
  commitments: z.array(z.string().min(1).max(400)).max(12).default([]),
  preferences_and_details: nullableStr(2000),
  next_action: nullableStr(400),
  next_action_date: nullableStr(10),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  suggested_strength: z.enum(STRENGTH_ENUM).nullable().optional(),
  warnings: z.array(z.string().min(1).max(300)).max(8).default([]),
});

export function buildLogInteractionPrompt(
  locale: AppLocale,
  personName: string,
): string {
  return [
    `You extract a structured update from a quick note the user wrote about an`,
    `interaction with "${personName}". The schema is enforced.`,
    "",
    `Today's date is ${serverTodayIso()}. Resolve relative dates to ISO`,
    "`YYYY-MM-DD`. If the note doesn't mention a date, set interaction_date to today.",
    "",
    "GUIDELINES:",
    "  - summary: a concise, factual recap of the interaction.",
    "  - commitments: each promise the USER made, as a short imperative line.",
    "  - preferences_and_details: communication style / facts worth remembering.",
    "  - next_action: the single best next step, if any.",
    "  - suggested_strength: only suggest if the note clearly implies a change.",
    "  - tags: 2-6 short lowercase tags.",
    "  - warnings: flag anything ambiguous or inferred.",
    "",
    SAFETY_RULES,
    "",
    `Write all free-text fields in ${localeLabel(locale)}.`,
  ].join("\n");
}

// ===========================================================================
// ANALYZE  (Relationship Intelligence Report)
// ===========================================================================

export const AnalyzeGeminiSchema = {
  type: "object",
  properties: {
    whyThisPersonMatters: { type: "string" },
    relationshipMemoryCapsule: {
      type: "object",
      properties: {
        whoTheyAre: { type: "string" },
        howYouKnowThem: { type: "string" },
        whatToRemember: { type: "array", items: { type: "string" } },
        openLoops: { type: "array", items: { type: "string" } },
        lastMeaningfulMemory: { type: "string", nullable: true },
      },
      required: ["whoTheyAre", "howYouKnowThem", "whatToRemember", "openLoops"],
    },
    nextBestTouchpoint: {
      type: "object",
      properties: {
        recommendation: { type: "string" },
        timing: { type: "string" },
        channel: { type: "string", nullable: true },
        reason: { type: "string" },
        whatNotToSay: { type: "array", items: { type: "string" } },
      },
      required: ["recommendation", "timing", "reason"],
    },
    careWithoutOverdoing: { type: "string" },
    dontForget: { type: "array", items: { type: "string" } },
    hiddenConnections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          sourceType: {
            type: "string",
            enum: ["project", "task", "goal", "note", "event", "image", "pattern"],
          },
          sourceId: { type: "string", nullable: true },
          sourceTitle: { type: "string", nullable: true },
          explanation: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["title", "sourceType", "explanation", "confidence"],
      },
    },
    boundaryAndSensitivityNotes: { type: "array", items: { type: "string" } },
    suggestedNextActions: { type: "array", items: { type: "string" } },
  },
  required: [
    "whyThisPersonMatters",
    "relationshipMemoryCapsule",
    "nextBestTouchpoint",
    "careWithoutOverdoing",
    "dontForget",
    "suggestedNextActions",
  ],
} as const;

export const AnalyzeZ = z.object({
  whyThisPersonMatters: z.string().max(1200).default(""),
  relationshipMemoryCapsule: z.object({
    whoTheyAre: z.string().max(600).default(""),
    howYouKnowThem: z.string().max(600).default(""),
    whatToRemember: z.array(z.string().min(1).max(300)).max(10).default([]),
    openLoops: z.array(z.string().min(1).max(300)).max(10).default([]),
    lastMeaningfulMemory: nullableStr(400),
  }),
  nextBestTouchpoint: z.object({
    recommendation: z.string().max(600).default(""),
    timing: z.string().max(160).default(""),
    channel: nullableStr(60),
    reason: z.string().max(600).default(""),
    whatNotToSay: z.array(z.string().min(1).max(240)).max(6).default([]),
  }),
  careWithoutOverdoing: z.string().max(600).default(""),
  dontForget: z.array(z.string().min(1).max(240)).max(10).default([]),
  hiddenConnections: z
    .array(
      z.object({
        title: z.string().max(160).default(""),
        sourceType: z.enum([
          "project",
          "task",
          "goal",
          "note",
          "event",
          "image",
          "pattern",
        ]),
        sourceId: nullableStr(64),
        sourceTitle: nullableStr(200),
        explanation: z.string().max(600).default(""),
        confidence: z.number().min(0).max(1).catch(0.5),
      }),
    )
    .max(8)
    .default([]),
  boundaryAndSensitivityNotes: z
    .array(z.string().min(1).max(300))
    .max(6)
    .default([]),
  suggestedNextActions: z.array(z.string().min(1).max(200)).max(8).default([]),
});

export function buildAnalyzePrompt(locale: AppLocale): string {
  return [
    "You are a thoughtful, discreet relationship chief-of-staff for a private",
    "life-OS app. Given a person's profile, recent interactions, open promises,",
    "and lightly-related projects, produce an intelligence report that helps the",
    "user maintain the relationship with care, timing, and restraint.",
    "",
    "Be SPECIFIC to the supplied data — never generic. If data is thin, say so",
    "plainly and keep claims modest.",
    "",
    "SECTIONS:",
    "  - whyThisPersonMatters: concrete, grounded in the user's projects/goals.",
    "  - relationshipMemoryCapsule: who they are, how you know them, what to",
    "    remember, open loops, and (if any) the last meaningful memory.",
    "  - nextBestTouchpoint: the single best next contact — recommendation,",
    "    timing, channel, reason, and what NOT to say.",
    "  - careWithoutOverdoing: one paragraph advising appropriate restraint.",
    "  - dontForget: 2-5 tiny, highly personal reminders drawn from the data.",
    "  - hiddenConnections: links to the user's projects/goals/notes (only those",
    "    supplied; copy ids when given). Empty array if none.",
    "  - boundaryAndSensitivityNotes: gentle cautions, if relevant.",
    "  - suggestedNextActions: 2-5 optional, low-pressure actions.",
    "",
    SAFETY_RULES,
    "  - Frame 'Relationship Weather' as the status of the CONTEXT, never a score",
    "    of the person. Avoid any ranking-by-usefulness language.",
    "",
    `Write everything in ${localeLabel(locale)}.`,
  ].join("\n");
}

// ===========================================================================
// DRAFT MESSAGE
// ===========================================================================

export const DraftMessageGeminiSchema = {
  type: "object",
  properties: {
    subject: { type: "string", nullable: true },
    body: { type: "string" },
    suggestedChannel: {
      type: "string",
      enum: ["email", "whatsapp", "sms", "phone", "in_person"],
      nullable: true,
    },
    caution: { type: "string", nullable: true },
  },
  required: ["body"],
} as const;

export const DraftMessageZ = z.object({
  subject: nullableStr(200),
  body: z.string().min(1).max(4000),
  suggestedChannel: z
    .enum(["email", "whatsapp", "sms", "phone", "in_person"])
    .nullable()
    .optional(),
  caution: nullableStr(400),
});

export function buildDraftMessagePrompt(
  locale: AppLocale,
  opts: { purpose: string; tone: string },
): string {
  return [
    `You draft a ${opts.tone}, ${opts.purpose.replace(/_/g, " ")} message the`,
    "user MIGHT send to a person, based on their relationship context. This is a",
    "DRAFT ONLY — it will never be sent automatically; the user copies/edits it.",
    "",
    "GUIDELINES:",
    "  - Match the requested tone and purpose. Keep it natural and human.",
    "  - Reference real context (commitments, last interaction) where helpful.",
    "  - For email, include a short subject. For chat channels, subject may be null.",
    "  - caution: a one-line note if there's a tone/timing risk to be aware of.",
    "",
    SAFETY_RULES,
    "  - Never write anything deceptive or manipulative. No pressure tactics.",
    "",
    `Write the message in ${localeLabel(locale)} unless the user asked otherwise.`,
  ].join("\n");
}
