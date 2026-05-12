import type { DocOracleAnalysis, DocOracleGlossaryRow, DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";
import type { DocOraclePageRow, DocOracleVisualRow } from "@/components/document-oracle/docOraclePageTypes";

export type SuggestedQuestionTone = "lime" | "amber" | "blue" | "violet" | "teal" | "rose" | "neutral";

export type SuggestedQuestion = {
  id: string;
  question: string;
  rationale?: string;
  sourcePages?: number[];
  sourceSections?: string[];
};

export type SuggestedQuestionCategory = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  tone: SuggestedQuestionTone;
  questions: SuggestedQuestion[];
};

const TONE_CYCLE: SuggestedQuestionTone[] = ["lime", "amber", "blue", "violet", "teal", "rose"];

const MAX_CATEGORIES = 7;
const MAX_QUESTIONS_PER_CATEGORY = 4;
const MAX_QUESTION_LEN = 160;

function slugId(s: string): string {
  const slug = s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "cat";
}

/** Deterministic tone from category id — stable across renders. */
export function toneForCategoryId(categoryId: string): SuggestedQuestionTone {
  let h = 2166136261;
  for (let i = 0; i < categoryId.length; i++) {
    h ^= categoryId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % TONE_CYCLE.length;
  return TONE_CYCLE[idx] ?? "lime";
}

function normalizeQuestionKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniqueQuestions(questions: SuggestedQuestion[]): SuggestedQuestion[] {
  const seen = new Set<string>();
  const out: SuggestedQuestion[] = [];
  for (const q of questions) {
    const k = normalizeQuestionKey(q.question);
    if (!k || k.length > MAX_QUESTION_LEN) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= MAX_QUESTIONS_PER_CATEGORY) break;
  }
  return out;
}

