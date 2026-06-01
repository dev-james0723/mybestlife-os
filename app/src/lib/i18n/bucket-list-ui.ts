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

  // AI dream capture wizard
  aiNewDream: string;
  aiNewDreamAria: string;
  addManually: string;
  aiWizardTitle: string;
  aiWizardDescription: string;
  aiDisclaimer: string;
  aiInputTextLabel: string;
  aiInputTextPlaceholder: string;
  aiInputImageLabel: string;
  aiInputImageHint: string;
  aiInputImageChange: string;
  aiInputImageRemove: string;
  aiExamplesLabel: string;
  aiExtractButton: string;
  aiExtractingTitle: string;
  aiExtractingSubtitle: string;
  aiReviewTitle: string;
  aiReviewSubtitle: string;
  aiConfidenceHigh: string;
  aiConfidenceMedium: string;
  aiConfidenceLow: string;
  aiConfidenceMissing: string;
  aiAiDrafted: string;
  aiClarifyTitle: string;
  aiQuestionWhen: string;
  aiQuestionBudget: string;
  aiQuestionWhy: string;
  aiQuestionCost: string;
  aiQuestionDestination: string;
  aiSaveDream: string;
  aiStartOver: string;
  aiSavedTitle: string;
  aiSavedSubtitle: string;
  aiSuggestionsLabel: string;
  aiNextOpenDetails: string;
  aiNextActivate: string;
  aiNextViewMap: string;
  aiNextAddAnother: string;
  aiNextDone: string;
  aiImageTooLarge: string;
  aiInvalidImage: string;
  aiNeedsInput: string;

  // Dream visuals / images (Phase 2)
  visualsTab: string;
  visualsAiBadge: string;
  visualsEditGallery: string;
  visualsCoverHeading: string;
  visualsGalleryHeading: string;
  visualsGalleryEmpty: string;
  visualsEmptyTitle: string;
  visualsEmptyDescription: string;
  visualsGenerate: string;
  visualsGenerating: string;
  visualsUpload: string;
  visualsUploadCover: string;
  visualsUploading: string;
  visualsUsingCatalog: string;
  visualsRevertCatalog: string;
  visualsStyleLabel: string;
  styleRealisticTravel: string;
  styleCinematic: string;
  styleDreamy: string;
  styleMinimalEditorial: string;
  styleLuxuryMagazine: string;
  visualsSetCover: string;
  visualsIsCover: string;
  visualsRemove: string;
  visualsAddCaption: string;
  visualsCaptionPlaceholder: string;
  visualsCaptionSave: string;
  visualsAnalyze: string;
  visualsImageTooLarge: string;
  visualsAnalysisTitle: string;
  visualsAnalysisCaption: string;
  visualsAnalysisHints: string;
  visualsAnalysisApplyCaption: string;
  visualsAnalysisSuggestedUpdates: string;
  visualsAnalysisApplyUpdates: string;
  visualsAnalysisUnverified: string;
  visualsAnalysisClose: string;

  // Dream Intelligence Hub (Phase 3)
  intelTab: string;
  intelGenerate: string;
  intelGenerateTitle: string;
  intelGenerating: string;
  intelRefresh: string;
  intelIntro: string;
  intelDisclaimer: string;
  readinessHeading: string;
  readinessEmotionalClear: string;
  readinessEmotionalForming: string;
  readinessLogisticsPlanned: string;
  readinessLogisticsUnderplanned: string;
  readinessMissing: string;
  whyMattersDeeplyHeading: string;
  identityChapterHeading: string;
  emotionalMeaningHeading: string;
  whyNowHeading: string;
  blockersHeading: string;
  blockersNone: string;
  blockerSuggested: string;
  blockerMoney: string;
  blockerTime: string;
  blockerClarity: string;
  blockerCourage: string;
  blockerLogistics: string;
  blockerRelationship: string;
  blockerHealth: string;
  blockerOther: string;
  smallestHeading: string;
  smallestCost: string;
  smallestTime: string;
  nextStepHeading: string;
  nextStepStart: string;
  actionConfirmNote: string;
  connectionsHeading: string;
  connectionsConnectBtn: string;
  connectionsSuggested: string;
  connectionsLinkedCount: (count: number) => string;
  connProjects: string;
  connTasks: string;
  connGoals: string;
  connRelationships: string;
  connAssets: string;
  connNotes: string;
  suggestedActionsHeading: string;

  // Dream Activation Engine (Phase 4)
  activateEngineTitle: string;
  activateEngineDescription: string;
  activateModeHeading: string;
  modeGentle: string;
  modePractical: string;
  modeAmbitious: string;
  modeMinimal: string;
  modeGentleDesc: string;
  modePracticalDesc: string;
  modeAmbitiousDesc: string;
  modeMinimalDesc: string;
  activateGenerate: string;
  activateGenerating: string;
  activateReviewNote: string;
  activateSelectAll: string;
  activateSelectNone: string;
  groupProject: string;
  groupTasks: string;
  groupSavings: string;
  groupCalendar: string;
  groupNotes: string;
  groupKnowledge: string;
  activateAdvanceStatus: (from: string, to: string) => string;
  activateNoSilentNote: string;
  activateBack: string;
  activateCreating: string;
  activateCreateSelected: string;
  activateResultTitle: string;
  activateResultSummary: (count: number) => string;
  activateResultView: string;
  checklistHeading: string;
  checkFirstAction: string;
  checkResearch: string;
  checkBudget: string;
  checkSchedule: string;
  checkPeople: string;
  checkSupplies: string;
  checkBooking: string;
  checkReflection: string;

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

  aiNewDream: "Add Dream with AI",
  aiNewDreamAria: "Capture a new dream with AI",
  addManually: "Add manually",
  aiWizardTitle: "Capture a dream with AI",
  aiWizardDescription:
    "Tell me a dream, paste a messy idea, or upload inspiration — I'll draft the details for you to review.",
  aiDisclaimer: "AI drafts are suggestions. Review and edit before saving.",
  aiInputTextLabel: "Describe your dream",
  aiInputTextPlaceholder:
    "e.g. I want to see the Northern Lights in Iceland",
  aiInputImageLabel: "Or upload inspiration",
  aiInputImageHint: "A photo, screenshot, or travel/article image (max 8MB)",
  aiInputImageChange: "Change image",
  aiInputImageRemove: "Remove",
  aiExamplesLabel: "Need a spark? Try one:",
  aiExtractButton: "Draft with AI",
  aiExtractingTitle: "Reading your dream…",
  aiExtractingSubtitle: "Extracting the details. This takes a few seconds.",
  aiReviewTitle: "Review your dream",
  aiReviewSubtitle:
    "Edit anything before saving. Nothing is saved until you confirm.",
  aiConfidenceHigh: "High confidence",
  aiConfidenceMedium: "Medium confidence",
  aiConfidenceLow: "Low confidence",
  aiConfidenceMissing: "Needs review",
  aiAiDrafted: "AI drafted",
  aiClarifyTitle: "A few quick questions",
  aiQuestionWhen: "When do you imagine this happening?",
  aiQuestionBudget: "Is this a budget, mid-range, premium, or luxury version?",
  aiQuestionWhy: "What would make the smallest version feel real?",
  aiQuestionCost: "Roughly how much might this cost?",
  aiQuestionDestination: "Where would this take place?",
  aiSaveDream: "Save dream",
  aiStartOver: "Start over",
  aiSavedTitle: "Dream saved",
  aiSavedSubtitle: "What would you like to do next?",
  aiSuggestionsLabel: "AI suggestions",
  aiNextOpenDetails: "Open dream details",
  aiNextActivate: "Activate into projects & tasks",
  aiNextViewMap: "View on travel map",
  aiNextAddAnother: "Capture another dream",
  aiNextDone: "Done",
  aiImageTooLarge: "That image is too large (max 8MB).",
  aiInvalidImage: "Please choose an image file.",
  aiNeedsInput: "Add a dream or upload an image first.",

  visualsTab: "Visuals",
  visualsAiBadge: "AI-generated visual",
  visualsEditGallery: "Cover & gallery",
  visualsCoverHeading: "Cover image",
  visualsGalleryHeading: "Inspiration gallery",
  visualsGalleryEmpty: "No inspiration images yet. Upload a few to make this dream vivid.",
  visualsEmptyTitle: "No visual yet",
  visualsEmptyDescription:
    "Add a realistic cover so this dream feels real on your board.",
  visualsGenerate: "Generate a visual",
  visualsGenerating: "Generating…",
  visualsUpload: "Upload image",
  visualsUploadCover: "Upload cover",
  visualsUploading: "Uploading…",
  visualsUsingCatalog: "Using auto catalog image",
  visualsRevertCatalog: "Revert to auto image",
  visualsStyleLabel: "Style",
  styleRealisticTravel: "Realistic travel",
  styleCinematic: "Cinematic",
  styleDreamy: "Dreamy",
  styleMinimalEditorial: "Minimal editorial",
  styleLuxuryMagazine: "Luxury magazine",
  visualsSetCover: "Set as cover",
  visualsIsCover: "Cover",
  visualsRemove: "Remove",
  visualsAddCaption: "Add caption",
  visualsCaptionPlaceholder: "Add a caption…",
  visualsCaptionSave: "Save caption",
  visualsAnalyze: "Analyze with AI",
  visualsImageTooLarge: "That image is too large (max 10MB).",
  visualsAnalysisTitle: "AI image analysis",
  visualsAnalysisCaption: "Suggested caption",
  visualsAnalysisHints: "What the AI sees",
  visualsAnalysisApplyCaption: "Use this caption",
  visualsAnalysisSuggestedUpdates: "Suggested dream updates",
  visualsAnalysisApplyUpdates: "Apply to dream",
  visualsAnalysisUnverified: "AI interpretation — review before applying.",
  visualsAnalysisClose: "Close",

  intelTab: "Intelligence",
  intelGenerate: "Analyze this dream",
  intelGenerateTitle: "Understand this dream",
  intelGenerating: "Analyzing…",
  intelRefresh: "Re-analyze",
  intelIntro:
    "Get an AI read on why this matters, what's quietly blocking it, the smallest version you could live soon, and your next step.",
  intelDisclaimer:
    "AI reflection based on what you've written — hold it next to your own judgment.",
  readinessHeading: "Dream readiness",
  readinessEmotionalClear: "emotionally clear",
  readinessEmotionalForming: "emotionally still forming",
  readinessLogisticsPlanned: "logistically planned",
  readinessLogisticsUnderplanned: "logistically underplanned",
  readinessMissing: "Still missing",
  whyMattersDeeplyHeading: "Why this matters",
  identityChapterHeading: "Life chapter",
  emotionalMeaningHeading: "What it means",
  whyNowHeading: "Why this may matter now",
  blockersHeading: "What's in the way",
  blockersNone:
    "This dream doesn't seem blocked by desire — it's waiting for a first step.",
  blockerSuggested: "Try",
  blockerMoney: "Money",
  blockerTime: "Time",
  blockerClarity: "Clarity",
  blockerCourage: "Courage",
  blockerLogistics: "Logistics",
  blockerRelationship: "Relationship",
  blockerHealth: "Energy",
  blockerOther: "Other",
  smallestHeading: "Smallest version you can live soon",
  smallestCost: "Cost",
  smallestTime: "Time",
  nextStepHeading: "Next best step",
  nextStepStart: "Start this step",
  actionConfirmNote: "Opens a confirm-first flow — nothing is created automatically.",
  connectionsHeading: "What to connect",
  connectionsConnectBtn: "Connect this dream",
  connectionsSuggested: "Suggested connections",
  connectionsLinkedCount: (count) =>
    count === 0
      ? "Nothing connected yet."
      : count === 1
        ? "1 thing connected."
        : `${count} things connected.`,
  connProjects: "Projects",
  connTasks: "Tasks",
  connGoals: "Goals",
  connRelationships: "People",
  connAssets: "Assets",
  connNotes: "Notes",
  suggestedActionsHeading: "Suggested next moves",

  activateEngineTitle: "Activate This Dream",
  activateEngineDescription:
    "Turn this dream into real structures — you review and confirm before anything is created.",
  activateModeHeading: "How do you want to activate this?",
  modeGentle: "Gentle",
  modePractical: "Practical",
  modeAmbitious: "Ambitious",
  modeMinimal: "Minimal",
  modeGentleDesc: "Small steps, low pressure.",
  modePracticalDesc: "Concrete planning, tasks, logistics.",
  modeAmbitiousDesc: "A fuller project plan and timeline.",
  modeMinimalDesc: "One tiny next action only.",
  activateGenerate: "Build activation plan",
  activateGenerating: "Building plan…",
  activateReviewNote: "Pick what to create. Nothing is written until you confirm.",
  activateSelectAll: "Select all",
  activateSelectNone: "Select none",
  groupProject: "Project",
  groupTasks: "Tasks",
  groupSavings: "Savings",
  groupCalendar: "Calendar",
  groupNotes: "Notes",
  groupKnowledge: "Resources",
  activateAdvanceStatus: (from, to) => `Advance status: ${from} → ${to}`,
  activateNoSilentNote: "Only the items you select will be created.",
  activateBack: "Back",
  activateCreating: "Creating…",
  activateCreateSelected: "Create selected",
  activateResultTitle: "Dream activated",
  activateResultSummary: (count) =>
    count === 1 ? "Created 1 item." : `Created ${count} items.`,
  activateResultView: "View dream",
  checklistHeading: "Activation checklist",
  checkFirstAction: "First action",
  checkResearch: "Research",
  checkBudget: "Budget",
  checkSchedule: "Schedule",
  checkPeople: "People involved",
  checkSupplies: "Supplies / resources",
  checkBooking: "Booking / logistics",
  checkReflection: "Reflection checkpoint",

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
  aiNewDream: "用 AI 新增夢想",
  aiNewDreamAria: "用 AI 捕捉新的夢想",
  addManually: "手動新增",
  aiWizardTitle: "用 AI 捕捉夢想",
  aiWizardDescription:
    "說出一個夢想、貼上零散的想法，或上傳靈感圖片——我會替你草擬細節讓你檢視。",
  aiDisclaimer: "AI 草稿只是建議，儲存前請檢視與修改。",
  aiInputTextLabel: "描述你的夢想",
  aiInputTextPlaceholder: "例如：我想在冰島看極光",
  aiInputImageLabel: "或上傳靈感圖片",
  aiInputImageHint: "照片、截圖或旅遊／文章圖片（最大 8MB）",
  aiInputImageChange: "更換圖片",
  aiInputImageRemove: "移除",
  aiExamplesLabel: "需要靈感？試試看：",
  aiExtractButton: "用 AI 草擬",
  aiExtractingTitle: "正在解讀你的夢想…",
  aiExtractingSubtitle: "正在擷取細節，需要幾秒鐘。",
  aiReviewTitle: "檢視你的夢想",
  aiReviewSubtitle: "儲存前可以修改任何欄位。在你確認前不會儲存。",
  aiConfidenceHigh: "高信心",
  aiConfidenceMedium: "中等信心",
  aiConfidenceLow: "低信心",
  aiConfidenceMissing: "需要檢視",
  aiAiDrafted: "AI 草擬",
  aiClarifyTitle: "幾個小問題",
  aiQuestionWhen: "你想像這會在什麼時候發生？",
  aiQuestionBudget: "這是經濟、中階、高階還是豪華版本？",
  aiQuestionWhy: "怎樣的最小版本會讓它感覺真實？",
  aiQuestionCost: "大約需要多少花費？",
  aiQuestionDestination: "這會在哪裡發生？",
  aiSaveDream: "儲存夢想",
  aiStartOver: "重新開始",
  aiSavedTitle: "夢想已儲存",
  aiSavedSubtitle: "接下來想做什麼？",
  aiSuggestionsLabel: "AI 建議",
  aiNextOpenDetails: "開啟夢想詳情",
  aiNextActivate: "啟動為專案與任務",
  aiNextViewMap: "在旅行地圖上檢視",
  aiNextAddAnother: "再捕捉一個夢想",
  aiNextDone: "完成",
  aiImageTooLarge: "圖片太大（最大 8MB）。",
  aiInvalidImage: "請選擇圖片檔案。",
  aiNeedsInput: "請先輸入夢想或上傳圖片。",
  visualsTab: "視覺",
  visualsAiBadge: "AI 生成圖像",
  visualsEditGallery: "封面與圖庫",
  visualsCoverHeading: "封面圖片",
  visualsGalleryHeading: "靈感圖庫",
  visualsGalleryEmpty: "還沒有靈感圖片。上傳幾張讓這個夢想更鮮明。",
  visualsEmptyTitle: "尚無視覺",
  visualsEmptyDescription: "加上真實的封面，讓這個夢想在你的清單上更真實。",
  visualsGenerate: "生成視覺",
  visualsGenerating: "生成中…",
  visualsUpload: "上傳圖片",
  visualsUploadCover: "上傳封面",
  visualsUploading: "上傳中…",
  visualsUsingCatalog: "使用自動圖庫圖片",
  visualsRevertCatalog: "還原為自動圖片",
  visualsStyleLabel: "風格",
  styleRealisticTravel: "寫實旅行",
  styleCinematic: "電影感",
  styleDreamy: "夢幻",
  styleMinimalEditorial: "極簡編輯",
  styleLuxuryMagazine: "奢華雜誌",
  visualsSetCover: "設為封面",
  visualsIsCover: "封面",
  visualsRemove: "移除",
  visualsAddCaption: "加入說明",
  visualsCaptionPlaceholder: "加入說明…",
  visualsCaptionSave: "儲存說明",
  visualsAnalyze: "用 AI 分析",
  visualsImageTooLarge: "圖片太大（最大 10MB）。",
  visualsAnalysisTitle: "AI 圖像分析",
  visualsAnalysisCaption: "建議說明",
  visualsAnalysisHints: "AI 看到的內容",
  visualsAnalysisApplyCaption: "使用此說明",
  visualsAnalysisSuggestedUpdates: "建議的夢想更新",
  visualsAnalysisApplyUpdates: "套用到夢想",
  visualsAnalysisUnverified: "AI 詮釋——套用前請檢視。",
  visualsAnalysisClose: "關閉",
  intelTab: "洞察",
  intelGenerate: "分析這個夢想",
  intelGenerateTitle: "理解這個夢想",
  intelGenerating: "分析中…",
  intelRefresh: "重新分析",
  intelIntro:
    "讓 AI 解讀這個夢想為何重要、是什麼悄悄擋住它、你能很快實現的最小版本，以及下一步。",
  intelDisclaimer: "AI 根據你所寫的內容反思——請與你自己的判斷並陳。",
  readinessHeading: "夢想就緒度",
  readinessEmotionalClear: "情感清晰",
  readinessEmotionalForming: "情感仍在成形",
  readinessLogisticsPlanned: "規劃完善",
  readinessLogisticsUnderplanned: "規劃不足",
  readinessMissing: "仍缺少",
  whyMattersDeeplyHeading: "為什麼重要",
  identityChapterHeading: "人生章節",
  emotionalMeaningHeading: "它的意義",
  whyNowHeading: "為什麼此刻重要",
  blockersHeading: "阻礙是什麼",
  blockersNone: "這個夢想似乎不是被渴望所阻——它在等待第一步。",
  blockerSuggested: "試試",
  blockerMoney: "金錢",
  blockerTime: "時間",
  blockerClarity: "清晰度",
  blockerCourage: "勇氣",
  blockerLogistics: "後勤",
  blockerRelationship: "關係",
  blockerHealth: "精力",
  blockerOther: "其他",
  smallestHeading: "你能很快實現的最小版本",
  smallestCost: "花費",
  smallestTime: "時間",
  nextStepHeading: "下一個最佳步驟",
  nextStepStart: "開始這一步",
  actionConfirmNote: "開啟需確認的流程——不會自動建立任何東西。",
  connectionsHeading: "要連結什麼",
  connectionsConnectBtn: "連結這個夢想",
  connectionsSuggested: "建議的連結",
  connectionsLinkedCount: (count) =>
    count === 0 ? "尚未連結任何東西。" : `已連結 ${count} 項。`,
  connProjects: "專案",
  connTasks: "任務",
  connGoals: "目標",
  connRelationships: "人物",
  connAssets: "資產",
  connNotes: "筆記",
  suggestedActionsHeading: "建議的下一步",
  activateEngineTitle: "啟動這個夢想",
  activateEngineDescription: "把夢想變成真實的結構——在建立任何東西前，你都會先檢視並確認。",
  activateModeHeading: "你想怎麼啟動？",
  modeGentle: "溫和",
  modePractical: "務實",
  modeAmbitious: "進取",
  modeMinimal: "極簡",
  modeGentleDesc: "小步驟，低壓力。",
  modePracticalDesc: "具體規劃、任務、後勤。",
  modeAmbitiousDesc: "更完整的專案計畫與時間軸。",
  modeMinimalDesc: "只有一個微小的下一步。",
  activateGenerate: "建立啟動計畫",
  activateGenerating: "建立計畫中…",
  activateReviewNote: "選擇要建立的項目。在你確認前不會寫入任何東西。",
  activateSelectAll: "全選",
  activateSelectNone: "全不選",
  groupProject: "專案",
  groupTasks: "任務",
  groupSavings: "儲蓄",
  groupCalendar: "行事曆",
  groupNotes: "筆記",
  groupKnowledge: "資源",
  activateAdvanceStatus: (from, to) => `推進狀態：${from} → ${to}`,
  activateNoSilentNote: "只會建立你所選的項目。",
  activateBack: "返回",
  activateCreating: "建立中…",
  activateCreateSelected: "建立所選",
  activateResultTitle: "夢想已啟動",
  activateResultSummary: (count) => `已建立 ${count} 個項目。`,
  activateResultView: "查看夢想",
  checklistHeading: "啟動檢查清單",
  checkFirstAction: "第一步行動",
  checkResearch: "研究",
  checkBudget: "預算",
  checkSchedule: "排程",
  checkPeople: "相關的人",
  checkSupplies: "用品／資源",
  checkBooking: "預訂／後勤",
  checkReflection: "反思檢查點",
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
