import type { AppLocale } from "./app-locale";
import type { VaultOverlapInsightKind } from "@/lib/vault/software-library-schema";

export type VaultInsightsCopy = {
  title: string;
  subtitle: string;
  empty: string;
  byKind: Record<
    VaultOverlapInsightKind,
    { title: string; detail: (meta: Record<string, string | number> | undefined) => string }
  >;
};

export type VaultCompareCopy = {
  title: string;
  subtitle: string;
  pickerTitle: string;
  pickerHint: string;
  searchPlaceholder: string;
  pickerEmpty: string;
  clearSelection: string;
  maxToolsNote: string;
  maxReachedHint: string;
  selectionStatus: (n: number) => string;
  needTwo: string;
  dimensionColumn: string;
  dimSummary: string;
  dimBestFor: string;
  dimDownsides: string;
  dimCost: string;
  dimEase: string;
  dimIntegration: string;
  dimPrivacy: string;
  dimWorkflow: string;
  tableCaption: string;
  openEntry: string;
};

export type VaultPhase4Copy = {
  compare: VaultCompareCopy;
  insights: VaultInsightsCopy;
};

const insightsEn: VaultInsightsCopy = {
  title: "Stack insights",
  subtitle: "Lightweight, rule-based checks on your current vault — no AI required.",
  empty: "Nothing stood out. As your stack grows, we will surface overlaps and gaps here.",
  byKind: {
    duplicate_names: {
      title: "Possible duplicate rows",
      detail: (meta) => {
        const name = typeof meta?.sampleName === "string" ? meta.sampleName : "this app";
        return `Several entries look like the same product (“${name}”). Consider merging notes into one row.`;
      },
    },
    high_recurring_spend: {
      title: "Recurring spend is adding up",
      detail: (meta) => {
        const n = typeof meta?.monthlyUsd === "number" ? meta.monthlyUsd : 0;
        return `Active paid tools total about $${n}/mo (rough estimate). Good moment to review renewals.`;
      },
    },
    missing_docs_layer: {
      title: "No obvious documentation layer",
      detail: () =>
        "If knowledge only lives in chat, consider a small wiki or notes hub so context survives turnover.",
    },
    ai_tool_overlap: {
      title: "Several AI-style tools",
      detail: () =>
        "Tags suggest multiple assistants or AI subscriptions — watch for overlapping monthly costs.",
    },
  },
};

const compareEn: VaultCompareCopy = {
  title: "Compare tools",
  subtitle: "Pick two to four apps from My Vault to see cost, fit, and tradeoffs side by side.",
  pickerTitle: "Choose entries",
  pickerHint: "Select 2–4 rows. Selection is saved while you move between tabs.",
  searchPlaceholder: "Filter by name, category, or tag…",
  pickerEmpty: "No apps match your filter. Try another search.",
  clearSelection: "Clear selection",
  maxToolsNote: "You can compare up to four tools at once.",
  maxReachedHint: "Four tools are already selected. Clear one to add another.",
  selectionStatus: (n) => `${n} selected for compare (max 4).`,
  needTwo: "Select at least two tools to run a comparison.",
  dimensionColumn: "Criteria",
  dimSummary: "Summary",
  dimBestFor: "Best for",
  dimDownsides: "Downsides",
  dimCost: "Cost",
  dimEase: "Ease of use (inferred)",
  dimIntegration: "Integration surface",
  dimPrivacy: "Privacy / enterprise readiness (heuristic)",
  dimWorkflow: "Workflow fit",
  tableCaption: "Software comparison matrix",
  openEntry: "Open details",
};

