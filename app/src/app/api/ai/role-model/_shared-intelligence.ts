/**
 * Shared schemas + prompt builders for the Role Model Intelligence routes:
 *   - /api/ai/role-model/analyze       (per-model: why-now, hidden connections, DNA…)
 *   - /api/ai/role-model/patterns      (collection-level pattern report)
 *   - /api/ai/role-model/distill-skill (Role Model → Neural Skill)
 *
 * Mirrors the autofill route's discipline: a strict OpenAPI-3 `responseSchema`
 * for Gemini, then a Zod re-validation server-side because Gemini occasionally
 * violates its own schema.
 */

import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

// ===========================================================================
// Context → prompt text
// ===========================================================================

function list(label: string, items: string[]): string {
  if (!items.length) return "";
  return `${label}:\n${items.map((i) => `- ${i}`).join("\n")}`;
}

/** Render the compact context payload into a grounded prompt block. */
export function buildContextBlock(ctx: RoleModelInsightContextPayload): string {
  const rm = ctx.roleModel;
  const parts: string[] = [];

  parts.push(
    [
      `ROLE MODEL: ${rm.name}`,
      rm.category ? `Category: ${rm.category}` : "",
      rm.admiration_blurb ? `Why the user admires them: ${rm.admiration_blurb}` : "",
      rm.bio ? `Bio: ${rm.bio}` : "",
      rm.tags?.length ? `Tags: ${rm.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (rm.quotes?.length) parts.push(list("Quotes the user saved", rm.quotes));
  if (rm.keyLessons?.length) parts.push(list("Key lessons the user saved", rm.keyLessons));

  if (ctx.aboutMe) {
    parts.push(
      [
        "ABOUT THE USER:",
        ctx.aboutMe.mission ? `Mission: ${ctx.aboutMe.mission}` : "",
        ctx.aboutMe.coreValues ? `Core values: ${ctx.aboutMe.coreValues}` : "",
        ctx.aboutMe.personality ? `Personality: ${ctx.aboutMe.personality}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const linkedProjects = new Set(ctx.linkedProjectIds ?? []);
  const linkedGoals = new Set(ctx.linkedGoalIds ?? []);

  if (ctx.projects?.length) {
    parts.push(
      list(
        "USER PROJECTS (★ = directly linked to this role model)",
        ctx.projects.map(
          (p) =>
            `${linkedProjects.has(p.id) ? "★ " : ""}[id:${p.id}] ${p.title}${p.status ? ` (${p.status})` : ""}${p.description ? ` — ${p.description}` : ""}`,
        ),
      ),
    );
  }
  if (ctx.goals?.length) {
    parts.push(
      list(
        "USER GOALS (★ = linked)",
        ctx.goals.map(
          (g) =>
            `${linkedGoals.has(g.id) ? "★ " : ""}[id:${g.id}] ${g.title}${g.status ? ` (${g.status})` : ""}`,
        ),
      ),
    );
  }
  if (ctx.tasks?.length) {
    parts.push(list("OPEN TASKS", ctx.tasks.map((t) => `[id:${t.id}] ${t.title}`)));
  }
  if (ctx.notes?.length) {
    parts.push(
      list(
        "NOTES",
        ctx.notes.map((n) => `[id:${n.id}] ${n.title}${n.snippet ? ` — ${n.snippet}` : ""}`),
      ),
    );
  }
  if (ctx.ideas?.length) {
    parts.push(list("IDEAS", ctx.ideas.map((i) => `[id:${i.id}] ${i.title}`)));
  }
  if (ctx.otherRoleModels?.length) {
    parts.push(list("OTHER ROLE MODELS the user keeps", ctx.otherRoleModels));
  }

  return parts.filter(Boolean).join("\n\n");
}

const LANGUAGE_RULE = (locale: AppLocale) =>
  `Write ALL output in the user's language (locale code: ${locale}). Be specific, mature, and grounded in the data above — never generic admiration.`;

const SAFETY_RULES = `Hard rules:
- You are an interpretive lens, NOT the real person. Never claim to be them, never invent biographical facts or private details.
- Distinguish fact (from the bio/quotes) vs inference (from the user's data) vs suggestion.
- No psychological diagnosis. Focus on practical self-development and decision-making.
- Cite the user's own data when you draw a connection (reference project/goal/note titles).`;

// ===========================================================================
// ANALYZE
// ===========================================================================

export function buildAnalyzePrompt(ctx: RoleModelInsightContextPayload, locale: AppLocale): string {
  return [
    `You are the Role Model Intelligence engine inside a personal "Life OS". Analyze why this role model matters to THIS user, using their real data.`,
    SAFETY_RULES,
    LANGUAGE_RULE(locale),
    "",
    "Produce JSON with:",
    `- whyNow: 2-4 sentences on why the user is drawn to this person at THIS stage, grounded in their projects/goals/notes. Specific, not flattering.`,
    `- hiddenConnections: 2-4 surprising links between the role model and the user's actual data. Each: title, sourceType (project|goal|task|note|idea|knowledge|about_me|pattern), sourceId (the [id:...] when it maps to one item, else omit), sourceTitle, explanation, confidence (0-100), reflectionQuestion.`,
    `- whatNotToCopy: 2-4 mature cautions — traits/patterns unhealthy to imitate directly, tuned to the user's situation. Direct, not moralizing.`,
    `- roleModelDNA: 6-9 scored dimensions (key, label, score 0-100, short explanation) such as Systems Thinking, Taste, Craft Depth, Risk Appetite, Emotional Sustainability, Execution Speed, Technical Depth, Public Influence, Independence, Institution Building, Long-Term Patience, Human Warmth, Strategic Discipline.`,
    `- overlapWithUser: { high[], medium[], caution[] } — traits the user already shares (high), partially (medium), and should watch (caution).`,
    `- mirrorInsight: 1-3 sentences on what this admiration reveals the user is seeking / becoming.`,
    `- challengePrompts: 2-3 sharp prompts the user could send to this lens (title, prompt, bestFor[]). Make them reference the user's real projects/goals.`,
    `- suggestedActions: 1-3 next steps (label, kind: experiment|challenge|neural_skill|reflect|link, detail).`,
    "",
    "CONTEXT:",
    buildContextBlock(ctx),
  ].join("\n");
}

const stringArr = (max: number, itemMax = 400) =>
  z.array(z.string().min(1).max(itemMax)).max(max).default([]);

export const RoleModelInsightResultZ = z.object({
  whyNow: z.string().min(1).max(1200),
  hiddenConnections: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        sourceType: z.enum([
          "project",
          "goal",
          "task",
          "note",
          "idea",
          "knowledge",
          "about_me",
          "pattern",
        ]),
        sourceId: z.string().max(64).nullable().optional(),
        sourceTitle: z.string().max(200).nullable().optional(),
        explanation: z.string().min(1).max(800),
        confidence: z.number().min(0).max(100),
        reflectionQuestion: z.string().min(1).max(400),
      }),
    )
    .max(6)
    .default([]),
  whatNotToCopy: stringArr(6, 600),
  roleModelDNA: z
    .array(
      z.object({
        key: z.string().min(1).max(60),
        label: z.string().min(1).max(60),
        score: z.number().min(0).max(100),
        explanation: z.string().max(400).nullable().optional(),
      }),
    )
    .max(12)
    .default([]),
  overlapWithUser: z
    .object({
      high: stringArr(8, 120),
      medium: stringArr(8, 120),
      caution: stringArr(8, 120),
    })
    .default({ high: [], medium: [], caution: [] }),
  mirrorInsight: z.string().min(1).max(600),
  challengePrompts: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        prompt: z.string().min(1).max(800),
        bestFor: stringArr(6, 80),
      }),
    )
    .max(5)
    .default([]),
  suggestedActions: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        kind: z.enum(["experiment", "challenge", "neural_skill", "reflect", "link"]),
        detail: z.string().max(300).nullable().optional(),
      }),
    )
    .max(5)
    .default([]),
});

