import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";
import type { HabitFrequency, HabitType, TimeOfDay, Weekday } from "@/lib/habits/types";

/**
 * Habits & Routine UI copy — section chrome, heatmap legend, detail drawer,
 * and small formatters. Missing keys in locale overrides fall back to English.
 */
export type HabitsUiCopy = {
  pageTitle: string;
  pageDescription: string;

  todaySectionTitle: string;
  todaySectionDescription: string;
  todayEmpty: string;
  todayGroupMorning: string;
  todayGroupAfternoon: string;
  todayGroupEvening: string;
  todayGroupAnytime: string;

  habitsSectionTitle: string;
  habitsSectionDescription: string;
  habitsEmpty: string;
  habitsPaused: string;
  archivedBadge: string;
  /** Compact streak label for list cards (current count only). */
  habitStreakShort: (current: number) => string;

  routinesSectionTitle: string;
  routinesSectionDescription: string;
  routinesEmpty: string;
  routineStart: string;
  routineStepsLabel: (count: number) => string;

  heatmapSectionTitle: string;
  heatmapSectionDescription: string;
  heatmapPlaceholder: string;
  heatmapLess: string;
  heatmapMore: string;
  heatmapTooltip: (date: string, detail: string) => string;

  insightLoading: string;
  insightEmpty: string;
  insightFailed: string;
  insightRefresh: string;
  insightCached: string;
  insightPatternsTitle: string;
  insightStruggleTitle: string;

  weeklyReviewTitle: string;
  weeklyReviewEmpty: string;
  weeklyReviewRefresh: string;

  habitTypeCheckbox: string;
  habitTypeCounter: string;
  habitTypeDuration: string;
  habitTypeNegative: string;

  timeMorning: string;
  timeAfternoon: string;
  timeEvening: string;
  timeAnytime: string;

  /** Index 0 = Sunday … 6 = Saturday (matches `Weekday` / JS getDay). */
  weekdayShort: string[];

  freqDaily: string;
  freqWeeklyCount: (count: number) => string;
  freqEveryNDays: (n: number) => string;
  freqWeekdays: (dayLabels: string) => string;

  addNote: string;
  notePlaceholder: string;
  noteSave: string;

  detailRecentTitle: string;
  detailNoCompletions: string;
  detailStepsTitle: string;
  formatStreakSummary: (
    current: number,
    best: number,
    lastActive: string | null,
  ) => string;
  formatRoutineTotalMinutes: (totalMinutes: number) => string;

  routineRunTitle: string;
  routineRunDone: string;
  routineRunCancel: string;

  placeholderTodo: string;

  // Phase 4 — create / edit / AI / richer logging
  actionsAddHabit: string;
  actionsAddRoutine: string;
  actionsAiHabit: string;
  actionsAiRoutine: string;
  dialogCreateHabitTitle: string;
  dialogEditHabitTitle: string;
  dialogCreateRoutineTitle: string;
  dialogAiHabitTitle: string;
  dialogAiRoutineTitle: string;
  formName: string;
  formDescription: string;
  formType: string;
  formTarget: string;
  formTargetCounterHint: string;
  formTargetDurationHint: string;
  formFrequency: string;
  formFrequencyDaily: string;
  formFrequencyWeekly: string;
  formFrequencyWeekdays: string;
  formFrequencyEveryNDays: string;
  formWeeklyCount: string;
  formEveryN: string;
  formTimeOfDay: string;
  formActive: string;
  formCancel: string;
  formSaveNew: string;
  formSaveChanges: string;
  intentLabel: string;
  intentPlaceholderHabit: string;
  intentPlaceholderRoutine: string;
  aiGenerate: string;
  aiGenerating: string;
  aiUsePrimary: string;
  aiRationale: string;
  routineStepTitle: string;
  routineStepMinutes: string;
  routineAddStep: string;
  routineRemoveStep: string;
  routineSubmitCreate: string;
  todayLogValue: string;
  todayLogSave: string;
  todayDurationMinutes: string;
  detailEditHabit: string;
  detailArchiveHabit: string;
};

