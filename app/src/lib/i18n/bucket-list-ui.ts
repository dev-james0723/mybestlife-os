import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

export type BucketListUiCopy = {
  // Page chrome
  pageTitle: string;
  pageDescription: string;
  newDream: string;
  newDreamAria: string;
  settingsAction: string;
  clearSeedsAction: string;
  viewMap: string;

  // Stats
  statTotal: string;
  statCompleted: string;
  statActive: string;
  statFunded: string;
  statDreaming: string;
  masterProgress: string;

  // Highlights
  closestToReality: string;
  pushThisWeek: string;
  latestCompletion: string;
  travelDeal: string;
  noHighlight: string;
  blockedOn: (stage: string) => string;
  percentFundedShort: (pct: number) => string;
  monthsOut: (months: number) => string;

  // Filters
  allTypes: string;
  filterTravel: string;
  filterAchievement: string;
  filterGrowth: string;
  filterRelationship: string;
  filterPurchase: string;
  filterLifestyle: string;
  showClosed: string;
  hideClosed: string;
  searchPlaceholder: string;

  // Status labels
  statusDreaming: string;
  statusExploring: string;
  statusPlanning: string;
  statusActive: string;
  statusFunded: string;
  statusScheduled: string;
  statusBooked: string;
  statusCompleted: string;
  statusPaused: string;
  statusArchived: string;

  // Priority / difficulty
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  prioritySomeday: string;
  difficultyEasy: string;
  difficultyMed: string;
  difficultyHard: string;
  difficultyEpic: string;
  timeHorizonThisYear: string;
  timeHorizon13: string;
  timeHorizon35: string;
  timeHorizonLifetime: string;

  // Empty states
  emptyAllTitle: string;
  emptyAllDescription: string;
  emptyAllAction: string;
  emptyFilteredTitle: string;
  emptyFilteredDescription: string;

  // Detail page
  detailWhyMatters: string;
  detailActivate: string;
  detailActivateDescription: string;
  detailLinkedProject: string;
  detailGenerateTasks: string;
  detailBudgetLinked: string;
  detailTravelLogistics: string;
  detailFlightWatch: string;
  detailAiDestinationBrief: string;
  detailAiTripPlan: string;
  detailReframe: string;
  detailReflect: string;
  detailRealize: string;

  realizedDreamsHeader: string;
  upcomingHeader: string;

  activateModalTitle: string;
  activateProjectOption: string;
  activateTaskOption: string;
  activateBudgetOption: string;
  activateSavingsOption: string;
  activateCalendarOption: string;
  activateMapOption: string;
  activateFlightOption: string;
  activateResearchOption: string;
  activateMemoryOption: string;
  activateApply: string;

  // Add sheet
  addSheetTitle: string;
  editSheetTitle: string;
  fieldTitle: string;
  fieldDescription: string;
  fieldWhyMatters: string;
  fieldType: string;
  fieldStatus: string;
  fieldPriority: string;
  fieldDifficulty: string;
  fieldTimeHorizon: string;
  fieldEstimatedCost: string;
  fieldCostBand: string;
  fieldTargetMonth: string;
  fieldTargetDate: string;
  fieldTags: string;
  fieldInspirationQuote: string;
  fieldInspirationLinks: string;
  fieldNotes: string;
  fieldCoverImage: string;

  fieldDestinationName: string;
  fieldDestinationCity: string;
  fieldDestinationCountry: string;
  fieldDestinationAirport: string;
  fieldOriginLocation: string;
  fieldOriginAirport: string;
  fieldBestSeason: string;
  fieldTravelBudget: string;
  fieldTravelStyle: string;
  fieldTripLength: string;
  fieldFlightWatch: string;

  saveQuick: string;
  saveDetailed: string;
  saveEdits: string;
  cancel: string;
  deleteDream: string;

  // Flight watch panel
  flightExploratoryMode: string;
  flightLiveMode: string;
  flightRefresh: string;
  flightCheapest: string;
  flightFastest: string;
  flightDirect: string;
  flightBookNow: string;
  flightLastChecked: (isoTime: string) => string;
  flightPriceDropped: string;
  flightNoData: string;
  flightProviderMock: string;
  flightProviderUnavailable: string;

  // Map
  mapTitle: string;
  mapBackToList: string;
  mapLegendTitle: string;
  mapLegendStatus: string;

  // Reflection
  reflectTitle: string;
  reflectDescription: string;
  reflectPrompt: string;
  reflectMoodLabel: string;
  reflectAddPhoto: string;
  reflectGenerateSummary: string;
  reflectSave: string;

  // Misc
  aiQuotaExhausted: string;
  aiGenericError: string;
};

