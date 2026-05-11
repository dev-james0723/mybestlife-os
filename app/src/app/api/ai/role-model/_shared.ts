/**
 * Shared helpers for `app/api/ai/role-model/*` route handlers.
 *
 * Currently only `autofill` lives under this folder, but the prompt builders,
 * Gemini response schema, and Zod validators are split here so future routes
 * (e.g. "suggest a quote", "regenerate just the bio") can reuse the same
 * shape contract.
 */

import { z } from "zod";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  ROLE_MODEL_LINK_KINDS,
  ROLE_MODEL_SUGGESTED_CATEGORIES,
  type RoleModelAutoFillResult,
  type RoleModelAutofillContextPayload,
} from "@/types/role-model";

// Cast once to a mutable string[] for the OpenAPI/JSON schema "enum" slot —
// JSON Schema requires a mutable array shape, and Zod requires a non-empty
// tuple (so we re-typed as such where needed below).
const LINK_KIND_ENUM_VALUES = [...ROLE_MODEL_LINK_KINDS] as [
  (typeof ROLE_MODEL_LINK_KINDS)[number],
  ...(typeof ROLE_MODEL_LINK_KINDS)[number][],
];

// ============================================================
// URL + portrait helpers (Gemini often returns slightly messy URLs)
// ============================================================

/**
 * Normalizes a model-supplied URL into a safe http(s) URL, or `null` if it
 * cannot be parsed. This is intentionally forgiving — strict `z.string().url()`
 * rejects many real Wikimedia URLs that models emit with stray punctuation.
 */
export function normalizeHttpUrl(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || /^none$/i.test(s)) return null;
  // Strip common markdown / wrapping noise.
  s = s.replace(/^[`'"[(]+|[`'"')\]]+$/g, "").trim();
  // Strip trailing sentence punctuation that sometimes glues to the URL.
  s = s.replace(/[.,;:!?]+$/g, "").trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) {
    if (s.startsWith("//")) s = `https:${s}`;
    else if (/^www\./i.test(s)) s = `https://${s}`;
    else s = `https://${s}`;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    let href = u.toString();
    if (href.length > 800) href = href.slice(0, 800);
    return href;
  } catch {
    return null;
  }
}

function looksLikeDirectImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("special:filepath")) return true;
  return /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(lower);
}

/**
 * Scans free-form research notes for a usable portrait URL when structured
 * extraction omits or corrupts `photo_url`. Wikimedia + Commons are treated
 * as first-class sources.
 */