const STR = { type: "string" } as const;
const STR_NULLABLE = { type: "string", nullable: true } as const;
const NUM = { type: "number" } as const;
const strArrSchema = { type: "array", items: { type: "string" } } as const;

export const RoleModelAnalyzeGeminiSchema = {
  type: "object",
  properties: {
    whyNow: STR,
    hiddenConnections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: STR,
          sourceType: { type: "string" },
          sourceId: STR_NULLABLE,
          sourceTitle: STR_NULLABLE,
          explanation: STR,
          confidence: NUM,
          reflectionQuestion: STR,
        },
        required: ["title", "sourceType", "explanation", "confidence", "reflectionQuestion"],
      },
    },
    whatNotToCopy: strArrSchema,
    roleModelDNA: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: STR,
          label: STR,
          score: NUM,
          explanation: STR_NULLABLE,
        },
        required: ["key", "label", "score"],
      },
    },
    overlapWithUser: {
      type: "object",
      properties: { high: strArrSchema, medium: strArrSchema, caution: strArrSchema },
      required: ["high", "medium", "caution"],
    },
    mirrorInsight: STR,
    challengePrompts: {
      type: "array",
      items: {
        type: "object",
        properties: { title: STR, prompt: STR, bestFor: strArrSchema },
        required: ["title", "prompt"],
      },
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object",
        properties: { label: STR, kind: STR, detail: STR_NULLABLE },
        required: ["label", "kind"],
      },
    },
  },
  required: ["whyNow", "hiddenConnections", "whatNotToCopy", "roleModelDNA", "mirrorInsight"],
} as const;