const zhTW: VaultPhase4Copy = {
  compare: {
    ...compareEn,
    title: "比較工具",
    subtitle: "喺「我的庫藏」揀 2–4 個 app，並排睇成本、配合度同取捨。",
    pickerTitle: "揀項目",
    pickerHint: "揀 2–4 列；你轉 tab 時選取會保留。",
    searchPlaceholder: "用名稱、分類或標籤篩選…",
    pickerEmpty: "冇符合篩選嘅 app，試下改關鍵字。",
    maxReachedHint: "已揀滿四個；清走一個先可以加其他。",
    selectionStatus: (n) => `已揀 ${n} 個作比較（最多 4 個）。`,
    dimensionColumn: "準則",
    clearSelection: "清除揀選",
    maxToolsNote: "最多可以並排比較四個工具。",
    needTwo: "至少要揀兩個工具先可以比較。",
    dimSummary: "摘要",
    dimBestFor: "最啱用於",
    dimDownsides: "缺點",
    dimCost: "費用",
    dimEase: "易用度（由優先度推斷）",
    dimIntegration: "整合面",
    dimPrivacy: "私隱／企業準備（啟發式）",
    dimWorkflow: "流程配合",
    tableCaption: "軟件比較表",
    openEntry: "開詳情",
  },
  insights: {
    ...insightsEn,
    title: "組合洞察",
    subtitle: "用規則檢查你而家嘅庫藏，唔使 AI。",
    empty: "暫時未有特別提示；庫藏豐富咗之後會喺度顯示重疊同缺口。",
    byKind: {
      duplicate_names: {
        title: "可能有重複項目",
        detail: (meta) => {
          const name = typeof meta?.sampleName === "string" ? meta.sampleName : "呢個 app";
          return `多行好似係同一個產品（「${name}」）。可以考慮合併做一筆。`;
        },
      },
      high_recurring_spend: {
        title: "訂閱開支開始積聚",
        detail: (meta) => {
          const n = typeof meta?.monthlyUsd === "number" ? meta.monthlyUsd : 0;
          return `啟用中嘅付費工具大約 US$${n}/月（粗略）。係時候檢查續訂。`;
        },
      },
      missing_docs_layer: {
        title: "未見明顯文件層",
        detail: () =>
          "如果知識只留喺 chat，可以考慮加個小型 wiki 或筆記中心，方便交接。",
      },
      ai_tool_overlap: {
        title: "多個 AI 類工具",
        detail: () =>
          "標籤顯示多個助理或 AI 訂閱，留意月費重疊。",
      },
    },
  },
};

const zhCN: VaultPhase4Copy = {
  compare: {
    ...compareEn,
    title: "对比工具",
    subtitle: "在「我的库」中选 2–4 个应用，并排查看成本、适配与取舍。",
    pickerTitle: "选择条目",
    pickerHint: "选 2–4 行；切换标签时选择会保留。",
    searchPlaceholder: "按名称、类别或标签筛选…",
    pickerEmpty: "没有匹配的应用，试试其他关键词。",
    maxReachedHint: "已选满四个；请先取消一个再添加。",
    selectionStatus: (n) => `已选 ${n} 个用于对比（最多 4 个）。`,
    dimensionColumn: "维度",
    clearSelection: "清除选择",
    maxToolsNote: "最多可同时对比四个工具。",
    needTwo: "至少选择两个工具才能对比。",
    dimSummary: "摘要",
    dimBestFor: "最适合",
    dimDownsides: "缺点",
    dimCost: "费用",
    dimEase: "易用度（由优先级推断）",
    dimIntegration: "集成面",
    dimPrivacy: "隐私 / 企业就绪（启发式）",
    dimWorkflow: "流程匹配",
    tableCaption: "软件对比表",
    openEntry: "打开详情",
  },
  insights: {
    ...insightsEn,
    title: "组合洞察",
    subtitle: "基于规则的库检查，无需 AI。",
    empty: "暂无提示；库丰富后会在此显示重叠与缺口。",
    byKind: {
      duplicate_names: {
        title: "可能有重复条目",
        detail: (meta) => {
          const name = typeof meta?.sampleName === "string" ? meta.sampleName : "该应用";
          return `多行看起来像同一产品（「${name}」）。可考虑合并为一行。`;
        },
      },
      high_recurring_spend: {
        title: "订阅支出在累积",
        detail: (meta) => {
          const n = typeof meta?.monthlyUsd === "number" ? meta.monthlyUsd : 0;
          return `在用的付费工具合计约 $${n}/月（粗略）。适合检查续费。`;
        },
      },
      missing_docs_layer: {
        title: "未见明显文档层",
        detail: () =>
          "若知识只在聊天里，可考虑小型 wiki 或笔记中心，便于交接。",
      },
      ai_tool_overlap: {
        title: "多个 AI 类工具",
        detail: () =>
          "标签暗示多个助手或 AI 订阅，留意月费重叠。",
      },
    },
  },
};