export function inferPortraitUrlFromResearchNotes(
  researchNotes: string,
  extractedPhoto: string | null,
): string | null {
  const normalizedExtracted = normalizeHttpUrl(extractedPhoto);
  if (normalizedExtracted) {
    const looksImage =
      looksLikeDirectImageUrl(normalizedExtracted) ||
      normalizedExtracted.includes("upload.wikimedia.org");
    // Reject bare Wikipedia article URLs — they are not images and break <img>.
    const isWikiArticleOnly =
      /wikipedia\.org\/wiki\//i.test(normalizedExtracted) &&
      !normalizedExtracted.includes("upload.wikimedia.org") &&
      !normalizedExtracted.toLowerCase().includes("special:filepath");
    if (looksImage && !isWikiArticleOnly) {
      return normalizedExtracted;
    }
  }

  const notes = researchNotes ?? "";

  const portraitLine = notes.match(
    /^\s*PORTRAIT_IMAGE_URL:\s*(\S+)/im,
  );
  if (portraitLine?.[1]) {
    const u = normalizeHttpUrl(portraitLine[1]);
    if (u && (looksLikeDirectImageUrl(u) || u.includes("wikimedia"))) return u;
  }

  const uploadWiki = notes.match(
    /https?:\/\/upload\.wikimedia\.org\/[^\s"'<>)\]]+/gi,
  );
  if (uploadWiki) {
    for (const raw of uploadWiki) {
      const u = normalizeHttpUrl(raw);
      if (u && looksLikeDirectImageUrl(u)) return u;
    }
  }

  const filePath = notes.match(
    /https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/[^\s"'<>)\]]+/gi,
  );
  if (filePath) {
    const u = normalizeHttpUrl(filePath[0]);
    if (u) return u;
  }

  return normalizedExtracted;
}

/** Server-side parse + size limits for the optional `context` request body. */
export type ParsedAutofillContext = {
  projects: { id: string; name: string; description: string | null }[];
  goals: { id: string; name: string; description: string | null }[];
  notes: { id: string; title: string; content: string | null }[];
  tasks: {
    id: string;
    title: string;
    description: string | null;
    project_id: string | null;
  }[];
};

const MAX_CONTEXT_ITEMS = 40;
const MAX_CONTEXT_TEXT = 220;

function clip(s: string | null | undefined): string | null {
  if (s == null) return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > MAX_CONTEXT_TEXT ? `${t.slice(0, MAX_CONTEXT_TEXT)}…` : t;
}

export function parseAutofillContextPayload(
  raw: unknown,
): ParsedAutofillContext {
  const empty: ParsedAutofillContext = {
    projects: [],
    goals: [],
    notes: [],
    tasks: [],
  };
  if (!raw || typeof raw !== "object") return empty;
  const c = raw as RoleModelAutofillContextPayload;

  const projects = (Array.isArray(c.projects) ? c.projects : [])
    .filter((p) => p && typeof p.id === "string" && typeof p.name === "string")
    .slice(0, MAX_CONTEXT_ITEMS)
    .map((p) => ({
      id: p.id.trim(),
      name: p.name.trim(),
      description: clip(p.description ?? null),
    }));

  const goals = (Array.isArray(c.goals) ? c.goals : [])
    .filter((g) => g && typeof g.id === "string" && typeof g.name === "string")
    .slice(0, MAX_CONTEXT_ITEMS)
    .map((g) => ({
      id: g.id.trim(),
      name: g.name.trim(),
      description: clip(g.description ?? null),
    }));

  const notes = (Array.isArray(c.notes) ? c.notes : [])
    .filter((n) => n && typeof n.id === "string" && typeof n.title === "string")
    .slice(0, MAX_CONTEXT_ITEMS)
    .map((n) => ({
      id: n.id.trim(),
      title: n.title.trim(),
      content: clip(n.content ?? null),
    }));

  const tasks = (Array.isArray(c.tasks) ? c.tasks : [])
    .filter((t) => t && typeof t.id === "string" && typeof t.title === "string")
    .slice(0, MAX_CONTEXT_ITEMS)
    .map((t) => ({
      id: t.id.trim(),
      title: t.title.trim(),
      description: clip(t.description ?? null),
      project_id:
        typeof t.project_id === "string" && t.project_id.trim()
          ? t.project_id.trim()
          : null,
    }));

  return { projects, goals, notes, tasks };
}

export function sanitizeLinkedIds(
  allowed: ReadonlySet<string>,
  ids: unknown,
  max = 12,
): string[] {
  if (!Array.isArray(ids)) return [];
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const t = id.trim();
    if (!t || !allowed.has(t)) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function buildUserWorkContextBlock(parsed: ParsedAutofillContext): string {
  const lines: string[] = [
    "USER'S CURRENT WORK (for optional linking only):",
    "The JSON schema includes linked_project_ids, linked_goal_ids, and linked_note_ids.",
    "You may ONLY copy `id` values from the lists below — never invent UUIDs.",
    "If nothing clearly relates to this role model, return empty arrays for all three.",
    "Tasks are context only (not linkable in the database). If a task implies relevance,",
    "prefer linking its parent project_id when that project id appears in PROJECTS.",
    "",
  ];

  if (parsed.projects.length === 0 && parsed.goals.length === 0 && parsed.notes.length === 0 && parsed.tasks.length === 0) {
    lines.push("(No projects, goals, notes, or tasks were supplied.)");
    return lines.join("\n");
  }

  if (parsed.projects.length) {
    lines.push("PROJECTS:");
    for (const p of parsed.projects) {
      lines.push(
        `  - id=${p.id} | name=${JSON.stringify(p.name)} | description=${JSON.stringify(p.description ?? "")}`,
      );
    }
    lines.push("");
  }
  if (parsed.goals.length) {
    lines.push("GOALS:");
    for (const g of parsed.goals) {
      lines.push(
        `  - id=${g.id} | name=${JSON.stringify(g.name)} | description=${JSON.stringify(g.description ?? "")}`,
      );
    }
    lines.push("");
  }
  if (parsed.notes.length) {
    lines.push("NOTES:");
    for (const n of parsed.notes) {
      lines.push(
        `  - id=${n.id} | title=${JSON.stringify(n.title)} | excerpt=${JSON.stringify(n.content ?? "")}`,
      );
    }
    lines.push("");
  }
  if (parsed.tasks.length) {
    lines.push("TASKS (context — use to infer related PROJECT ids only):");
    for (const t of parsed.tasks) {
      lines.push(
        `  - id=${t.id} | title=${JSON.stringify(t.title)} | project_id=${t.project_id ?? "null"} | description=${JSON.stringify(t.description ?? "")}`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * Coerce a raw Gemini JSON object before Zod — drops bad links, fixes URLs.
 */
export function coerceRoleModelAutofillJson(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };

  if (Array.isArray(o.links)) {
    o.links = o.links
      .filter((link) => link && typeof link === "object")
      .map((link) => {
        const L = link as Record<string, unknown>;
        const label = typeof L.label === "string" ? L.label.trim() : "";
        const url = normalizeHttpUrl(
          typeof L.url === "string" ? L.url : undefined,
        );
        if (!label || !url) return null;
        const kind =
          typeof L.kind === "string" &&
          (LINK_KIND_ENUM_VALUES as readonly string[]).includes(L.kind)
            ? L.kind
            : null;
        return { label, url, kind };
      })
      .filter(Boolean);
  }

  if (typeof o.photo_url === "string") {
    o.photo_url = normalizeHttpUrl(o.photo_url);
  }

  if (Array.isArray(o.quotes)) {
    o.quotes = o.quotes.filter(
      (q) =>
        q &&
        typeof q === "object" &&
        typeof (q as { text?: unknown }).text === "string" &&
        String((q as { text: string }).text).trim().length > 0,
    );
  }
  if (Array.isArray(o.key_lessons)) {
    o.key_lessons = o.key_lessons.filter(
      (l) =>
        l &&
        typeof l === "object" &&
        typeof (l as { title?: unknown }).title === "string" &&
        String((l as { title: string }).title).trim().length > 0,
    );
  }

  for (const key of ["quotes", "key_lessons", "tags"] as const) {
    if (!Array.isArray(o[key])) o[key] = [];
  }
  for (const key of ["linked_project_ids", "linked_goal_ids", "linked_note_ids"] as const) {
    if (!Array.isArray(o[key])) o[key] = [];
  }

  return o;
}

// ============================================================
// Gemini responseSchema (OpenAPI-3 subset, NOT JSON Schema).
// ============================================================
//
// `fetchGeminiStructured` enforces this server-side. We still re-validate
// with the Zod schema below before trusting the payload, because Gemini
// occasionally returns extra fields or misses required ones despite the
// schema constraint.

export const RoleModelAutoFillGeminiSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    bio: { type: "string", nullable: true },
    category: { type: "string", nullable: true },
    admiration_blurb: { type: "string", nullable: true },
    photo_url: { type: "string", nullable: true },
    quotes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          source: { type: "string", nullable: true },
        },
        required: ["text"],
      },
    },
    key_lessons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string", nullable: true },
        },
        required: ["title"],
      },
    },
    tags: { type: "array", items: { type: "string" } },
    links: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          url: { type: "string" },
          kind: {
            type: "string",
            enum: LINK_KIND_ENUM_VALUES,
            nullable: true,
          },
        },
        required: ["label", "url"],
      },
    },
    linked_project_ids: { type: "array", items: { type: "string" } },
    linked_goal_ids: { type: "array", items: { type: "string" } },
    linked_note_ids: { type: "array", items: { type: "string" } },
  },
  required: ["name", "quotes", "key_lessons", "tags", "links"],
} as const;

