import type { DocOraclePageRow } from "@/components/document-oracle/docOraclePageTypes";

const TITLE_MAX = 80;
const CARD_DESC_MAX = 220;
const MODAL_DESC_MAX = 8000;

export type PageTypeBadgeId =
  | "cover"
  | "toc"
  | "content"
  | "table"
  | "visual"
  | "blank"
  | "appendix"
  | "unknown";

const TOC_HINTS =
  /\b(table\s+of\s+contents|contents)\b|目錄|目录|目次|contents\s*$/i;

function collapseWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripMdImages(s: string): string {
  return s.replace(/!\[[^\]]*]\([^)]+\)/g, " ");
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

function clip(s: string, max: number): string {
  const t = collapseWs(s);
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function meaningfulLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const t = label.trim();
  if (/^\d+$/.test(t)) return null;
  if (t.length < 2) return null;
  return t;
}

function firstMdHeading(md: string | null | undefined): string | null {
  if (!md?.trim()) return null;
  const m = md.match(/(?:^|\n)#{1,6}\s+([^\n]+)/);
  if (!m?.[1]) return null;
  const line = collapseWs(stripMdImages(stripHtmlTags(m[1].replace(/[#*_`]+/g, ""))));
  return line.length ? line : null;
}

function firstBoldPhrase(md: string | null | undefined): string | null {
  if (!md?.trim()) return null;
  const m = md.match(/\*\*([^*]+)\*\*/);
  if (!m?.[1]) return null;
  const t = collapseWs(stripHtmlTags(m[1]));
  return t.length >= 2 ? t : null;
}

function firstMeaningfulLine(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const lines = raw.split(/\r?\n/).map((l) => collapseWs(stripHtmlTags(stripMdImages(l))));
  for (const line of lines) {
    if (line.length >= 4 && !/^page\s*\d+/i.test(line)) return line;
  }
  return null;
}

export function getPageTitle(page: DocOraclePageRow): string {
  const fromLabel = meaningfulLabel(page.page_label);
  if (fromLabel) return clip(fromLabel, TITLE_MAX);
  const fromH = firstMdHeading(page.markdown);
  if (fromH) return clip(fromH, TITLE_MAX);
  const fromBold = firstBoldPhrase(page.markdown);
  if (fromBold) return clip(fromBold, TITLE_MAX);
  const fromRaw = firstMeaningfulLine(page.raw_text);
  if (fromRaw) return clip(fromRaw, TITLE_MAX);
  return `Page ${page.page_number}`;
}

export function cleanDescriptionSource(s: string): string {
  let t = stripMdImages(s);
  t = stripHtmlTags(t);
  t = collapseWs(t);
  return t;
}

export function getPageDescription(page: DocOraclePageRow, opts?: { maxLen?: number }): string {
  const maxLen = opts?.maxLen ?? CARD_DESC_MAX;
  const im = page.interpreted_page_meaning?.trim();
  if (im) return clip(cleanDescriptionSource(im), maxLen);
  const sm = page.page_summary?.trim();
  if (sm) return clip(cleanDescriptionSource(sm), maxLen);
  const raw = page.raw_text?.trim();
  if (raw) return clip(cleanDescriptionSource(raw), maxLen);
  const md = page.markdown?.trim();
  if (md) return clip(cleanDescriptionSource(md), maxLen);
  return "No page summary available yet.";
}

export function getPageDetailDescription(page: DocOraclePageRow): string {
  const im = page.interpreted_page_meaning?.trim();
  if (im) return clip(cleanDescriptionSource(im), MODAL_DESC_MAX);
  const sm = page.page_summary?.trim();
  if (sm) return clip(cleanDescriptionSource(sm), MODAL_DESC_MAX);
  const raw = page.raw_text?.trim();
  if (raw) return clip(cleanDescriptionSource(raw), MODAL_DESC_MAX);
  const md = page.markdown?.trim();
  if (md) return clip(cleanDescriptionSource(md), MODAL_DESC_MAX);
  return "No page summary available yet.";
}

export function pageKeywordsList(page: DocOraclePageRow): string[] {
  const k = page.keywords;
  return Array.isArray(k) ? k.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}

export function inferPageTypeBadge(page: DocOraclePageRow): PageTypeBadgeId {
  const rawType = (page.page_type || "").trim().toLowerCase();
  const allowed: PageTypeBadgeId[] = [
    "cover",
    "toc",
    "content",
    "table",
    "visual",
    "blank",
    "appendix",
    "unknown",
  ];
  if (rawType && (allowed as string[]).includes(rawType)) return rawType as PageTypeBadgeId;

  const raw = (page.raw_text || "").trim();
  const md = (page.markdown || "").trim();
  const combined = `${raw}\n${md}`;

  if (combined.length < 40 && !page.has_visual_assets) return "blank";
  if (TOC_HINTS.test(combined.slice(0, 1200))) return "toc";
  if (page.page_number === 1) return "cover";
  if (page.has_visual_assets) return "visual";
  if (/\|[-—]+\|/.test(md) || /\t[^\n]+\t/.test(raw)) return "table";
  if (/\bappendix\b/i.test(combined.slice(0, 400))) return "appendix";
  if (raw.length > 0) return "content";
  return "unknown";
}

export function displayPageTypeLabel(id: PageTypeBadgeId): string {
  switch (id) {
    case "toc":
      return "contents";
    default:
      return id;
  }
}

export function buildFallbackTags(_page: DocOraclePageRow, badge: PageTypeBadgeId): string[] {
  const out: string[] = [];
  if (badge === "cover") out.push("cover");
  else if (badge === "toc") out.push("toc");
  else if (badge === "blank") out.push("blank");
  else if (badge === "table") out.push("table");
  else if (badge === "visual") out.push("visual");
  else out.push("text");
  return out;
}

export function getPageTagsForCard(page: DocOraclePageRow, badge: PageTypeBadgeId): { tags: string[]; overflow: number } {
  const kw = pageKeywordsList(page).map((t) => (t.startsWith("#") ? t : `#${t.replace(/^#+/, "")}`));
  const maxShow = 5;
  if (kw.length === 0) {
    const fb = buildFallbackTags(page, badge);
    return { tags: fb.slice(0, maxShow), overflow: 0 };
  }
  const shown = kw.slice(0, maxShow);
  const overflow = Math.max(0, kw.length - shown.length);
  return { tags: shown, overflow };
}

export function pageSearchBlob(page: DocOraclePageRow, title: string): string {
  const kw = pageKeywordsList(page).join(" ");
  return [
    title,
    page.page_summary,
    page.interpreted_page_meaning,
    page.raw_text,
    kw,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function isVisualHeavyPage(page: DocOraclePageRow): boolean {
  if (!page.has_visual_assets) return false;
  const md = page.markdown || "";
  const imgCount = (md.match(/!\[[^\]]*]\([^)]+\)/g) || []).length;
  return imgCount >= 2 || (page.raw_text?.length ?? 0) >= 400;
}

export function suggestedQuestionsList(page: DocOraclePageRow): string[] {
  const s = page.suggested_questions;
  if (!Array.isArray(s)) return [];
  return s.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 12);
}

const PAGE_DETAIL_FALLBACK_QUESTIONS: string[] = [
  "What is the main topic of this page?",
  "What are the key details on this page?",
  "Are there any important dates, names, fees, or actions on this page?",
  "What visuals appear on this page?",
];

/** Suggested questions for page detail: DB list first, else deterministic fallbacks. */
export function pageDetailSuggestedQuestions(page: DocOraclePageRow): string[] {
  const fromDb = suggestedQuestionsList(page);
  if (fromDb.length > 0) return fromDb;
  return [...PAGE_DETAIL_FALLBACK_QUESTIONS];
}

export function linkedTermsList(page: DocOraclePageRow): string[] {
  const raw = page.linked_terms;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 24);
}

export function copySummaryText(page: DocOraclePageRow, title: string): string {
  const parts: string[] = [`${title} (p.${page.page_number})`, "", getPageDetailDescription(page)];
  const qs = pageDetailSuggestedQuestions(page);
  if (qs.length) {
    parts.push("", "Suggested questions:", ...qs.map((q) => `• ${q}`));
  }
  return parts.join("\n");
}