const en: HabitsUiCopy = {
  pageTitle: "Habits & Routine",
  pageDescription: "A calm record of the small things you are trying to do often.",

  todaySectionTitle: "Today",
  todaySectionDescription: "What you set out to do today.",
  todayEmpty: "Nothing on the list for today yet.",
  todayGroupMorning: "Morning",
  todayGroupAfternoon: "Afternoon",
  todayGroupEvening: "Evening",
  todayGroupAnytime: "Anytime",

  habitsSectionTitle: "Habits",
  habitsSectionDescription: "Every habit you've defined — active and archived.",
  habitsEmpty: "No habits yet.",
  habitsPaused: "Paused",
  archivedBadge: "Archived",
  habitStreakShort: (current) =>
    current <= 0 ? "" : `${current}-day streak`,

  routinesSectionTitle: "Routines",
  routinesSectionDescription: "Ordered step-by-step flows you can run anytime.",
  routinesEmpty: "No routines yet.",
  routineStart: "Start",
  routineStepsLabel: (count) =>
    count === 1 ? "1 step" : `${count} steps`,

  heatmapSectionTitle: "Heatmap",
  heatmapSectionDescription: "The last few months at a glance.",
  heatmapPlaceholder: "Heatmap will appear here once you start logging.",
  heatmapLess: "Less",
  heatmapMore: "More",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,

  insightLoading: "Thinking…",
  insightEmpty: "No observation yet.",
  insightFailed: "Couldn't generate that. Try again in a moment.",
  insightRefresh: "Refresh",
  insightCached: "Cached",
  insightPatternsTitle: "Patterns",
  insightStruggleTitle: "Friction scan",

  weeklyReviewTitle: "Weekly review",
  weeklyReviewEmpty: "A review appears here after you've logged for a few days.",
  weeklyReviewRefresh: "Refresh review",

  habitTypeCheckbox: "Once",
  habitTypeCounter: "Count",
  habitTypeDuration: "Duration",
  habitTypeNegative: "Avoid",

  timeMorning: "Morning",
  timeAfternoon: "Afternoon",
  timeEvening: "Evening",
  timeAnytime: "Anytime",

  weekdayShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],

  freqDaily: "Every day",
  freqWeeklyCount: (count) => `${count}× per week`,
  freqEveryNDays: (n) => `Every ${n} days`,
  freqWeekdays: (dayLabels) => `Weekdays: ${dayLabels}`,

  addNote: "Note",
  notePlaceholder: "What stood out about today?",
  noteSave: "Save note",

  detailRecentTitle: "Recent logs",
  detailNoCompletions: "No completions in this window yet.",
  detailStepsTitle: "Steps",
  formatStreakSummary: (current, best, lastActive) =>
    `Current streak: ${current} · Best: ${best}${
      lastActive ? ` · Last success: ${lastActive}` : ""
    }`,
  formatRoutineTotalMinutes: (totalMinutes) =>
    totalMinutes < 60
      ? `${totalMinutes} min total`
      : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m total`,

  placeholderTodo:
    "Use the toolbar for new habits, routines, and AI drafts. Calendar and deeper analytics are next.",

  routineRunTitle: "Run routine",
  routineRunDone: "Mark complete",
  routineRunCancel: "Close",

  actionsAddHabit: "New habit",
  actionsAddRoutine: "New routine",
  actionsAiHabit: "AI habit…",
  actionsAiRoutine: "AI routine…",
  dialogCreateHabitTitle: "Create habit",
  dialogEditHabitTitle: "Edit habit",
  dialogCreateRoutineTitle: "Create routine",
  dialogAiHabitTitle: "Draft habits with AI",
  dialogAiRoutineTitle: "Draft a routine with AI",
  formName: "Name",
  formDescription: "Description",
  formType: "Type",
  formTarget: "Target",
  formTargetCounterHint: "Times per cycle (e.g. 8 glasses).",
  formTargetDurationHint: "Target duration in minutes per cycle.",
  formFrequency: "Frequency",
  formFrequencyDaily: "Every day",
  formFrequencyWeekly: "Times per week",
  formFrequencyWeekdays: "Specific weekdays",
  formFrequencyEveryNDays: "Every N days",
  formWeeklyCount: "Completions per week",
  formEveryN: "Interval (days)",
  formTimeOfDay: "Time of day",
  formActive: "Active",
  formCancel: "Cancel",
  formSaveNew: "Create",
  formSaveChanges: "Save changes",
  intentLabel: "What do you want?",
  intentPlaceholderHabit: "e.g. read 20 minutes before bed, walk after lunch…",
  intentPlaceholderRoutine: "e.g. 10-minute morning reset, wind-down before sleep…",
  aiGenerate: "Generate",
  aiGenerating: "Generating…",
  aiUsePrimary: "Use primary suggestion",
  aiRationale: "Why",
  routineStepTitle: "Step title",
  routineStepMinutes: "Minutes (optional)",
  routineAddStep: "Add step",
  routineRemoveStep: "Remove",
  routineSubmitCreate: "Create routine",
  todayLogValue: "Today",
  todayLogSave: "Save",
  todayDurationMinutes: "Minutes",
  detailEditHabit: "Edit",
  detailArchiveHabit: "Archive",
};

const zhTW: Partial<HabitsUiCopy> = {
  pageTitle: "習慣與作息",
  pageDescription: "靜靜記下你想常常做的那些小事。",

  todaySectionTitle: "今日",
  todaySectionDescription: "你今天想做的事。",
  todayEmpty: "今日還沒有任何項目。",

  habitsSectionTitle: "習慣",
  habitsSectionDescription: "所有定義過的習慣,包含現行與封存。",
  habitsEmpty: "尚未新增任何習慣。",
  habitsPaused: "暫停",

  routinesSectionTitle: "例行",
  routinesSectionDescription: "可隨時執行的分步流程。",
  routinesEmpty: "尚未新增任何例行。",

  heatmapSectionTitle: "熱力圖",
  heatmapSectionDescription: "近幾個月的整體樣貌。",
  heatmapPlaceholder: "開始記錄後,熱力圖會顯示在這裡。",

  insightLoading: "正在思考…",
  insightEmpty: "暫無觀察。",
  insightFailed: "無法產生內容,請稍後再試。",

  weeklyReviewTitle: "每週回顧",
  weeklyReviewEmpty: "記錄幾天後,這裡會出現一段回顧。",
  weeklyReviewRefresh: "重新整理週回顧",

  todayGroupMorning: "上午",
  todayGroupAfternoon: "下午",
  todayGroupEvening: "晚上",
  todayGroupAnytime: "不限時段",
  archivedBadge: "已封存",
  heatmapLess: "較少",
  heatmapMore: "較多",
  heatmapTooltip: (date, detail) => `${date}：${detail}`,
  insightRefresh: "重新整理",
  insightCached: "已快取",
  insightPatternsTitle: "模式",
  insightStruggleTitle: "摩擦點快掃",
  habitTypeCheckbox: "一次",
  habitTypeCounter: "次數",
  habitTypeDuration: "時長",
  habitTypeNegative: "避免",
  timeMorning: "早晨",
  timeAfternoon: "下午",
  timeEvening: "晚上",
  timeAnytime: "不限",
  weekdayShort: ["日", "一", "二", "三", "四", "五", "六"],
  freqDaily: "每天",
  addNote: "備註",
  notePlaceholder: "今天有什麼想補上一句？",
  noteSave: "儲存備註",
  detailRecentTitle: "最近紀錄",
  detailNoCompletions: "這段區間還沒有任何紀錄。",
  detailStepsTitle: "步驟",
  formatStreakSummary: (current, best, lastActive) =>
    `連續：${current} · 最佳：${best}${lastActive ? ` · 上次達成：${lastActive}` : ""}`,
  routineStart: "開始",
  routineStepsLabel: (count) => (count === 1 ? "1 個步驟" : `${count} 個步驟`),

  placeholderTodo: "第二階段會在這裡加入正式設計。",
};

const zhCN: Partial<HabitsUiCopy> = {
  pageTitle: "习惯与日常",
  pageDescription: "安静地记录你想经常做的那些小事。",

  todaySectionTitle: "今日",
  todaySectionDescription: "你今天想做的事。",
  todayEmpty: "今日还没有任何项目。",

  habitsSectionTitle: "习惯",
  habitsSectionDescription: "所有定义过的习惯,包括进行中与已归档。",
  habitsEmpty: "暂无习惯。",
  habitsPaused: "已暂停",

  routinesSectionTitle: "例行",
  routinesSectionDescription: "可随时执行的分步流程。",
  routinesEmpty: "暂无例行。",

  heatmapSectionTitle: "热力图",
  heatmapSectionDescription: "最近几个月的整体样貌。",
  heatmapPlaceholder: "开始记录后,热力图会显示在这里。",

  insightLoading: "正在思考…",
  insightEmpty: "暂无观察。",
  insightFailed: "无法生成内容,请稍后再试。",

  weeklyReviewTitle: "每周回顾",
  weeklyReviewEmpty: "记录几天后,这里会出现一段回顾。",
  weeklyReviewRefresh: "刷新周回顾",

  todayGroupMorning: "上午",
  todayGroupAfternoon: "下午",
  todayGroupEvening: "晚上",
  todayGroupAnytime: "全天",
  archivedBadge: "已归档",
  heatmapLess: "较少",
  heatmapMore: "较多",
  heatmapTooltip: (date, detail) => `${date}：${detail}`,
  insightRefresh: "刷新",
  insightCached: "已缓存",
  insightPatternsTitle: "模式",
  insightStruggleTitle: "摩擦点快扫",
  habitTypeCheckbox: "一次",
  habitTypeCounter: "计数",
  habitTypeDuration: "时长",
  habitTypeNegative: "避免",
  timeMorning: "早晨",
  timeAfternoon: "下午",
  timeEvening: "晚上",
  timeAnytime: "不限",
  weekdayShort: ["日", "一", "二", "三", "四", "五", "六"],
  freqDaily: "每天",
  addNote: "备注",
  notePlaceholder: "今天有什么想记一句？",
  noteSave: "保存备注",
  detailRecentTitle: "最近记录",
  detailNoCompletions: "这段时间还没有记录。",
  detailStepsTitle: "步骤",
  formatStreakSummary: (current, best, lastActive) =>
    `连续：${current} · 最佳：${best}${lastActive ? ` · 上次达成：${lastActive}` : ""}`,
  routineStart: "开始",
  routineStepsLabel: (count) => (count === 1 ? "1 步" : `${count} 步`),

  placeholderTodo: "第二阶段会在这里加入正式设计。",
};

const ja: Partial<HabitsUiCopy> = {
  pageTitle: "習慣とルーティン",
  pageDescription: "繰り返し行いたい小さな行動の静かな記録。",

  todaySectionTitle: "今日",
  todaySectionDescription: "今日やろうと決めたこと。",
  todayEmpty: "今日の項目はまだありません。",

  habitsSectionTitle: "習慣",
  habitsSectionDescription: "これまでに定義したすべての習慣(進行中・アーカイブ含む)。",
  habitsEmpty: "まだ習慣がありません。",
  habitsPaused: "一時停止",

  routinesSectionTitle: "ルーティン",
  routinesSectionDescription: "いつでも実行できる順序付きのステップ。",
  routinesEmpty: "まだルーティンがありません。",

  heatmapSectionTitle: "ヒートマップ",
  heatmapSectionDescription: "ここ数ヶ月の全体像。",
  heatmapPlaceholder: "記録を始めるとここに表示されます。",

  insightLoading: "考えています…",
  insightEmpty: "まだ観察はありません。",
  insightFailed: "生成できませんでした。少し時間をおいてください。",

  weeklyReviewTitle: "週のふり返り",
  weeklyReviewEmpty: "数日記録するとここにふり返りが表示されます。",
  weeklyReviewRefresh: "ふり返りを更新",

  todayGroupMorning: "午前",
  todayGroupAfternoon: "午後",
  todayGroupEvening: "夜",
  todayGroupAnytime: "時間帯なし",
  archivedBadge: "アーカイブ",
  heatmapLess: "少",
  heatmapMore: "多",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,
  insightRefresh: "更新",
  insightCached: "キャッシュ",
  insightPatternsTitle: "パターン",
  insightStruggleTitle: "摩擦のスキャン",
  habitTypeCheckbox: "一回",
  habitTypeCounter: "回数",
  habitTypeDuration: "時間",
  habitTypeNegative: "回避",
  timeMorning: "朝",
  timeAfternoon: "昼",
  timeEvening: "夜",
  timeAnytime: "指定なし",
  weekdayShort: ["日", "月", "火", "水", "木", "金", "土"],
  freqDaily: "毎日",
  addNote: "メモ",
  notePlaceholder: "今日ひとこと残すなら？",
  noteSave: "メモを保存",
  detailRecentTitle: "最近の記録",
  detailNoCompletions: "この期間の記録はまだありません。",
  detailStepsTitle: "ステップ",
  formatStreakSummary: (current, best, lastActive) =>
    `連続 ${current} · 最高 ${best}${lastActive ? ` · 最後の達成 ${lastActive}` : ""}`,
  routineStart: "開始",
  routineStepsLabel: (count) => (count === 1 ? "1 ステップ" : `${count} ステップ`),

  placeholderTodo: "フェーズ 2 で本番デザインを追加します。",
};

const ko: Partial<HabitsUiCopy> = {
  pageTitle: "습관과 루틴",
  pageDescription: "자주 하고 싶은 작은 것들을 조용히 기록합니다.",

  todaySectionTitle: "오늘",
  todaySectionDescription: "오늘 하기로 정한 것들.",
  todayEmpty: "오늘 항목이 아직 없습니다.",

  habitsSectionTitle: "습관",
  habitsSectionDescription: "지금까지 정의한 모든 습관(활성 및 보관).",
  habitsEmpty: "아직 습관이 없습니다.",
  habitsPaused: "일시중지",

  routinesSectionTitle: "루틴",
  routinesSectionDescription: "언제든 실행할 수 있는 단계별 흐름.",
  routinesEmpty: "아직 루틴이 없습니다.",

  heatmapSectionTitle: "히트맵",
  heatmapSectionDescription: "최근 몇 달의 전체적인 모습.",
  heatmapPlaceholder: "기록을 시작하면 여기에 표시됩니다.",

  insightLoading: "생각 중…",
  insightEmpty: "아직 관찰이 없습니다.",
  insightFailed: "만들 수 없어요. 잠시 후 다시 시도해 주세요.",

  weeklyReviewTitle: "주간 돌아보기",
  weeklyReviewEmpty: "며칠 기록하면 여기에 돌아보기가 나타납니다.",
  weeklyReviewRefresh: "돌아보기 새로고침",

  todayGroupMorning: "오전",
  todayGroupAfternoon: "오후",
  todayGroupEvening: "저녁",
  todayGroupAnytime: "시간 무관",
  archivedBadge: "보관됨",
  heatmapLess: "적음",
  heatmapMore: "많음",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,
  insightRefresh: "새로고침",
  insightCached: "캐시됨",
  insightPatternsTitle: "패턴",
  insightStruggleTitle: "마찰 지점 스캔",
  habitTypeCheckbox: "한 번",
  habitTypeCounter: "횟수",
  habitTypeDuration: "시간",
  habitTypeNegative: "피하기",
  timeMorning: "아침",
  timeAfternoon: "오후",
  timeEvening: "저녁",
  timeAnytime: "제한 없음",
  weekdayShort: ["일", "월", "화", "수", "목", "금", "토"],
  freqDaily: "매일",
  addNote: "메모",
  notePlaceholder: "오늘 한 줄을 남긴다면?",
  noteSave: "메모 저장",
  detailRecentTitle: "최근 기록",
  detailNoCompletions: "이 기간에는 아직 기록이 없습니다.",
  detailStepsTitle: "단계",
  formatStreakSummary: (current, best, lastActive) =>
    `연속 ${current} · 최고 ${best}${lastActive ? ` · 마지막 성공 ${lastActive}` : ""}`,
  routineStart: "시작",
  routineStepsLabel: (count) => (count === 1 ? "1단계" : `${count}단계`),

  placeholderTodo: "2단계에서 실제 디자인이 들어갑니다.",
};

const fr: Partial<HabitsUiCopy> = {
  pageTitle: "Habitudes & routines",
  pageDescription: "Un journal calme des petites choses que vous essayez de faire souvent.",

  todaySectionTitle: "Aujourd'hui",
  todaySectionDescription: "Ce que vous avez prévu pour aujourd'hui.",
  todayEmpty: "Rien dans la liste pour aujourd'hui.",

  habitsSectionTitle: "Habitudes",
  habitsSectionDescription: "Chaque habitude définie — active ou archivée.",
  habitsEmpty: "Aucune habitude pour l'instant.",
  habitsPaused: "En pause",

  routinesSectionTitle: "Routines",
  routinesSectionDescription: "Des enchaînements ordonnés que vous pouvez lancer à tout moment.",
  routinesEmpty: "Aucune routine pour l'instant.",

  heatmapSectionTitle: "Heatmap",
  heatmapSectionDescription: "Les derniers mois en un coup d'œil.",
  heatmapPlaceholder: "La heatmap apparaîtra ici dès que vous commencerez à noter.",

  insightLoading: "Réflexion en cours…",
  insightEmpty: "Pas encore d'observation.",
  insightFailed: "Impossible de générer ce contenu. Réessayez dans un instant.",

  weeklyReviewTitle: "Revue de la semaine",
  weeklyReviewEmpty: "Une revue apparaîtra ici après quelques jours de suivi.",
  weeklyReviewRefresh: "Actualiser la revue",

  todayGroupMorning: "Matin",
  todayGroupAfternoon: "Après-midi",
  todayGroupEvening: "Soir",
  todayGroupAnytime: "À tout moment",
  archivedBadge: "Archivé",
  heatmapLess: "Moins",
  heatmapMore: "Plus",
  heatmapTooltip: (date, detail) => `${date} : ${detail}`,
  insightRefresh: "Actualiser",
  insightCached: "En cache",
  insightPatternsTitle: "Motifs",
  insightStruggleTitle: "Points de friction",
  habitTypeCheckbox: "Simple",
  habitTypeCounter: "Compteur",
  habitTypeDuration: "Durée",
  habitTypeNegative: "Éviter",
  timeMorning: "Matin",
  timeAfternoon: "Après-midi",
  timeEvening: "Soir",
  timeAnytime: "Libre",
  weekdayShort: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
  freqDaily: "Chaque jour",
  addNote: "Note",
  notePlaceholder: "Une phrase pour aujourd'hui ?",
  noteSave: "Enregistrer la note",
  detailRecentTitle: "Historique récent",
  detailNoCompletions: "Pas encore d'entrées sur cette période.",
  detailStepsTitle: "Étapes",
  formatStreakSummary: (current, best, lastActive) =>
    `Série actuelle : ${current} · Meilleure : ${best}${
      lastActive ? ` · Dernier succès : ${lastActive}` : ""
    }`,
  routineStart: "Démarrer",
  routineStepsLabel: (count) =>
    count === 1 ? "1 étape" : `${count} étapes`,

  placeholderTodo: "La vraie maquette arrivera en phase 2.",
};

const it: Partial<HabitsUiCopy> = {
  pageTitle: "Abitudini e routine",
  pageDescription: "Un registro tranquillo delle piccole cose che vuoi fare spesso.",

  todaySectionTitle: "Oggi",
  todaySectionDescription: "Cosa ti sei proposto oggi.",
  todayEmpty: "Nessuna voce per oggi.",

  habitsSectionTitle: "Abitudini",
  habitsSectionDescription: "Ogni abitudine che hai definito — attiva o archiviata.",
  habitsEmpty: "Nessuna abitudine per ora.",
  habitsPaused: "In pausa",

  routinesSectionTitle: "Routine",
  routinesSectionDescription: "Sequenze ordinate che puoi eseguire in qualsiasi momento.",
  routinesEmpty: "Nessuna routine per ora.",

  heatmapSectionTitle: "Heatmap",
  heatmapSectionDescription: "Gli ultimi mesi a colpo d'occhio.",
  heatmapPlaceholder: "La heatmap apparirà qui quando inizierai a registrare.",

  insightLoading: "Sto pensando…",
  insightEmpty: "Ancora nessuna osservazione.",
  insightFailed: "Non riesco a generare il contenuto. Riprova tra poco.",

  weeklyReviewTitle: "Revisione della settimana",
  weeklyReviewEmpty: "Dopo qualche giorno di registrazione apparirà qui una revisione.",
  weeklyReviewRefresh: "Aggiorna revisione",

  todayGroupMorning: "Mattina",
  todayGroupAfternoon: "Pomeriggio",
  todayGroupEvening: "Sera",
  todayGroupAnytime: "Qualsiasi orario",
  archivedBadge: "Archiviata",
  heatmapLess: "Meno",
  heatmapMore: "Più",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,
  insightRefresh: "Aggiorna",
  insightCached: "In cache",
  insightPatternsTitle: "Pattern",
  insightStruggleTitle: "Aree di attrito",
  habitTypeCheckbox: "Una volta",
  habitTypeCounter: "Conteggio",
  habitTypeDuration: "Durata",
  habitTypeNegative: "Evita",
  timeMorning: "Mattina",
  timeAfternoon: "Pomeriggio",
  timeEvening: "Sera",
  timeAnytime: "Libero",
  weekdayShort: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"],
  freqDaily: "Ogni giorno",
  addNote: "Nota",
  notePlaceholder: "Una riga per oggi?",
  noteSave: "Salva nota",
  detailRecentTitle: "Registro recente",
  detailNoCompletions: "Nessuna voce in questo intervallo.",
  detailStepsTitle: "Passi",
  formatStreakSummary: (current, best, lastActive) =>
    `Serie attuale: ${current} · Migliore: ${best}${
      lastActive ? ` · Ultimo successo: ${lastActive}` : ""
    }`,
  routineStart: "Avvia",
  routineStepsLabel: (count) =>
    count === 1 ? "1 passo" : `${count} passi`,

  placeholderTodo: "Il design definitivo arriverà nella fase 2.",
};

const es: Partial<HabitsUiCopy> = {
  pageTitle: "Hábitos y rutinas",
  pageDescription: "Un registro tranquilo de las pequeñas cosas que quieres hacer seguido.",

  todaySectionTitle: "Hoy",
  todaySectionDescription: "Lo que te propusiste hoy.",
  todayEmpty: "Nada en la lista de hoy todavía.",

  habitsSectionTitle: "Hábitos",
  habitsSectionDescription: "Cada hábito que has definido — activo y archivado.",
  habitsEmpty: "Aún no hay hábitos.",
  habitsPaused: "En pausa",

  routinesSectionTitle: "Rutinas",
  routinesSectionDescription: "Secuencias ordenadas que puedes ejecutar en cualquier momento.",
  routinesEmpty: "Aún no hay rutinas.",

  heatmapSectionTitle: "Mapa de calor",
  heatmapSectionDescription: "Los últimos meses de un vistazo.",
  heatmapPlaceholder: "El mapa aparecerá aquí cuando empieces a registrar.",

  insightLoading: "Pensando…",
  insightEmpty: "Aún no hay observación.",
  insightFailed: "No se pudo generar el contenido. Inténtalo pronto.",

  weeklyReviewTitle: "Revisión semanal",
  weeklyReviewEmpty: "Tras algunos días registrando, aquí aparecerá una revisión.",
  weeklyReviewRefresh: "Actualizar revisión",

  todayGroupMorning: "Mañana",
  todayGroupAfternoon: "Tarde",
  todayGroupEvening: "Noche",
  todayGroupAnytime: "Cualquier hora",
  archivedBadge: "Archivada",
  heatmapLess: "Menos",
  heatmapMore: "Más",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,
  insightRefresh: "Actualizar",
  insightCached: "En caché",
  insightPatternsTitle: "Patrones",
  insightStruggleTitle: "Fricción",
  habitTypeCheckbox: "Una vez",
  habitTypeCounter: "Conteo",
  habitTypeDuration: "Duración",
  habitTypeNegative: "Evitar",
  timeMorning: "Mañana",
  timeAfternoon: "Tarde",
  timeEvening: "Noche",
  timeAnytime: "Libre",
  weekdayShort: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
  freqDaily: "Cada día",
  addNote: "Nota",
  notePlaceholder: "¿Una línea para hoy?",
  noteSave: "Guardar nota",
  detailRecentTitle: "Registro reciente",
  detailNoCompletions: "Aún no hay entradas en este periodo.",
  detailStepsTitle: "Pasos",
  formatStreakSummary: (current, best, lastActive) =>
    `Racha actual: ${current} · Mejor: ${best}${
      lastActive ? ` · Último éxito: ${lastActive}` : ""
    }`,
  routineStart: "Empezar",
  routineStepsLabel: (count) =>
    count === 1 ? "1 paso" : `${count} pasos`,

  placeholderTodo: "El diseño final llegará en la fase 2.",
};

const vi: Partial<HabitsUiCopy> = {
  pageTitle: "Thói quen & Lịch sinh hoạt",
  pageDescription: "Một ghi chép điềm tĩnh về những việc nhỏ bạn muốn làm thường xuyên.",

  todaySectionTitle: "Hôm nay",
  todaySectionDescription: "Những gì bạn định làm hôm nay.",
  todayEmpty: "Chưa có mục nào cho hôm nay.",

  habitsSectionTitle: "Thói quen",
  habitsSectionDescription: "Mọi thói quen bạn đã tạo — đang dùng và đã lưu trữ.",
  habitsEmpty: "Chưa có thói quen nào.",
  habitsPaused: "Tạm dừng",

  routinesSectionTitle: "Lịch sinh hoạt",
  routinesSectionDescription: "Chuỗi bước có thứ tự, chạy bất cứ lúc nào.",
  routinesEmpty: "Chưa có lịch nào.",

  heatmapSectionTitle: "Bản đồ nhiệt",
  heatmapSectionDescription: "Vài tháng gần đây nhìn tổng quan.",
  heatmapPlaceholder: "Bản đồ sẽ xuất hiện khi bạn bắt đầu ghi nhận.",

  insightLoading: "Đang suy nghĩ…",
  insightEmpty: "Chưa có quan sát nào.",
  insightFailed: "Không tạo được nội dung. Thử lại sau nhé.",

  weeklyReviewTitle: "Tổng kết tuần",
  weeklyReviewEmpty: "Sau vài ngày ghi nhận, phần tổng kết sẽ xuất hiện ở đây.",
  weeklyReviewRefresh: "Làm mới tổng kết",

  todayGroupMorning: "Buổi sáng",
  todayGroupAfternoon: "Buổi chiều",
  todayGroupEvening: "Buổi tối",
  todayGroupAnytime: "Cả ngày",
  archivedBadge: "Đã lưu trữ",
  heatmapLess: "Ít",
  heatmapMore: "Nhiều",
  heatmapTooltip: (date, detail) => `${date}: ${detail}`,
  insightRefresh: "Làm mới",
  insightCached: "Đã cache",
  insightPatternsTitle: "Mẫu",
  insightStruggleTitle: "Điểm ma sát",
  habitTypeCheckbox: "Một lần",
  habitTypeCounter: "Đếm",
  habitTypeDuration: "Thời lượng",
  habitTypeNegative: "Tránh",
  timeMorning: "Sáng",
  timeAfternoon: "Chiều",
  timeEvening: "Tối",
  timeAnytime: "Bất kỳ lúc nào",
  weekdayShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
  freqDaily: "Mỗi ngày",
  addNote: "Ghi chú",
  notePlaceholder: "Một dòng cho hôm nay?",
  noteSave: "Lưu ghi chú",
  detailRecentTitle: "Nhật ký gần đây",
  detailNoCompletions: "Chưa có bản ghi trong khoảng thời gian này.",
  detailStepsTitle: "Bước",
  formatStreakSummary: (current, best, lastActive) =>
    `Chuỗi hiện tại: ${current} · Tốt nhất: ${best}${
      lastActive ? ` · Lần gần đạt: ${lastActive}` : ""
    }`,
  routineStart: "Bắt đầu",
  routineStepsLabel: (count) =>
    count === 1 ? "1 bước" : `${count} bước`,

  placeholderTodo: "Giai đoạn 2 sẽ thêm thiết kế thật ở đây.",
};

export function timeOfDayLabel(tod: TimeOfDay, c: HabitsUiCopy): string {
  switch (tod) {
    case "morning":
      return c.timeMorning;
    case "afternoon":
      return c.timeAfternoon;
    case "evening":
      return c.timeEvening;
    default:
      return c.timeAnytime;
  }
}

export function habitTypeLabel(type: HabitType, c: HabitsUiCopy): string {
  switch (type) {
    case "checkbox":
      return c.habitTypeCheckbox;
    case "counter":
      return c.habitTypeCounter;
    case "duration":
      return c.habitTypeDuration;
    case "negative":
      return c.habitTypeNegative;
  }
}

export function formatHabitFrequency(f: HabitFrequency, c: HabitsUiCopy): string {
  switch (f.kind) {
    case "daily":
      return c.freqDaily;
    case "weekly_count":
      return c.freqWeeklyCount(f.count);
    case "weekdays": {
      const labels = [...f.days]
        .map((d) => c.weekdayShort[d as Weekday])
        .sort()
        .join(", ");
      return c.freqWeekdays(labels);
    }
    case "every_n_days":
      return c.freqEveryNDays(f.n);
  }
}

const localizedCopy = createLocaleCopyMap<HabitsUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getHabitsUiCopy(locale: AppLocale): HabitsUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}