// ===========================================================================
// PATTERNS (collection-level)
// ===========================================================================

export function buildPatternsPrompt(
  roleModelNames: { name: string; category?: string | null; blurb?: string | null }[],
  aboutMe: RoleModelInsightContextPayload["aboutMe"],
  locale: AppLocale,
): string {
  const roster = roleModelNames
    .map(
      (r) =>
        `- ${r.name}${r.category ? ` (${r.category})` : ""}${r.blurb ? ` — ${r.blurb}` : ""}`,
    )
    .join("\n");
  return [
    `You are analyzing the user's ENTIRE collection of role models to reveal what it says about them.`,
    SAFETY_RULES,
    LANGUAGE_RULE(locale),
    "",
    "Produce JSON with:",
    `- summary: 2-4 sentences on what this collection reveals about the user.`,
    `- recurringTraits: traits repeatedly admired.`,
    `- dominantArchetypes: the archetypes that dominate (e.g. Builder, Performer, Operator).`,
    `- blindSpots: what the collection over-weights and what it neglects (e.g. intensity over peace).`,
    `- missingArchetypes: archetypes worth adding to counterbalance.`,
    `- buildingToward: a short banner phrase like "Institution Builder + Cross-Domain Artist + Systems Thinker".`,
    `- suggestedRoleModels: 2-4 { archetype, reason, exampleNames[] } for who to add next.`,
    "",
    aboutMe
      ? `ABOUT THE USER:\n${[aboutMe.mission, aboutMe.coreValues, aboutMe.personality].filter(Boolean).join("\n")}`
      : "",
    "",
    `ROLE MODELS (${roleModelNames.length}):\n${roster}`,
  ].join("\n");
}

export const RoleModelPatternResultZ = z.object({
  summary: z.string().min(1).max(1000),
  recurringTraits: stringArr(10, 120),
  dominantArchetypes: stringArr(8, 80),
  blindSpots: stringArr(8, 300),
  missingArchetypes: stringArr(8, 120),
  buildingToward: z.string().max(200).default(""),
  suggestedRoleModels: z
    .array(
      z.object({
        archetype: z.string().min(1).max(120),
        reason: z.string().min(1).max(400),
        exampleNames: stringArr(5, 80),
      }),
    )
    .max(6)
    .default([]),
});

export const RoleModelPatternsGeminiSchema = {
  type: "object",
  properties: {
    summary: STR,
    recurringTraits: strArrSchema,
    dominantArchetypes: strArrSchema,
    blindSpots: strArrSchema,
    missingArchetypes: strArrSchema,
    buildingToward: STR,
    suggestedRoleModels: {
      type: "array",
      items: {
        type: "object",
        properties: { archetype: STR, reason: STR, exampleNames: strArrSchema },
        required: ["archetype", "reason"],
      },
    },
  },
  required: ["summary", "recurringTraits", "dominantArchetypes", "blindSpots", "missingArchetypes"],
} as const;

// ===========================================================================
// DISTILL SKILL (Role Model → Neural Skill)
// ===========================================================================

