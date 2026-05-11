export type KnowledgeCodeLanguage =
  | "html"
  | "json"
  | "css"
  | "python"
  | "php"
  | "java"
  | "javascript"
  | "typescript"
  | "sql"
  | "bash"
  | "text";

/** Extended mode identifier used by the encoded note payload. */
export type KnowledgeContentLanguage = KnowledgeCodeLanguage | "markdown";

export type CodeViewMode = "source" | "preview";

type EncodedCodeContent = {
  v: 1;
  t: "code";
  language: KnowledgeContentLanguage;
  source: string;
  preferredView: CodeViewMode;
};

export type ParsedKnowledgeRawContent =
  | {
      kind: "encoded-code";
      language: KnowledgeContentLanguage;
      source: string;
      preferredView: CodeViewMode;
      supportsPreview: boolean;
    }
  | {
      kind: "plain";
      raw: string;
    };

const CODE_NOTE_PREFIX = "__MYLIFEOS_CODE_NOTE_V1__";

const FENCE_LANGUAGE_MAP: Record<string, KnowledgeCodeLanguage> = {
  html: "html",
  xml: "html",
  json: "json",
  css: "css",
  py: "python",
  python: "python",
  php: "php",
  java: "java",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  sql: "sql",
  sh: "bash",
  shell: "bash",
  bash: "bash",
};

const FENCE_LANGUAGE_EXTENDED_MAP: Record<string, KnowledgeContentLanguage> = {
  ...FENCE_LANGUAGE_MAP,
  md: "markdown",
  markdown: "markdown",
};

export function detectCodeLanguage(text: string): KnowledgeCodeLanguage | null {
  const raw = text.trim();
  if (!raw) return null;

  const fenced = raw.match(/^```([a-zA-Z0-9_-]+)?\n[\s\S]*\n```$/);
  if (fenced?.[1]) {
    const normalized = fenced[1].toLowerCase();
    return FENCE_LANGUAGE_MAP[normalized] ?? "text";
  }

  if (isLikelyHtml(raw)) return "html";
  if (isLikelyJson(raw)) return "json";
  if (isLikelyCss(raw)) return "css";
  if (isLikelyPython(raw)) return "python";
  if (isLikelyPhp(raw)) return "php";
  if (isLikelyJava(raw)) return "java";
  if (isLikelyTypeScript(raw)) return "typescript";
  if (isLikelyJavaScript(raw)) return "javascript";
  if (isLikelySql(raw)) return "sql";
  if (isLikelyBash(raw)) return "bash";

  return null;
}

export function looksLikeSourceCode(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (detectCodeLanguage(raw)) return true;
  if (/^```[\s\S]*```$/.test(raw)) return true;

  const lines = raw.split("\n").slice(0, 40);
  const score = lines.reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed) return acc;
    if (/[{};]/.test(trimmed)) return acc + 1;
    if (/^(import|export|class|function|def|SELECT|INSERT|UPDATE|DELETE)\b/i.test(trimmed)) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return score >= 3;
}

export function supportsPreview(language: KnowledgeContentLanguage): boolean {
  return language === "html" || language === "markdown";
}

/**
 * Heuristic detection for pasted Markdown. We look for *multiple* markdown
 * signals to avoid misclassifying plain prose that happens to contain a `**`
 * or `[link]` accidentally.
 */
export function looksLikeMarkdown(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // HTML markup should win — classify that as html instead of markdown.
  if (/<html[\s>]|<!doctype html>/i.test(trimmed)) return false;

  let score = 0;
  if (/^\s{0,3}#{1,6}\s+\S/m.test(trimmed)) score += 2; // ATX headings
  if (/^\s{0,3}[-*+]\s+\S/m.test(trimmed)) score += 1; // bullets
  if (/^\s{0,3}\d+\.\s+\S/m.test(trimmed)) score += 1; // numbered list
  if (/```[\s\S]*?```/.test(trimmed)) score += 2; // fenced code
  if (/\[[^\]]+\]\([^)]+\)/.test(trimmed)) score += 1; // links
  if (/!\[[^\]]*\]\([^)]+\)/.test(trimmed)) score += 1; // images
  if (/^\s{0,3}>\s+\S/m.test(trimmed)) score += 1; // blockquote
  if (/(^|\s)\*\*[^*\s][^*]*\*\*(\s|$)/m.test(trimmed)) score += 1; // bold
  if (/^\s{0,3}[-*_]{3,}\s*$/m.test(trimmed)) score += 1; // hr
  if (/^\|.+\|$/m.test(trimmed) && /\|[-:| ]+\|/.test(trimmed)) score += 2; // table

  return score >= 2;
}