// ============================================================
// Zod validation (post-Gemini)
// ============================================================

const RoleModelQuoteZ = z.object({
  text: z.string().min(1).max(800),
  source: z.string().max(200).nullable().optional(),
});

const RoleModelKeyLessonZ = z.object({
  title: z.string().min(1).max(200),
  detail: z.string().max(800).nullable().optional(),
});

const flexibleHttpUrl = z
  .string()
  .max(900)
  .transform((s) => normalizeHttpUrl(s))
  .refine((url): url is string => url !== null, "invalid url");

const RoleModelLinkZ = z.object({
  label: z.string().min(1).max(120),
  url: flexibleHttpUrl,
  kind: z.enum(LINK_KIND_ENUM_VALUES).nullable().optional(),
});

export const RoleModelAutoFillResultZ = z.object({
  name: z.string().min(1).max(120),
  bio: z.string().max(2000).nullable().optional(),
  category: z.string().max(60).nullable().optional(),
  admiration_blurb: z.string().max(280).nullable().optional(),
  photo_url: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return null;
      return normalizeHttpUrl(typeof v === "string" ? v : null);
    },
    z.union([z.string().url().max(800), z.null()]).optional(),
  ),
  quotes: z.array(RoleModelQuoteZ).max(8),
  key_lessons: z.array(RoleModelKeyLessonZ).max(8),
  tags: z.array(z.string().min(1).max(40)).max(12),
  links: z.array(RoleModelLinkZ).max(8),
  linked_project_ids: z.array(z.string().min(1).max(64)).max(20).optional(),
  linked_goal_ids: z.array(z.string().min(1).max(64)).max(20).optional(),
  linked_note_ids: z.array(z.string().min(1).max(64)).max(20).optional(),
});

