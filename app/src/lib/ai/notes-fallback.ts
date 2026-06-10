import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  NoteActionCandidate,
  NoteAskAiResult,
  NoteCaptureAiResult,
  NoteConnectAiResult,
  NoteConnectionHint,
  NoteExtractActionsAiResult,
  NoteMeetingRecapAiResult,
  NoteOrganizeAiResult,
  NoteResearchDistillAiResult,
  NoteRouteSuggestion,
  NoteSummarizeAiResult,
} from "@/lib/ai/schemas/notes";
import type { NoteConnectionTarget } from "@/lib/ai/prompts/notes";

function tr(
  locale: AppLocale | string,
  variants: { en: string; zhTW: string; zhCN: string },
) {
  if (locale === "zh-TW") return variants.zhTW;
  if (locale === "zh-CN") return variants.zhCN;
  return variants.en;
}

function compactLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstSentence(text: string, maxLength = 240) {
  const cleaned = text.trim().replace(/\s+/g, " ");
  const sentence = cleaned.match(/^(.+?[.!?。！？])\s/)?.[1] ?? cleaned;
  return sentence.slice(0, maxLength).trim();
}

function titleFrom(text: string, fallback: string) {
  const line = compactLines(text)[0] ?? fallback;
  return line.replace(/^#+\s*/, "").replace(/[.。]\s*$/, "").slice(0, 120) || fallback;
}

function inferType(text: string): NoteCaptureAiResult["noteType"] {
  const t = text.toLowerCase();
  if (/meeting|standup|agenda|minutes|會議|会议/.test(t)) return "meeting";
  if (/http|source|paper|research|quote|citation|研究|引用/.test(t)) return "research";
  if (/decision|decided|tradeoff|commit|決定|取捨|承諾/.test(t)) return "decision";
  if (/feel|felt|emotion|reflect|感受|情緒|情绪|反思/.test(t)) return "reflection";
  if (text.length > 900) return "brain-dump";
  return "general";
}

function keywordTags(text: string) {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .match(/[a-z][a-z0-9-]{3,}|[\u4e00-\u9fff]{2,}/g);
  if (!words) return [];
  const counts = new Map<string, number>();
  const stop = new Set([
    "this",
    "that",
    "with",
    "from",
    "have",
    "need",
    "should",
    "about",
    "because",
    "there",
    "their",
  ]);
  for (const word of words) {
    if (stop.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([word]) => word);
}

function summarize(text: string, locale: AppLocale | string): NoteSummarizeAiResult {
  const lines = compactLines(text);
  const points = lines
    .filter((line) => line.length > 12)
    .slice(0, 5)
    .map((line) => line.replace(/^[-*]\s*/, "").slice(0, 220));
  const summary =
    firstSentence(text, 420) ||
    tr(locale, {
      en: "This note does not contain enough content to summarize yet.",
      zhTW: "這則筆記目前內容不足，暫時無法摘要。",
      zhCN: "这则笔记目前内容不足，暂时无法摘要。",
    });
  return {
    summary,
    keyPoints: points.length ? points : [summary].filter(Boolean),
    confidence: text.length > 80 ? 0.62 : 0.38,
  };
}

const ACTION_PATTERNS = [
  /\b(todo|to do|action|follow up|next step|need to|must|should)\b/i,
  /(需要|要|跟進|跟进|下一步|安排|記得|记得|完成)/,
];

const SOURCE_PATTERNS = [/https?:\/\//i, /\b(source|paper|research|citation|quote|pdf|article)\b/i, /(來源|出处|引用|研究|論文|论文)/];
const SPARK_PATTERNS = [/\b(idea|could|maybe|what if|opportunity|concept)\b/i, /(靈感|灵感|點子|点子|可以試|可以试|如果)/];
const PROJECT_PATTERNS = [/\b(project|milestone|roadmap|launch|scope|stakeholder)\b/i, /(專案|项目|里程碑|上線|上线|範圍|范围)/];
const JOURNAL_PATTERNS = [/\b(feel|felt|emotion|reflect|grateful|anxious|energy)\b/i, /(感受|情緒|情绪|反思|感恩|焦慮|焦虑)/];

function actionTitle(line: string) {
  return line
    .replace(/^[-*]\s*/, "")
    .replace(/^(todo|to do|action|next step|follow up)[:：-]\s*/i, "")
    .replace(/^(需要|要|下一步|跟進|跟进)[:：-]?\s*/, "")
    .slice(0, 160)
    .trim();
}

export function fallbackExtractActions(
  noteContent: string,
  locale: AppLocale | string,
): NoteExtractActionsAiResult {
  const lines = compactLines(noteContent);
  const actions: NoteActionCandidate[] = [];

  for (const line of lines) {
    if (!ACTION_PATTERNS.some((pattern) => pattern.test(line))) continue;
    const title = actionTitle(line);
    if (!title || title.length < 3) continue;
    actions.push({
      title,
      description: "",
      priority: /urgent|asap|緊急|马上|馬上/i.test(line) ? "urgent" : "medium",
      dueDate: "",
      projectHint: "",
      tags: [],
      sourceQuote: line.slice(0, 240),
      confidence: 0.58,
    });
    if (actions.length >= 8) break;
  }

  return {
    actions,
    summary: actions.length
      ? tr(locale, {
          en: `${actions.length} action candidate(s) found.`,
          zhTW: `找到 ${actions.length} 個行動候選。`,
          zhCN: `找到 ${actions.length} 个行动候选。`,
        })
      : tr(locale, {
          en: "No concrete action candidates found.",
          zhTW: "沒有找到具體行動候選。",
          zhCN: "没有找到具体行动候选。",
        }),
  };
}

export function fallbackCapture(
  noteContent: string,
  locale: AppLocale | string,
  noteTitle?: string,
): NoteCaptureAiResult {
  const summary = summarize(noteContent, locale);
  const noteType = inferType(noteContent);
  return {
    title: noteTitle?.trim() || titleFrom(noteContent, tr(locale, {
      en: "Untitled note",
      zhTW: "未命名筆記",
      zhCN: "未命名笔记",
    })),
    summary: summary.summary,
    noteType,
    category: noteType === "general" ? "" : noteType,
    tags: keywordTags(noteContent),
    actionCandidates: fallbackExtractActions(noteContent, locale).actions,
    decisionCandidates: /decision|decided|決定|取捨|承諾/i.test(noteContent)
      ? [
          {
            text: firstSentence(noteContent, 220),
            rationale: tr(locale, {
              en: "Decision language appears in the note.",
              zhTW: "筆記中出現決策語氣。",
              zhCN: "笔记中出现决策语气。",
            }),
            confidence: 0.54,
          },
        ]
      : [],
    connectionHints: [],
    confidence: 0.56,
  };
}

function evidenceFrom(noteContent: string, patterns: RegExp[]) {
  return compactLines(noteContent)
    .filter((line) => patterns.some((pattern) => pattern.test(line)))
    .slice(0, 3)
    .map((line) => line.slice(0, 220));
}

export function fallbackRoute(
  noteContent: string,
  locale: AppLocale | string,
): NoteRouteSuggestion {
  const sourceEvidence = evidenceFrom(noteContent, SOURCE_PATTERNS);
  const sparkEvidence = evidenceFrom(noteContent, SPARK_PATTERNS);
  const actionEvidence = compactLines(noteContent)
    .filter((line) => ACTION_PATTERNS.some((pattern) => pattern.test(line)))
    .slice(0, 3)
    .map((line) => line.slice(0, 220));
  const projectEvidence = evidenceFrom(noteContent, PROJECT_PATTERNS);
  const journalEvidence = evidenceFrom(noteContent, JOURNAL_PATTERNS);

  if (sourceEvidence.length > 0) {
    return {
      destination: "knowledge",
      secondaryDestinations: actionEvidence.length > 0 ? ["task", "note"] : ["note"],
      nextBestAction: tr(locale, {
        en: "Promote source material into Knowledge Base after review.",
        zhTW: "Review 後將來源材料推進 Knowledge Base。",
        zhCN: "Review 后将来源材料推进 Knowledge Base。",
      }),
      rationale: tr(locale, {
        en: "This note contains source or research signals, so it is more valuable as durable referenced material.",
        zhTW: "這則筆記含有來源或研究訊號，適合變成可引用的長期材料。",
        zhCN: "这则笔记含有来源或研究信号，适合变成可引用的长期材料。",
      }),
      evidence: sourceEvidence,
      confidence: 0.68,
    };
  }

  if (actionEvidence.length > 0 && noteContent.length < 700) {
    return {
      destination: "task",
      secondaryDestinations: ["note"],
      nextBestAction: tr(locale, {
        en: "Extract concrete action candidates and approve the useful ones as tasks.",
        zhTW: "抽取具體行動候選，再將有用的批准為任務。",
        zhCN: "抽取具体行动候选，再将有用的批准为任务。",
      }),
      rationale: tr(locale, {
        en: "The note uses next-step language and is short enough to be converted into execution work.",
        zhTW: "這則筆記有下一步語氣，而且夠短，適合轉成執行事項。",
        zhCN: "这则笔记有下一步语气，而且够短，适合转成执行事项。",
      }),
      evidence: actionEvidence,
      confidence: 0.64,
    };
  }

  if (sparkEvidence.length > 0) {
    return {
      destination: "idea",
      secondaryDestinations: ["note"],
      nextBestAction: tr(locale, {
        en: "Send the spark to Ideas if it needs incubation rather than processing.",
        zhTW: "如果這只是靈感種子，把它送去 Ideas 孵化。",
        zhCN: "如果这只是灵感种子，把它送去 Ideas 孵化。",
      }),
      rationale: tr(locale, {
        en: "This looks like an early possibility, not a durable source or execution item yet.",
        zhTW: "它更像早期可能性，暫時不是長期來源或執行項。",
        zhCN: "它更像早期可能性，暂时不是长期来源或执行项。",
      }),
      evidence: sparkEvidence,
      confidence: 0.6,
    };
  }

  if (projectEvidence.length > 0) {
    return {
      destination: "project",
      secondaryDestinations: actionEvidence.length > 0 ? ["task", "note"] : ["note"],
      nextBestAction: tr(locale, {
        en: "Connect this note to the relevant project before extracting follow-ups.",
        zhTW: "先連到相關專案，再抽取 follow-up。",
        zhCN: "先连到相关项目，再抽取 follow-up。",
      }),
      rationale: tr(locale, {
        en: "The note references project planning, scope, launch, or stakeholders.",
        zhTW: "筆記提到專案規劃、範圍、上線或 stakeholder。",
        zhCN: "笔记提到项目规划、范围、上线或 stakeholder。",
      }),
      evidence: projectEvidence,
      confidence: 0.59,
    };
  }

  if (journalEvidence.length > 0) {
    return {
      destination: "journal",
      secondaryDestinations: ["note"],
      nextBestAction: tr(locale, {
        en: "Keep the original note, then move the reflective part into Journal if it is personal processing.",
        zhTW: "保留原筆記；如果是個人反思，將反思部分移到 Journal。",
        zhCN: "保留原笔记；如果是个人反思，将反思部分移到 Journal。",
      }),
      rationale: tr(locale, {
        en: "The note contains emotional or reflective language.",
        zhTW: "筆記包含情緒或反思語氣。",
        zhCN: "笔记包含情绪或反思语气。",
      }),
      evidence: journalEvidence,
      confidence: 0.56,
    };
  }

  return {
    destination: "note",
    secondaryDestinations: [],
    nextBestAction: tr(locale, {
      en: "Clarify this note, add lightweight metadata, then decide whether to route it.",
      zhTW: "先釐清這則筆記並加上輕量 metadata，再決定是否路由。",
      zhCN: "先厘清这则笔记并加上轻量 metadata，再决定是否路由。",
    }),
    rationale: tr(locale, {
      en: "There is not enough strong evidence to route this away from Notes yet.",
      zhTW: "目前沒有足夠強證據要將它移出 Notes。",
      zhCN: "目前没有足够强证据要将它移出 Notes。",
    }),
    evidence: compactLines(noteContent).slice(0, 2).map((line) => line.slice(0, 220)),
    confidence: noteContent.length > 80 ? 0.5 : 0.36,
  };
}

export function fallbackSummarize(
  noteContent: string,
  locale: AppLocale | string,
): NoteSummarizeAiResult {
  return summarize(noteContent, locale);
}

export function fallbackOrganize(
  noteContent: string,
  locale: AppLocale | string,
  noteTitle?: string,
): NoteOrganizeAiResult {
  const lines = compactLines(noteContent);
  const summary = summarize(noteContent, locale);
  return {
    title: noteTitle?.trim() || titleFrom(noteContent, tr(locale, {
      en: "Organized note",
      zhTW: "已整理筆記",
      zhCN: "已整理笔记",
    })),
    cleanedContent: lines.join("\n\n"),
    outline: lines.slice(0, 8).map((line) => line.replace(/^[-*]\s*/, "").slice(0, 220)),
    summary: summary.summary,
    noteType: inferType(noteContent),
    category: "",
    tags: keywordTags(noteContent),
    confidence: 0.52,
  };
}

function tokenSet(value: string) {
  return new Set(
    (value.toLowerCase().match(/[a-z][a-z0-9-]{3,}|[\u4e00-\u9fff]{2,}/g) ?? [])
      .filter((token) => token.length >= 2),
  );
}

export function fallbackConnect(
  noteContent: string,
  targets: NoteConnectionTarget[],
): NoteConnectAiResult {
  const sourceTokens = tokenSet(noteContent);
  const connections: NoteConnectionHint[] = [];
  for (const target of targets) {
    const targetTokens = tokenSet(`${target.targetTitle} ${target.context ?? ""}`);
    const overlap = [...sourceTokens].filter((token) => targetTokens.has(token));
    if (overlap.length < 2) continue;
    connections.push({
      targetType: target.targetType as NoteConnectionHint["targetType"],
      targetId: target.targetId,
      targetTitle: target.targetTitle,
      relationshipType: "shared-context",
      rationale: `Shared terms: ${overlap.slice(0, 4).join(", ")}`,
      confidence: Math.min(0.72, 0.42 + overlap.length * 0.06),
    });
    if (connections.length >= 8) break;
  }
  return { connections, summary: "" };
}

export function fallbackMeetingRecap(
  noteContent: string,
  locale: AppLocale | string,
): NoteMeetingRecapAiResult {
  const lines = compactLines(noteContent);
  const decisions = lines
    .filter((line) => /decided|decision|決定|承諾/.test(line.toLowerCase()))
    .slice(0, 6);
  return {
    summary: summarize(noteContent, locale).summary,
    agenda: lines.filter((line) => /agenda|討論|讨论/.test(line.toLowerCase())).slice(0, 6),
    decisions,
    actions: fallbackExtractActions(noteContent, locale).actions,
    openQuestions: lines.filter((line) => line.includes("?") || line.includes("？")).slice(0, 6),
    confidence: 0.5,
  };
}

export function fallbackResearchDistill(
  noteContent: string,
  locale: AppLocale | string,
): NoteResearchDistillAiResult {
  const lines = compactLines(noteContent);
  return {
    summary: summarize(noteContent, locale).summary,
    claims: lines.filter((line) => line.length > 20 && !line.includes("?") && !line.includes("？")).slice(0, 6),
    sources: lines.filter((line) => /https?:\/\/|source|來源|出处|引用/i.test(line)).slice(0, 6),
    questions: lines.filter((line) => line.includes("?") || line.includes("？")).slice(0, 6),
    nextSteps: fallbackExtractActions(noteContent, locale).actions,
    confidence: 0.48,
  };
}

export function fallbackAsk(
  noteContent: string,
  question: string,
  locale: AppLocale | string,
): NoteAskAiResult {
  const qTokens = tokenSet(question);
  const lines = compactLines(noteContent);
  const matches = lines.filter((line) => {
    const lineTokens = tokenSet(line);
    return [...qTokens].some((token) => lineTokens.has(token));
  });
  if (matches.length === 0) {
    return {
      answer: tr(locale, {
        en: "I cannot answer that from this note alone.",
        zhTW: "只看這則筆記，無法回答這個問題。",
        zhCN: "只看这则笔记，无法回答这个问题。",
      }),
      citations: [],
      confidence: 0.25,
    };
  }
  return {
    answer: matches.slice(0, 3).join(" "),
    citations: matches.slice(0, 3).map((line) => line.slice(0, 220)),
    confidence: 0.52,
  };
}