export function encodeCodeContent(payload: {
  source: string;
  language: KnowledgeContentLanguage;
  preferredView: CodeViewMode;
}): string {
  const encoded: EncodedCodeContent = {
    v: 1,
    t: "code",
    language: payload.language,
    source: payload.source,
    preferredView: payload.preferredView,
  };
  return `${CODE_NOTE_PREFIX}${JSON.stringify(encoded)}`;
}

export function parseKnowledgeRawContent(raw: string | null | undefined): ParsedKnowledgeRawContent {
  const value = raw?.trim() ?? "";
  if (!value) return { kind: "plain", raw: "" };

  if (value.startsWith(CODE_NOTE_PREFIX)) {
    const json = value.slice(CODE_NOTE_PREFIX.length);
    try {
      const parsed = JSON.parse(json) as Partial<EncodedCodeContent>;
      if (
        parsed.v !== 1 ||
        parsed.t !== "code" ||
        typeof parsed.source !== "string" ||
        typeof parsed.language !== "string"
      ) {
        return { kind: "plain", raw: value };
      }
      const language = normalizeLanguage(parsed.language);
      const preferredView: CodeViewMode = parsed.preferredView === "preview" ? "preview" : "source";
      return {
        kind: "encoded-code",
        language,
        source: parsed.source,
        preferredView,
        supportsPreview: supportsPreview(language),
      };
    } catch {
      return { kind: "plain", raw: value };
    }
  }

  if (looksLikeRenderableHtml(value)) {
    return {
      kind: "encoded-code",
      language: "html",
      source: value,
      preferredView: "preview",
      supportsPreview: true,
    };
  }

  return { kind: "plain", raw: value };
}

function looksLikeRenderableHtml(raw: string): boolean {
  if (/<!doctype html>/i.test(raw) || /<html[\s>]/i.test(raw)) return true;
  const hasStructural = /<(head|body|style|script)[\s>]/i.test(raw);
  const hasContent = /<(table|div|section|article|header|footer|nav|main|form)[\s>]/i.test(raw);
  return hasStructural && hasContent;
}

function normalizeLanguage(value: string): KnowledgeContentLanguage {
  const normalized = value.toLowerCase();
  if (normalized in FENCE_LANGUAGE_EXTENDED_MAP) {
    return FENCE_LANGUAGE_EXTENDED_MAP[normalized];
  }
  if (
    normalized === "html" ||
    normalized === "json" ||
    normalized === "css" ||
    normalized === "python" ||
    normalized === "php" ||
    normalized === "java" ||
    normalized === "javascript" ||
    normalized === "typescript" ||
    normalized === "sql" ||
    normalized === "bash" ||
    normalized === "markdown" ||
    normalized === "text"
  ) {
    return normalized;
  }
  return "text";
}

function isLikelyHtml(raw: string): boolean {
  return /<!doctype html>/i.test(raw) || /<html[\s>]/i.test(raw) || /<(head|body|table|div|section|article|style|script)[\s>]/i.test(raw);
}

function isLikelyJson(raw: string): boolean {
  if (!/^[\[{]/.test(raw) || !/[\]}]$/.test(raw)) return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

function isLikelyCss(raw: string): boolean {
  return /[.#][\w-]+\s*\{[\s\S]*:[\s\S]*\}/.test(raw) || /@media\s*\(/.test(raw);
}

function isLikelyPython(raw: string): boolean {
  return /^\s*(def|class|import|from)\s+/m.test(raw) || /\bprint\(/.test(raw);
}

function isLikelyPhp(raw: string): boolean {
  return /<\?php/.test(raw) || /\becho\s+["']/.test(raw);
}

function isLikelyJava(raw: string): boolean {
  return /\bpublic\s+(class|interface|enum)\b/.test(raw) || /\bSystem\.out\.println\(/.test(raw);
}

function isLikelyJavaScript(raw: string): boolean {
  return /\b(function|const|let|var)\b/.test(raw) || /=>\s*\{/.test(raw);
}

function isLikelyTypeScript(raw: string): boolean {
  return /\b(interface|type)\s+\w+/.test(raw) || /:\s*(string|number|boolean|unknown|any)\b/.test(raw);
}

function isLikelySql(raw: string): boolean {
  return /^\s*(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\b/im.test(raw);
}

function isLikelyBash(raw: string): boolean {
  return /^#!\/bin\/(ba)?sh/.test(raw) || /^\s*(npm|pnpm|yarn|cd|ls|mkdir|rm)\b/m.test(raw);
}