function parsePagesField(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const x of v) {
    if (typeof x === "number" && Number.isFinite(x) && x > 0) out.push(Math.floor(x));
    else if (typeof x === "string" && /^\d+$/.test(x)) out.push(Math.floor(Number(x)));
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function isTraditionalChineseDoc(lang: string | null, sampleText: string): boolean {
  if (lang) {
    const l = lang.toLowerCase();
    if (l.includes("zh-tw") || l.includes("zh_hant") || l.includes("hant") || l.includes("traditional")) return true;
    if (l === "zh-tw" || l === "zh_tw") return true;
  }
  if (!sampleText.trim()) return false;
  const t = sampleText.slice(0, 4000);
  const tcChars = /[\u3400-\u4dbf\u4e00-\u9fff\u3000-\u303f]/g;
  const m = t.match(tcChars);
  if (!m || m.length < 12) return false;
  const tcSpecific = /[這邊個們說時會與國學進開關來還麼麼麼]/;
  return tcSpecific.test(t);
}

const INSTRUCTION_HINTS_EN =
  /\b(instruction|must|required|submit|application|applicant|deadline|notice|please\s+note|important)\b/i;
const INSTRUCTION_HINTS_ZH =
  /(指示|必須|要求|提交|申請|注意|重要通知|更改地址|申請人|文件|繳交|填寫|簽署|聲明|聲明書)/;

const DATE_FEE_HINTS =
  /\$|€|£|USD|CNY|TWD|HKD|fee|fees|payment|deadline|due\s+date|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|20\d{2}年|\d{1,2}月\d{1,2}日|日期|截止|費用|繳費|期限|action\s+item|reminder/i;

const NOTICE_HINTS = /(重要通知|警告|免責|法律聲明|必读|請注意|特別提醒|disclaimer|warning|legal\s+notice)/i;

function pageTextSample(pages: DocOraclePageRow[], maxChars: number): string {
  let acc = "";
  for (const p of pages.slice(0, 12)) {
    const t = (p.markdown || p.raw_text || "").trim();
    if (!t) continue;
    acc += `\n\n${t}`;
    if (acc.length >= maxChars) return acc.slice(0, maxChars);
  }
  return acc;
}

function glossaryTermScore(g: DocOracleGlossaryRow): number {
  const term = (g.term || "").trim();
  const def = (g.definition || "").trim();
  if (term.length < 2) return -1;
  return term.length * 2 + Math.min(def.length, 400);
}

function pickTopGlossaryTerms(rows: DocOracleGlossaryRow[], limit: number): DocOracleGlossaryRow[] {
  const ranked = [...rows].sort((a, b) => glossaryTermScore(b) - glossaryTermScore(a));
  const out: DocOracleGlossaryRow[] = [];
  for (const g of ranked) {
    if (glossaryTermScore(g) < 0) continue;
    out.push(g);
    if (out.length >= limit) break;
  }
  return out;
}

function pickTopSections(rows: DocOracleSectionRow[], limit: number): DocOracleSectionRow[] {
  const sorted = [...rows].sort((a, b) => {
    const la = a.level ?? 99;
    const lb = b.level ?? 99;
    if (la !== lb) return la - lb;
    const pa = a.page_start ?? 9999;
    const pb = b.page_start ?? 9999;
    return pa - pb;
  });
  return sorted.slice(0, limit);
}

function pagesMentioningDatesFees(pages: DocOraclePageRow[]): number[] {
  const out: number[] = [];
  for (const p of pages) {
    const t = (p.markdown || p.raw_text || "").slice(0, 6000);
    if (DATE_FEE_HINTS.test(t)) out.push(p.page_number);
  }
  return Array.from(new Set(out)).sort((a, b) => a - b).slice(0, 8);
}

function makeId(prefix: string, i: number): string {
  return `${prefix}-${i}`;
}

export type BuildCategorizedSuggestedQuestionsInput = {
  analysis: DocOracleAnalysis | null;
  sections: DocOracleSectionRow[];
  pages: DocOraclePageRow[];
  glossary: DocOracleGlossaryRow[];
  visuals: DocOracleVisualRow[];
  fallbackPrompts: string[];
};

/** Extra string prompts merged into the "More prompts" category when non-duplicate. */
export function buildLegacyFallbackPrompts(sections: DocOracleSectionRow[], glossary: DocOracleGlossaryRow[]): string[] {
  const out: string[] = [];
  for (const s of sections.slice(0, 5)) {
    out.push(`Explain the section “${s.title}”.`);
  }
  for (const g of glossary.slice(0, 4)) {
    out.push(`What does “${g.term}” mean in this document?`);
  }
  return out.slice(0, 12);
}

/**
 * Builds document-aware suggested question categories from structured extraction rows.
 * Deterministic, no network — safe as the only source for the Overview module.
 */
export function buildCategorizedSuggestedQuestions(input: BuildCategorizedSuggestedQuestionsInput): SuggestedQuestionCategory[] {
  const { analysis, sections, pages, glossary, visuals, fallbackPrompts } = input;
  const sample = pageTextSample(pages, 8000) + (analysis?.summary || "").slice(0, 2000);
  const zh = isTraditionalChineseDoc(analysis?.language ?? null, sample);

  const L = {
    overviewLabel: zh ? "文件總覽" : "Document overview",
    overviewDesc: zh ? "掌握文件主旨與閱讀重點。" : "Understand what this document is and what matters first.",
    overviewQ1: zh ? "這份文件主要在講什麼？" : "What is this document mainly about?",
    overviewQ2: zh ? "請摘要這份文件的關鍵重點。" : "Summarize the key points of this document.",
    overviewQ3: zh ? "我應該先注意哪些事項？" : "What should I pay attention to first?",

    sectionsLabel: zh ? "章節與結構" : "Sections & structure",
    sectionsDesc: zh ? "依目錄深入特定段落。" : "Go deeper on specific parts of the outline.",
    explainSection: (title: string) =>
      zh ? `請解釋「${title}」這個章節的重點與脈絡。` : `Explain the section “${title}”.`,
    keyPointsSection: (title: string) =>
      zh ? `「${title}」章節有哪些關鍵要點與要求？` : `What are the key points in “${title}”?`,

    defsLabel: zh ? "詞彙與定義" : "Definitions & terms",
    defsDesc: zh ? "釐清文件中的專有名詞。" : "Clarify specialized terms used in the document.",
    whatMeans: (term: string) => (zh ? `「${term}」在這份文件中的意義是什麼？` : `What does “${term}” mean in this document?`),
    explainTermPages: (term: string) =>
      zh ? `請解釋「${term}」，並盡量附上頁碼依據。` : `Explain the term “${term}” with page references where possible.`,

    datesLabel: zh ? "日期、費用與期限" : "Dates, fees & deadlines",
    datesDesc: zh ? "找出期限、金額與待辦。" : "Surface deadlines, amounts, and action items.",
    datesQ1: zh ? "文件中有哪些重要日期、費用或待辦事項？" : "What are the important dates, fees, or action items?",
    datesQ2: zh ? "是否有任何截止日或必須完成的動作？" : "Are there any deadlines or required actions?",

    instrLabel: zh ? "申請與指示" : "Instructions & requirements",
    instrDesc: zh ? "依文件說明完成申請或流程。" : "Follow what the document tells you to do.",
    instrQ1: zh ? "這份文件有哪些關鍵指示或步驟？" : "What are the key instructions in this document?",
    instrQ2: zh ? "申請人或使用者需要完成哪些事項？" : "What does the applicant or user need to do?",
    instrQ3: zh ? "是否需要準備特定文件或附件？" : "Are there any required documents or attachments?",

    visualsLabel: zh ? "視覺內容" : "Visuals",
    visualsDesc: zh ? "圖表、圖片與版面資訊。" : "Figures, images, and layout cues.",
    visualsQ1: zh ? "文件中的圖表或圖片主要在傳達什麼？" : "What do the visuals in this document show?",
    visualsQ2: zh ? "哪些視覺資訊最重要，為什麼？" : "Which visual assets are most important and why?",
    visualsQ3: zh ? "哪些頁面有值得留意的圖像或圖表？" : "Which pages contain useful visuals or diagrams?",

    noticesLabel: zh ? "重要通知" : "Important notices",
    noticesDesc: zh ? "風險、限制與注意事項。" : "Risks, limits, and things to watch for.",
    noticesQ1: zh ? "文件中有哪些重要通知或限制？" : "What important notices or limitations appear in this document?",

    actionsLabel: zh ? "下一步" : "Actions & next steps",
    actionsDesc: zh ? "把內容轉成可執行的清單。" : "Turn the document into a practical checklist.",
    actionsQ1: zh ? "依這份文件，我接下來應該做什麼？" : "Based on this document, what should I do next?",

    moreLabel: zh ? "延伸提問" : "More prompts",
    moreDesc: zh ? "其他實用切入點。" : "Additional useful angles.",
  };

  const hasEnoughData = Boolean(
    (analysis && analysis.status === "completed") || pages.length > 0 || sections.length > 0,
  );

  const categories: SuggestedQuestionCategory[] = [];

  if (hasEnoughData) {
    const overviewQs: SuggestedQuestion[] = uniqueQuestions([
      { id: makeId("ov", 0), question: L.overviewQ1 },
      { id: makeId("ov", 1), question: L.overviewQ2 },
      { id: makeId("ov", 2), question: L.overviewQ3 },
    ]);
    categories.push({
      id: "document-overview",
      label: L.overviewLabel,
      description: L.overviewDesc,
      icon: "sparkles",
      tone: toneForCategoryId("document-overview"),
      questions: overviewQs,
    });
  }

  const combinedPageText = pageTextSample(pages, 12_000);
  if (combinedPageText && (INSTRUCTION_HINTS_EN.test(combinedPageText) || INSTRUCTION_HINTS_ZH.test(combinedPageText))) {
    categories.push({
      id: "instructions",
      label: L.instrLabel,
      description: L.instrDesc,
      icon: "list-check",
      tone: toneForCategoryId("instructions"),
      questions: uniqueQuestions([
        { id: makeId("ins", 0), question: L.instrQ1 },
        { id: makeId("ins", 1), question: L.instrQ2 },
        { id: makeId("ins", 2), question: L.instrQ3 },
      ]),
    });
  }

  const datePages = pagesMentioningDatesFees(pages);
  if (datePages.length > 0 || DATE_FEE_HINTS.test(combinedPageText)) {
    categories.push({
      id: "dates-fees-details",
      label: L.datesLabel,
      description: L.datesDesc,
      icon: "calendar",
      tone: toneForCategoryId("dates-fees-details"),
      questions: uniqueQuestions([
        {
          id: makeId("df", 0),
          question: L.datesQ1,
          sourcePages: datePages.length ? datePages.slice(0, 4) : undefined,
        },
        { id: makeId("df", 1), question: L.datesQ2, sourcePages: datePages.length ? datePages.slice(0, 4) : undefined },
      ]),
    });
  }

  if (sections.length > 0) {
    const top = pickTopSections(sections, 5);
    const secQs: SuggestedQuestion[] = [];
    let i = 0;
    for (const s of top.slice(0, 3)) {
      const title = (s.title || "").trim();
      if (!title || title.length > 120) continue;
      const pagesFor = [s.page_start, s.page_end].filter((x): x is number => typeof x === "number" && x > 0);
      const sp = Array.from(new Set(pagesFor)).sort((a, b) => a - b);
      secQs.push({
        id: makeId("sec", i++),
        question: L.explainSection(title),
        sourcePages: sp.length ? sp : undefined,
        sourceSections: [title],
      });
      if (secQs.length >= MAX_QUESTIONS_PER_CATEGORY) break;
    }
    for (const s of top.slice(0, 3)) {
      if (secQs.length >= MAX_QUESTIONS_PER_CATEGORY) break;
      const title = (s.title || "").trim();
      if (!title || title.length > 120) continue;
      const pagesFor = [s.page_start, s.page_end].filter((x): x is number => typeof x === "number" && x > 0);
      const sp = Array.from(new Set(pagesFor)).sort((a, b) => a - b);
      secQs.push({
        id: makeId("sec", i++),
        question: L.keyPointsSection(title),
        sourcePages: sp.length ? sp : undefined,
        sourceSections: [title],
      });
    }
    const uniq = uniqueQuestions(secQs);
    if (uniq.length > 0) {
      categories.push({
        id: "sections-structure",
        label: L.sectionsLabel,
        description: L.sectionsDesc,
        icon: "layers",
        tone: toneForCategoryId("sections-structure"),
        questions: uniq,
      });
    }
  }

  if (glossary.length > 0) {
    const topTerms = pickTopGlossaryTerms(glossary, 5);
    const defQs: SuggestedQuestion[] = [];
    let i = 0;
    const maxWhatDoes = 2;
    let whatDoes = 0;
    for (const g of topTerms) {
      const term = (g.term || "").trim();
      if (!term || term.length > 80) continue;
      const sp = parsePagesField(g.pages);
      if (whatDoes < maxWhatDoes) {
        defQs.push({
          id: makeId("g", i++),
          question: L.whatMeans(term),
          sourcePages: sp.length ? sp.slice(0, 4) : undefined,
        });
        whatDoes++;
      } else {
        defQs.push({
          id: makeId("g", i++),
          question: L.explainTermPages(term),
          sourcePages: sp.length ? sp.slice(0, 4) : undefined,
        });
      }
      if (defQs.length >= MAX_QUESTIONS_PER_CATEGORY) break;
    }
    const uniq = uniqueQuestions(defQs);
    if (uniq.length > 0) {
      categories.push({
        id: "definitions-terms",
        label: L.defsLabel,
        description: L.defsDesc,
        icon: "book-open",
        tone: toneForCategoryId("definitions-terms"),
        questions: uniq,
      });
    }
  }

  if (visuals.length > 0) {
    const visPages = Array.from(
      new Set(
        visuals
          .map((v) => v.source_page_number)
          .filter((x): x is number => typeof x === "number" && x > 0)
          .map((x) => Math.floor(x)),
      ),
    ).sort((a, b) => a - b);
    categories.push({
      id: "visuals",
      label: L.visualsLabel,
      description: L.visualsDesc,
      icon: "image",
      tone: toneForCategoryId("visuals"),
      questions: uniqueQuestions([
        {
          id: makeId("vis", 0),
          question: L.visualsQ1,
          sourcePages: visPages.length ? visPages.slice(0, 6) : undefined,
        },
        { id: makeId("vis", 1), question: L.visualsQ2 },
        { id: makeId("vis", 2), question: L.visualsQ3, sourcePages: visPages.length ? visPages.slice(0, 6) : undefined },
      ]),
    });
  }

  if (NOTICE_HINTS.test(combinedPageText)) {
    categories.push({
      id: "important-notices",
      label: L.noticesLabel,
      description: L.noticesDesc,
      icon: "alert-circle",
      tone: toneForCategoryId("important-notices"),
      questions: uniqueQuestions([{ id: makeId("nt", 0), question: L.noticesQ1 }]),
    });
  }

  categories.push({
    id: "actions-next",
    label: L.actionsLabel,
    description: L.actionsDesc,
    icon: "arrow-right-circle",
    tone: toneForCategoryId("actions-next"),
    questions: uniqueQuestions([{ id: makeId("act", 0), question: L.actionsQ1 }]),
  });

  const fallbackClean = uniqueQuestions(
    fallbackPrompts
      .map((q, i) => ({ id: makeId("fb", i), question: q.trim() }))
      .filter((q) => q.question.length > 0 && q.question.length <= MAX_QUESTION_LEN),
  );
  if (fallbackClean.length > 0) {
    categories.push({
      id: "legacy-fallback",
      label: L.moreLabel,
      description: L.moreDesc,
      icon: "message-circle",
      tone: "neutral",
      questions: fallbackClean.slice(0, MAX_QUESTIONS_PER_CATEGORY),
    });
  }

  const dedupedCats: SuggestedQuestionCategory[] = [];
  const globalQ = new Set<string>();
  for (const cat of categories) {
    const labelKey = normalizeQuestionKey(cat.label);
    const filtered = cat.questions.filter((q) => {
      const k = normalizeQuestionKey(q.question);
      if (!k || k === labelKey) return false;
      if (globalQ.has(k)) return false;
      globalQ.add(k);
      return true;
    });
    const next = { ...cat, questions: uniqueQuestions(filtered) };
    if (next.questions.length === 0) continue;
    dedupedCats.push(next);
    if (dedupedCats.length >= MAX_CATEGORIES) break;
  }

  const finalCats = dedupedCats.slice(0, MAX_CATEGORIES);
  if (finalCats.length > 0) return finalCats;

  return [
    {
      id: "document-overview",
      label: "Document overview",
      description: "Start with a high-level read.",
      icon: "sparkles",
      tone: toneForCategoryId("document-overview"),
      questions: uniqueQuestions([
        { id: "fallback-0", question: "What is this document mainly about?" },
        { id: "fallback-1", question: "Summarize the key points of this document." },
        { id: "fallback-2", question: "What should I pay attention to first?" },
      ]),
    },
  ];
}

/** Flatten questions for chat starter chips (short list). */
export function flattenSuggestedQuestions(categories: SuggestedQuestionCategory[], max: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of categories) {
    for (const q of c.questions) {
      const k = normalizeQuestionKey(q.question);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(q.question);
      if (out.length >= max) return out;
    }
  }
  return out;
}