/**
 * Normalize the Zod-validated payload into the wire shape (`null` instead of
 * `undefined` for optional fields, deduplicated tags).
 */
export function normalizeAutoFillResult(
  raw: z.infer<typeof RoleModelAutoFillResultZ>,
): RoleModelAutoFillResult {
  const dedupedTags = Array.from(
    new Set(raw.tags.map((t) => t.trim()).filter(Boolean)),
  );
  return {
    name: raw.name.trim(),
    bio: raw.bio?.trim() || null,
    category: raw.category?.trim() || null,
    admiration_blurb: raw.admiration_blurb?.trim() || null,
    photo_url: raw.photo_url ?? null,
    quotes: raw.quotes.map((q) => ({
      text: q.text.trim(),
      source: q.source?.trim() || null,
    })),
    key_lessons: raw.key_lessons.map((l) => ({
      title: l.title.trim(),
      detail: l.detail?.trim() || null,
    })),
    tags: dedupedTags,
    links: raw.links.map((link) => ({
      label: link.label.trim(),
      url: link.url.trim(),
      kind: link.kind ?? null,
    })),
    linked_project_ids: raw.linked_project_ids ?? [],
    linked_goal_ids: raw.linked_goal_ids ?? [],
    linked_note_ids: raw.linked_note_ids ?? [],
  };
}

// ============================================================
// Prompt builders
// ============================================================

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

/**
 * Step 1 prompt — research the figure on the live web. Output is freeform
 * notes (no JSON enforcement) so the model can use the `google_search` tool.
 */