export const BUCKET_LIST_UI_EN: BucketListUiCopy = {
  pageTitle: "Bucket List",
  pageDescription:
    "Curate, fund, and execute your most significant life experiences.",
  newDream: "New Dream",
  newDreamAria: "Capture a new dream",
  settingsAction: "Settings",
  clearSeedsAction: "Clear seed dreams",
  viewMap: "Travel map",

  statTotal: "Total Dreams",
  statCompleted: "Completed",
  statActive: "Active",
  statFunded: "Funded",
  statDreaming: "Dreaming",
  masterProgress: "Master Progress",

  closestToReality: "Closest to reality",
  pushThisWeek: "Push this week",
  latestCompletion: "Latest realized dream",
  travelDeal: "Best travel opportunity",
  noHighlight: "No active dreams yet",
  blockedOn: (stage) => `Blocked on: ${stage}`,
  percentFundedShort: (pct) => `${pct}% Funded`,
  monthsOut: (months) =>
    months <= 1 ? "under 1 month out" : `${months} months out`,

  allTypes: "All",
  filterTravel: "Travel",
  filterAchievement: "Achievement",
  filterGrowth: "Growth",
  filterRelationship: "Relationship",
  filterPurchase: "Purchase",
  filterLifestyle: "Lifestyle",
  showClosed: "Show closed dreams",
  hideClosed: "Hide closed dreams",
  searchPlaceholder: "Search dreams…",

  statusDreaming: "Dreaming",
  statusExploring: "Exploring",
  statusPlanning: "Planning",
  statusActive: "Active",
  statusFunded: "Funded",
  statusScheduled: "Scheduled",
  statusBooked: "Booked",
  statusCompleted: "Completed",
  statusPaused: "Paused",
  statusArchived: "Archived",

  priorityHigh: "High",
  priorityMedium: "Med",
  priorityLow: "Low",
  prioritySomeday: "Someday",
  difficultyEasy: "Easy",
  difficultyMed: "Med",
  difficultyHard: "Hard",
  difficultyEpic: "Epic",
  timeHorizonThisYear: "This year",
  timeHorizon13: "1–3 years",
  timeHorizon35: "3–5 years",
  timeHorizonLifetime: "Lifetime",

  emptyAllTitle: "Your bucket list is empty",
  emptyAllDescription:
    "Capture the first life-experience you want to make real. It doesn't need a plan yet.",
  emptyAllAction: "Add a dream",
  emptyFilteredTitle: "No dreams match these filters",
  emptyFilteredDescription:
    "Try clearing a filter or widening your time horizon.",

  detailWhyMatters: "Why this matters",
  detailActivate: "Activate this dream",
  detailActivateDescription:
    "Turn this dream into real execution steps. You pick what to connect.",
  detailLinkedProject: "Linked project",
  detailGenerateTasks: "Generate tasks",
  detailBudgetLinked: "Budget linked",
  detailTravelLogistics: "Travel logistics",
  detailFlightWatch: "Flight watch",
  detailAiDestinationBrief: "AI destination brief",
  detailAiTripPlan: "AI day-by-day plan",
  detailReframe: "Reframe into smaller versions",
  detailReflect: "Reflect & save memory",
  detailRealize: "Mark as realized",
  realizedDreamsHeader: "Realized dreams (memories)",
  upcomingHeader: "Upcoming & active",

  activateModalTitle: "Activate this dream",
  activateProjectOption: "Convert to Project",
  activateTaskOption: "Generate tasks",
  activateBudgetOption: "Create budget plan",
  activateSavingsOption: "Start savings goal",
  activateCalendarOption: "Add milestones to calendar",
  activateMapOption: "Add to travel map",
  activateFlightOption: "Enable flight watch",
  activateResearchOption: "Link research & resources",
  activateMemoryOption: "Prepare completion memory",
  activateApply: "Apply selected",

  addSheetTitle: "Capture a new dream",
  editSheetTitle: "Edit this dream",
  fieldTitle: "Title",
  fieldDescription: "Description",
  fieldWhyMatters: "Why it matters",
  fieldType: "Type",
  fieldStatus: "Status",
  fieldPriority: "Priority",
  fieldDifficulty: "Difficulty",
  fieldTimeHorizon: "Time horizon",
  fieldEstimatedCost: "Estimated cost",
  fieldCostBand: "Cost band",
  fieldTargetMonth: "Target month",
  fieldTargetDate: "Target date",
  fieldTags: "Tags",
  fieldInspirationQuote: "Inspiration quote (optional)",
  fieldInspirationLinks: "Links & references",
  fieldNotes: "Notes",
  fieldCoverImage: "Cover image URL",

  fieldDestinationName: "Destination",
  fieldDestinationCity: "City",
  fieldDestinationCountry: "Country",
  fieldDestinationAirport: "Destination airport",
  fieldOriginLocation: "Starting from",
  fieldOriginAirport: "Origin airport",
  fieldBestSeason: "Best season",
  fieldTravelBudget: "Travel budget",
  fieldTravelStyle: "Travel style",
  fieldTripLength: "Trip length (days)",
  fieldFlightWatch: "Watch flights",

  saveQuick: "Save dream",
  saveDetailed: "Save & open details",
  saveEdits: "Save changes",
  cancel: "Cancel",
  deleteDream: "Delete dream",

  flightExploratoryMode: "Exploratory price",
  flightLiveMode: "Live price",
  flightRefresh: "Refresh",
  flightCheapest: "Cheapest",
  flightFastest: "Fastest",
  flightDirect: "Direct",
  flightBookNow: "Book Now",
  flightLastChecked: (isoTime) => `Last checked ${isoTime}`,
  flightPriceDropped: "Price Dropped",
  flightNoData: "No flight data yet. Refresh to get an exploratory estimate.",
  flightProviderMock:
    "Using the built-in estimate provider — connect a real flight API later in settings.",
  flightProviderUnavailable:
    "Flight provider is not configured. Add a key in settings to enable live prices.",

  mapTitle: "Travel Journey",
  mapBackToList: "Back to list",
  mapLegendTitle: "Legend",
  mapLegendStatus: "Status",

  reflectTitle: "Reflect on this dream",
  reflectDescription:
    "A few words while it's fresh. We'll shape it into a memory.",
  reflectPrompt: "What stayed with you?",
  reflectMoodLabel: "Mood",
  reflectAddPhoto: "Add photo URL",
  reflectGenerateSummary: "Generate summary",
  reflectSave: "Save memory",

  aiQuotaExhausted:
    "Daily AI cap reached. Come back tomorrow or link a paid key.",
  aiGenericError: "AI request failed — try again in a moment.",
};