export function buildDistillPrompt(ctx: RoleModelInsightContextPayload, locale: AppLocale): string {
  return [
    `Distill this role model into a reusable "Neural Skill" — an interpretive thinking lens for the user's Mind Council.`,
    SAFETY_RULES,
    LANGUAGE_RULE(locale),
    "",
    "Produce JSON with:",
    `- lensTitle: e.g. "${ctx.roleModel.name}–inspired Lens".`,
    `- lensSubtitle: one short framing line.`,
    `- systemPromptHint: 2-4 sentences instructing an AI how to think in this lens (style, heuristics, boundaries). MUST include "Never claim to be ${ctx.roleModel.name}".`,
    `- thinkingStyle, communicationStyle: short paragraphs.`,
    `- decisionPrinciples, likelyQuestions, bestFor, avoidFor, blindSpots, starterPrompts: arrays of short strings.`,
    "",
    "CONTEXT:",
    buildContextBlock(ctx),
  ].join("\n");
}

export const NeuralSkillContentZ = z.object({
  lensTitle: z.string().min(1).max(120),
  lensSubtitle: z.string().max(160).default(""),
  systemPromptHint: z.string().min(1).max(1200),
  thinkingStyle: z.string().max(800).default(""),
  decisionPrinciples: stringArr(8, 200),
  communicationStyle: z.string().max(600).default(""),
  likelyQuestions: stringArr(8, 200),
  bestFor: stringArr(8, 120),
  avoidFor: stringArr(8, 120),
  blindSpots: stringArr(8, 200),
  starterPrompts: stringArr(6, 240),
});

export const NeuralSkillGeminiSchema = {
  type: "object",
  properties: {
    lensTitle: STR,
    lensSubtitle: STR,
    systemPromptHint: STR,
    thinkingStyle: STR,
    decisionPrinciples: strArrSchema,
    communicationStyle: STR,
    likelyQuestions: strArrSchema,
    bestFor: strArrSchema,
    avoidFor: strArrSchema,
    blindSpots: strArrSchema,
    starterPrompts: strArrSchema,
  },
  required: ["lensTitle", "systemPromptHint", "bestFor", "avoidFor"],
} as const;

// ===========================================================================
// Shared context parsing (server-side trust boundary)
// ===========================================================================

/**
 * Parse + clamp the client-supplied context payload. The client builds this
 * with `buildRoleModelInsightContext`, but we re-clamp here since it crosses
 * the trust boundary.
 */
export function parseInsightContext(raw: unknown): RoleModelInsightContextPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rm = r.roleModel as Record<string, unknown> | undefined;
  if (!rm || typeof rm.name !== "string") return null;

  const clip = (v: unknown, max = 600): string | null =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  const strArr = (v: unknown, max = 16, itemMax = 240): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, itemMax)).slice(0, max)
      : [];
  const idTitle = (v: unknown, max = 16) =>
    Array.isArray(v)
      ? v
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({
            id: typeof x.id === "string" ? x.id.slice(0, 64) : "",
            title: clip(x.title, 160) ?? "",
            status: typeof x.status === "string" ? x.status.slice(0, 32) : undefined,
            description: clip(x.description, 200),
            snippet: clip(x.snippet, 200),
          }))
          .filter((x) => x.id && x.title)
          .slice(0, max)
      : [];

  return {
    locale: undefined,
    roleModel: {
      id: typeof rm.id === "string" ? rm.id.slice(0, 64) : "",
      name: rm.name.slice(0, 120),
      category: clip(rm.category, 60),
      admiration_blurb: clip(rm.admiration_blurb, 300),
      bio: clip(rm.bio, 800),
      tags: strArr(rm.tags, 12, 40),
      quotes: strArr(rm.quotes, 4, 200),
      keyLessons: strArr(rm.keyLessons, 5, 160),
    },
    linkedProjectIds: strArr(r.linkedProjectIds, 40, 64),
    linkedGoalIds: strArr(r.linkedGoalIds, 40, 64),
    linkedNoteIds: strArr(r.linkedNoteIds, 40, 64),
    projects: idTitle(r.projects, 12),
    goals: idTitle(r.goals, 10),
    tasks: idTitle(r.tasks, 14),
    notes: idTitle(r.notes, 10),
    ideas: idTitle(r.ideas, 8),
    aboutMe:
      r.aboutMe && typeof r.aboutMe === "object"
        ? {
            mission: clip((r.aboutMe as Record<string, unknown>).mission, 300),
            coreValues: clip((r.aboutMe as Record<string, unknown>).coreValues, 300),
            personality: clip((r.aboutMe as Record<string, unknown>).personality, 300),
          }
        : null,
    otherRoleModels: strArr(r.otherRoleModels, 12, 80),
  };
}