/** Parse and validate Gemini (or other) API payload — returns empty if invalid. */
export function parseSuggestedQuestionCategoriesPayload(raw: unknown): SuggestedQuestionCategory[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  const cats = o.categories;
  if (!Array.isArray(cats)) return [];
  const out: SuggestedQuestionCategory[] = [];
  for (const item of cats) {
    if (!item || typeof item !== "object") continue;
    const c = item as Record<string, unknown>;
    const id = typeof c.id === "string" && c.id.trim() ? slugId(c.id) : "";
    const label = typeof c.label === "string" && c.label.trim() ? c.label.trim().slice(0, 120) : "";
    if (!id || !label) continue;
    const toneRaw = typeof c.tone === "string" ? c.tone.toLowerCase() : "";
    const allowed: SuggestedQuestionTone[] = ["lime", "amber", "blue", "violet", "teal", "rose", "neutral"];
    const tone = (allowed.includes(toneRaw as SuggestedQuestionTone) ? toneRaw : toneForCategoryId(id)) as SuggestedQuestionTone;
    const description = typeof c.description === "string" ? c.description.trim().slice(0, 240) : undefined;
    const icon = typeof c.icon === "string" ? c.icon.trim().slice(0, 32) : undefined;
    const qsRaw = c.questions;
    const questions: SuggestedQuestion[] = [];
    if (Array.isArray(qsRaw)) {
      let qi = 0;
      for (const q of qsRaw) {
        if (!q || typeof q !== "object") continue;
        const qo = q as Record<string, unknown>;
        const qid = typeof qo.id === "string" && qo.id.trim() ? qo.id.trim().slice(0, 64) : makeId(id, qi);
        const question = typeof qo.question === "string" ? qo.question.trim() : "";
        if (!question || question.length > MAX_QUESTION_LEN) continue;
        const rationale = typeof qo.rationale === "string" ? qo.rationale.trim().slice(0, 280) : undefined;
        let sourcePages: number[] | undefined;
        if (Array.isArray(qo.sourcePages)) {
          const sp = qo.sourcePages.filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0).map((x) => Math.floor(x));
          if (sp.length) sourcePages = Array.from(new Set(sp)).sort((a, b) => a - b).slice(0, 8);
        }
        let sourceSections: string[] | undefined;
        if (Array.isArray(qo.sourceSections)) {
          const ss = qo.sourceSections
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .map((x) => x.trim().slice(0, 200));
          if (ss.length) sourceSections = ss.slice(0, 6);
        }
        questions.push({ id: qid, question, rationale, sourcePages, sourceSections });
        qi++;
        if (questions.length >= MAX_QUESTIONS_PER_CATEGORY) break;
      }
    }
    const uq = uniqueQuestions(questions);
    if (uq.length === 0) continue;
    out.push({ id, label, description, icon, tone, questions: uq });
    if (out.length >= MAX_CATEGORIES) break;
  }
  return out;
}