const jaP4: VaultPhase4Copy = {
  compare: {
    ...compareEn,
    title: "ツールを比較",
    subtitle: "保管庫から 2〜4 件選び、コストと適合を並べて確認します。",
    pickerTitle: "エントリを選択",
    pickerHint: "2〜4 件まで。タブを移動しても選択は保持されます。",
    searchPlaceholder: "名前・カテゴリ・タグで絞り込み…",
    pickerEmpty: "条件に一致するアプリがありません。",
    maxReachedHint: "すでに 4 件選択中です。1 件外すと追加できます。",
    selectionStatus: (n) => `比較用に ${n} 件選択中（最大 4 件）。`,
    dimensionColumn: "項目",
    clearSelection: "選択をクリア",
    maxToolsNote: "最大 4 件まで比較できます。",
    needTwo: "比較するには 2 件以上選んでください。",
    dimSummary: "要約",
    dimBestFor: "向いている用途",
    dimDownsides: "弱点",
    dimCost: "料金",
    dimEase: "使いやすさ（優先度から推定）",
    dimIntegration: "連携面",
    dimPrivacy: "プライバシー / 企業利用（ヒューリスティック）",
    dimWorkflow: "ワークフロー適合",
    tableCaption: "ソフトウェア比較表",
    openEntry: "詳細を開く",
  },
  insights: {
    ...insightsEn,
    title: "スタックの示唆",
    subtitle: "ルールベースのチェック（AI なし）。",
    empty: "特になし。スタックが増えると重複やギャップを表示します。",
    byKind: insightsEn.byKind,
  },
};

const koP4: VaultPhase4Copy = {
  compare: {
    ...compareEn,
    title: "도구 비교",
    subtitle: "금고에서 2~4개를 골라 비용과 적합성을 나란히 봅니다.",
    pickerTitle: "항목 선택",
    pickerHint: "2~4개까지. 탭을 옮겨도 선택이 유지됩니다.",
    searchPlaceholder: "이름·카테고리·태그로 필터…",
    pickerEmpty: "조건에 맞는 앱이 없습니다. 검색어를 바꿔 보세요.",
    maxReachedHint: "이미 네 개가 선택되었습니다. 하나를 해제하면 추가할 수 있습니다.",
    selectionStatus: (n) => `비교용 ${n}개 선택됨(최대 4개).`,
    dimensionColumn: "기준",
    clearSelection: "선택 지우기",
    maxToolsNote: "최대 네 개까지 비교할 수 있습니다.",
    needTwo: "비교하려면 두 개 이상 선택하세요.",
    dimSummary: "요약",
    dimBestFor: "적합 용도",
    dimDownsides: "단점",
    dimCost: "비용",
    dimEase: "쉬움 (우선순위 추정)",
    dimIntegration: "연동",
    dimPrivacy: "프라이버시 / 기업 준비 (휴리스틱)",
    dimWorkflow: "워크플로 적합",
    tableCaption: "소프트웨어 비교 표",
    openEntry: "상세 열기",
  },
  insights: {
    ...insightsEn,
    title: "스택 인사이트",
    subtitle: "규칙 기반 점검(AI 없음).",
    empty: "표시할 항목 없음. 스택이 커지면 여기에 표시됩니다.",
    byKind: insightsEn.byKind,
  },
};

export const VAULT_PHASE4_COPY: Record<AppLocale, VaultPhase4Copy> = {
  en: { compare: compareEn, insights: insightsEn },
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja: jaP4,
  ko: koP4,
  fr: { compare: compareEn, insights: insightsEn },
  it: { compare: compareEn, insights: insightsEn },
  es: { compare: compareEn, insights: insightsEn },
  vi: { compare: compareEn, insights: insightsEn },
};

export function getVaultPhase4Copy(locale: AppLocale): VaultPhase4Copy {
  return VAULT_PHASE4_COPY[locale] ?? VAULT_PHASE4_COPY.en;
}