const BUCKET_LIST_UI_ZH_TW: Partial<BucketListUiCopy> = {
  pageTitle: "夢想清單",
  pageDescription: "策劃、資助、並實現你人生最重要的體驗。",
  newDream: "新增夢想",
  newDreamAria: "捕捉新的人生夢想",
  settingsAction: "設定",
  clearSeedsAction: "清除範例夢想",
  viewMap: "旅行地圖",
  masterProgress: "總進度",
  statTotal: "夢想總數",
  statCompleted: "已完成",
  statActive: "進行中",
  statFunded: "已集資",
  statDreaming: "做夢中",
  closestToReality: "最接近實現",
  pushThisWeek: "本週推進",
  latestCompletion: "最近實現的夢想",
  travelDeal: "最佳旅行時機",
  noHighlight: "尚無進行中的夢想",
  allTypes: "全部",
  filterTravel: "旅行",
  filterAchievement: "成就",
  filterGrowth: "成長",
  filterRelationship: "關係",
  filterPurchase: "購買",
  filterLifestyle: "生活",
  showClosed: "顯示已完成的夢想",
  hideClosed: "隱藏已完成的夢想",
  searchPlaceholder: "搜尋夢想…",
  emptyAllTitle: "你的夢想清單還是空白",
  emptyAllDescription: "寫下第一個你想實現的人生體驗。先不必有計畫。",
  emptyAllAction: "新增夢想",
  emptyFilteredTitle: "沒有符合條件的夢想",
  emptyFilteredDescription: "試著清除篩選或擴大時間範圍。",
  detailWhyMatters: "為什麼重要",
  detailActivate: "啟動這個夢想",
  detailActivateDescription: "把夢想變成具體的執行。你選擇要連結哪些模組。",
  detailLinkedProject: "連結的專案",
  detailGenerateTasks: "產生任務",
  detailBudgetLinked: "預算已連結",
  detailTravelLogistics: "旅行安排",
  detailFlightWatch: "機票觀察",
  detailAiDestinationBrief: "AI 目的地簡報",
  detailAiTripPlan: "AI 日程規劃",
  detailReframe: "重新拆解成小版本",
  detailReflect: "反思並保存為記憶",
  detailRealize: "標記為已實現",
  realizedDreamsHeader: "已實現的夢想（記憶）",
  upcomingHeader: "即將到來與進行中",
  activateModalTitle: "啟動這個夢想",
  activateApply: "套用所選",
  addSheetTitle: "捕捉新的夢想",
  editSheetTitle: "編輯這個夢想",
  saveQuick: "儲存夢想",
  saveDetailed: "儲存並開啟詳情",
  saveEdits: "儲存變更",
  cancel: "取消",
  deleteDream: "刪除夢想",
  flightRefresh: "重新整理",
  flightCheapest: "最便宜",
  flightFastest: "最快",
  flightDirect: "直飛",
  flightBookNow: "立即預訂",
  flightPriceDropped: "價格下跌",
  reflectSave: "儲存記憶",
  aiQuotaExhausted: "今日 AI 額度已用完，明天再試或接上付費金鑰。",
  aiGenericError: "AI 請求失敗，稍後再試。",
};

const BUCKET_LIST_UI_COPY_MAP = createLocaleCopyMap<BucketListUiCopy>(
  BUCKET_LIST_UI_EN,
  {
    "zh-TW": BUCKET_LIST_UI_ZH_TW,
    "zh-CN": BUCKET_LIST_UI_ZH_TW,
  },
);

export function getBucketListUiCopy(locale: AppLocale): BucketListUiCopy {
  return BUCKET_LIST_UI_COPY_MAP[locale] ?? BUCKET_LIST_UI_COPY_MAP[DEFAULT_LOCALE];
}