export function buildResearchPrompt(language: AppLocale): string {
  const writeIn = LOCALE_LABEL[language];
  return [
    "You are a careful biographer compiling a structured profile of a real person",
    "for a personal life-design app. The user will give you a name. Search the",
    "web to gather the following before writing your notes:",
    "",
    "  • A short biography (who they were/are, what they're known for).",
    "  • Their primary domain (philosophy, science, business, art, etc.).",
    "  • 3-5 well-attributed quotes (prefer ones with a documented source).",
    "  • 3-5 enduring lessons or principles people draw from their life or work.",
    "  • A PRIMARY PORTRAIT for the profile circle — this is mandatory to attempt:",
    "      - Prefer a direct Wikimedia Commons / upload.wikimedia.org image URL",
    "        (thumbnail URLs ending in .jpg / .png / .webp are ideal).",
    "      - `https://commons.wikimedia.org/wiki/Special:FilePath/<filename>` is OK.",
    "      - The URL must be publicly reachable over HTTPS.",
    "  • Reference URLs (Wikipedia article, official site, key book/article).",
    "",
    "RULES:",
    "  1. Only include facts you can verify from search results. If you can't",
    "     find a source for a quote, OMIT it rather than guess.",
    "  2. Prefer primary sources. Avoid Pinterest / quote-aggregator sites for",
    "     quotes; prefer original books, speeches, or interviews.",
    "  3. You MUST run at least one web search aimed specifically at finding a",
    "     portrait image (e.g., Wikipedia infobox image / Wikimedia file page).",
    "  4. If the name is ambiguous (e.g., \"John Smith\"), pick the most famous",
    "     historical figure with that name and note your choice.",
    "  5. If you cannot find the person at all, say so explicitly.",
    "",
    "MACHINE-READABLE LINE (required — place on its own line at the END):",
    "  PORTRAIT_IMAGE_URL: <full https URL>   OR   PORTRAIT_IMAGE_URL: NONE",
    "",
    `Write your notes in ${writeIn}. Keep them concise — they will be passed`,
    "to a second pass that extracts a structured JSON object, so plain prose",
    "with clearly delimited sections is fine.",
  ].join("\n");
}

/**
 * Step 2 prompt — extract a structured profile from the research notes.
 * Combined with `responseSchema`, Gemini returns typed JSON.
 */
export function buildExtractionPrompt(
  language: AppLocale,
  parsedContext: ParsedAutofillContext,
): string {
  const writeIn = LOCALE_LABEL[language];
  const suggestedCategories = ROLE_MODEL_SUGGESTED_CATEGORIES.join(", ");
  const userBlock = buildUserWorkContextBlock(parsedContext);

  return [
    "You convert a researcher's notes about a real person into a strict JSON",
    "profile for a personal life-design app. The schema is enforced by the API",
    "— stick to it exactly. Do NOT invent facts that aren't in the notes.",
    "",
    userBlock,
    "",
    "FIELD GUIDELINES:",
    "  • name: canonical preferred name (e.g., \"Marie Curie\", not \"Maria",
    "    Skłodowska-Curie\" unless that's how the notes refer to her).",
    "  • bio: 2-4 sentence biography. Plain text, no markdown.",
    `  • category: pick the single best fit from this set if possible: ${suggestedCategories}.`,
    "    A free-form value is allowed if none fit, but prefer the suggested set.",
    "  • admiration_blurb: a 1-sentence \"why someone might admire them\" hook,",
    "    written in second person (\"You can learn from her ...\"). ≤ 260 chars.",
    "  • photo_url: MUST be a full https URL copied from the notes or the",
    "    PORTRAIT_IMAGE_URL line. Prefer upload.wikimedia.org or Special:FilePath.",
    "    Set null only if the notes explicitly say no portrait was found.",
    "  • quotes: only include quotes with a source attribution in the notes.",
    "    Drop sourceless quotes. Max 5 entries.",
    "  • key_lessons: 3-5 distilled principles. `title` is a punchy 2-6 word",
    "    label. `detail` is one sentence explaining how to apply it.",
    "  • tags: 3-7 lowercase, single-word tags for cross-cutting themes",
    "    (e.g., \"perseverance\", \"systems-thinking\", \"creativity\").",
    "  • links: include Wikipedia first if mentioned, then official site, then",
    "    1-2 books/articles. Max 5. Every `url` must include https://",
    "  • linked_project_ids / linked_goal_ids / linked_note_ids: optional arrays",
    "    of ids copied ONLY from the USER'S CURRENT WORK lists above when the",
    "    role model clearly connects to that work. Otherwise use empty arrays.",
    "",
    `All free-text fields (bio, blurb, lesson titles & details) must be in ${writeIn}.`,
    "Quote `text` should remain in the original language it was uttered in,",
    "but its `source` may be in the user's language.",
    "",
    "If the notes say the person could not be found, return:",
    '  { "name": "<requested>", "bio": null, "category": null, ... } with empty arrays.',
    "Never invent biographical facts.",
  ].join("\n");
}
