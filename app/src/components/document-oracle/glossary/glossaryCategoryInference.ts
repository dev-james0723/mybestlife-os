import type { DocOracleGlossaryRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import { normalizeGlossaryRelatedTerms } from "@/components/document-oracle/glossary/glossaryNormalize";

export type GlossaryDocumentContext = {
  /** BCP-47 or loose language tag from analysis */
  language: string | null;
  documentType: string | null;
};

const BAD_CATEGORY_RE =
  /\b(auto[-\s]?extracted|ai[-\s]?extracted|extracted|generated|unknown|pipeline|mineru|normalizer)\b/i;

export function isBadUserFacingCategory(category: string | null | undefined): boolean {
  if (category == null || !String(category).trim()) return true;
  const c = String(category).trim();
  if (BAD_CATEGORY_RE.test(c)) return true;
  const lower = c.toLowerCase();
  if (lower === "n/a" || lower === "none" || lower === "uncategorized") return true;
  return false;
}

const GENERIC_DEF_RE =
  /\b(auto[-\s]?extracted|definition can be refined|refined later|extracted (section )?heading|extracted emphasized|recurring term in this document|generated term|no definition|placeholder definition)\b/i;

export function isGenericGlossaryDefinition(definition: string | null | undefined): boolean {
  if (definition == null || !String(definition).trim()) return true;
  return GENERIC_DEF_RE.test(String(definition));
}

/** English canonical labels used for ordering and (when UI is English) display. */
export const GLOSSARY_CATEGORY_ORDER_EN: string[] = [
  "Document Topic",
  "Requirements",
  "Important Notice",
  "Instructions",
  "Submission",
  "Application / Applicant",
  "Form Field",
  "Address / Proof",
  "Fees / Amounts",
  "Dates / Deadlines",
  "People / Organizations",
  "Legal / Policy",
  "Technical Term",
  "Process / Step",
  "Visual / Diagram",
  "Musical Term",
  "General Concept",
];

const EN_TO_ZH: Record<string, string> = {
  "Document Topic": "文件主題",
  Requirements: "條款要求",
  "Important Notice": "重要通知",
  Instructions: "說明與須知",
  Submission: "遞交方式",
  "Application / Applicant": "申請資料",
  "Form Field": "表格欄位",
  "Address / Proof": "地址證明",
  "Fees / Amounts": "費用與金額",
  "Dates / Deadlines": "日期與截止",
  "People / Organizations": "相關機構與人士",
  "Legal / Policy": "法律與政策用語",
  "Technical Term": "技術詞彙",
  "Process / Step": "流程與步驟",
  "Visual / Diagram": "圖表與視覺",
  "Musical Term": "音樂用語",
  "General Concept": "其他概念",
};

/** True when glossary category chips should use Traditional Chinese labels (document language is Chinese). */
export function isTraditionalChineseGlossaryContext(ctx: GlossaryDocumentContext): boolean {
  const lang = (ctx.language || "").toLowerCase();
  if (lang.startsWith("zh")) return true;
  return false;
}

export function displayGlossaryCategoryLabel(canonicalEn: string, ctx: GlossaryDocumentContext): string {
  if (isTraditionalChineseGlossaryContext(ctx)) {
    return EN_TO_ZH[canonicalEn] ?? canonicalEn;
  }
  return canonicalEn;
}

function haystackForRules(term: DocOracleGlossaryRow): string {
  const parts = [
    term.term,
    term.definition || "",
    ...normalizeGlossaryRelatedTerms(term.related_terms),
  ];
  return parts.join("\n").toLowerCase();
}

/**
 * Deterministic category inference from term text, definition, and related terms.
 * Returns English canonical category; map to Chinese in the UI when appropriate.
 */
export function inferGlossaryCategoryCanonical(term: DocOracleGlossaryRow): string {
  const h = haystackForRules(term);
  const t = term.term.trim().toLowerCase();

  const has = (patterns: RegExp[]) => patterns.some((re) => re.test(h) || re.test(t));

  if (has([/地址|住址|proof of address|address proof|correspondence address|通訊地址/]))
    return "Address / Proof";
  if (has([/申請人|applicant|application form|申請表|particulars|個人資料|填報/]))
    return "Application / Applicant";
  if (has([/郵寄|遞交|提交|submission|post to|in person|親身|上載|upload|寄回/]))
    return "Submission";
  if (has([/必須|required|requirement|shall|應|須|不得|mandatory|義務/]))
    return "Requirements";
  if (has([/注意|notice|notes for attention|重要通知|敬請留意|警告/]))
    return "Important Notice";
  if (has([/fee|fees|payment|amount|hkd|\$|港幣|費用|繳費|金額/]))
    return "Fees / Amounts";
  if (has([/deadline|due date|日期|截止|before\s+\d|no later than|限期/]))
    return "Dates / Deadlines";
  if (has([/bureau|department|office|authority|機構|部門|署|局|處|委員會|company limited|ltd\.?/]))
    return "People / Organizations";
  if (has([/clause|條款|pursuant|legal|policy|gdpr|privacy|免責|責任/]))
    return "Legal / Policy";
  if (has([/step\s*\d|流程|程序|follow these|first,|then,|最後/]))
    return "Process / Step";
  if (has([/figure|diagram|chart|圖|表|插圖|見圖/]))
    return "Visual / Diagram";
  if (has([/tempo|cadence|allegro|音階|和弦|樂譜/]))
    return "Musical Term";
  if (has([/api|http|json|database|algorithm|server|函數|編碼/]))
    return "Technical Term";

  const trimmed = term.term.trim();
  if ((/[:：]$/.test(trimmed) || /^(name|date|signature|amount|total)\b/i.test(trimmed)) && trimmed.length <= 64) {
    return "Form Field";
  }
  if (has([/姓名|名稱|電話|簽名|性別|出生日期|身分證/]) && trimmed.length <= 40) return "Form Field";

  if (has([/scope of this|本(文件|指引)|概述|簡介|background|目的\b/])) return "Document Topic";

  return "General Concept";
}

export function normalizeGlossaryCategory(term: DocOracleGlossaryRow, ctx: GlossaryDocumentContext): string {
  const raw = term.category?.trim();
  if (raw && !isBadUserFacingCategory(raw)) {
    return raw;
  }
  return inferGlossaryCategoryCanonical(term);
}

export function categorySortIndex(canonicalOrCustom: string): number {
  const idx = GLOSSARY_CATEGORY_ORDER_EN.indexOf(canonicalOrCustom);
  if (idx >= 0) return idx;
  return 100;
}

export function compareGlossaryTermsLocale(a: DocOracleGlossaryRow, b: DocOracleGlossaryRow, locale: string): number {
  const collator = locale.startsWith("zh")
    ? new Intl.Collator("zh-Hant", { sensitivity: "base" })
    : new Intl.Collator("en", { sensitivity: "base" });
  return collator.compare(a.term.trim(), b.term.trim());
}
