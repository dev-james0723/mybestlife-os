import type { UiTheme } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { navCategoryTitle, navItemTitle } from "@/lib/i18n/nav-labels";

/**
 * Maps spec-level keys (snake_case from the design doc) to actual navigation
 * itemId / categoryId (kebab-case used in the codebase).
 */
const SPEC_TO_ITEM_ID: Record<string, string> = {
  daily_plan: "daily-planner",
  google_calendar: "google-calendar",
  language_learning: "japanese-study",
  inspiration: "ideas",
  career_management: "career",
  gratitude_journal: "grateful-things",
  diary: "journal",
  knowledge: "knowledge-base",
  weekly_review: "weekly-review",
  about_me: "about-me",
  ai_knowledge: "ai-knowledge",
  software_vault: "software-vault",
  role_models: "role-models",
  youtube_radar: "youtube-radar",
  business_analyst: "business-analyst",
  ai_assistant: "ai-assistant",
  quick_capture: "quick-capture",
};

type ThemeLabels = {
  categories: Record<string, { en: string; "zh-TW": string }>;
  items: Record<string, { en: string; "zh-TW": string }>;
};

const themeLabelsMap: Record<UiTheme, ThemeLabels> = {
  default: {
    categories: {
      commandCenter: { en: "Command Center", "zh-TW": "指揮中心" },
      self: { en: "Self", "zh-TW": "自我" },
      career: { en: "Career", "zh-TW": "職涯" },
      goalsExecution: { en: "Build & Execute", "zh-TW": "建設與執行" },
      knowledge: { en: "Knowledge", "zh-TW": "知識" },
      learning: { en: "Learning", "zh-TW": "學習" },
      relationship: { en: "People", "zh-TW": "人物" },
      resources: { en: "Resources", "zh-TW": "資源" },
    },
    items: {
      dashboard: { en: "Dashboard", "zh-TW": "儀表板" },
      "life-agent": { en: "Life Companion", "zh-TW": "人生夥伴" },
      "daily-planner": { en: "Daily Planner", "zh-TW": "每日規劃" },
      tasks: { en: "Tasks", "zh-TW": "任務" },
      "weekly-review": { en: "Weekly Review", "zh-TW": "每週回顧" },
      "google-calendar": { en: "Google Calendar", "zh-TW": "Google 日曆" },
      calendar: { en: "Calendar", "zh-TW": "行事曆" },
      analytics: { en: "Analytics", "zh-TW": "分析" },
      "about-me": { en: "About Me", "zh-TW": "關於我" },
      "grateful-things": { en: "Grateful Things", "zh-TW": "感恩日記" },
      "quote-library": { en: "Quote Library", "zh-TW": "語錄庫" },
      "bucket-list": { en: "Bucket List", "zh-TW": "夢想清單" },
      health: { en: "Health", "zh-TW": "健康" },
      habits: { en: "Habits & Routines", "zh-TW": "習慣與日常" },
      journal: { en: "Journal", "zh-TW": "日記" },
      career: { en: "Home Page", "zh-TW": "首頁" },
      "career-compass": { en: "Compass", "zh-TW": "指南針" },
      "career-profile": { en: "Profile", "zh-TW": "個人檔案" },
      "career-vault": { en: "Career Vault", "zh-TW": "職涯檔案庫" },
      "career-coach": { en: "AI Career Coach", "zh-TW": "AI 職涯教練" },
      "career-pipeline": { en: "Pipeline", "zh-TW": "職涯管道" },
      "career-timeline": { en: "Timeline", "zh-TW": "時間軸" },
      "career-network": { en: "Network", "zh-TW": "人脈網絡" },
      "career-journal": { en: "Journal", "zh-TW": "決策日誌" },
      "career-analytics": { en: "Analytics", "zh-TW": "分析" },
      goals: { en: "Goals", "zh-TW": "目標" },
      projects: { en: "Projects", "zh-TW": "專案" },
      notes: { en: "Notes", "zh-TW": "筆記" },
      "knowledge-base": { en: "Knowledge Base", "zh-TW": "知識庫" },
      "ai-knowledge": { en: "AI Knowledge", "zh-TW": "AI 知識" },
      "mind-council": { en: "Mind Council", "zh-TW": "智囊議會" },
      ideas: { en: "Idea Capture", "zh-TW": "靈感捕捉" },
      "japanese-study": { en: "Japanese Study", "zh-TW": "日語學習" },
      garden: { en: "My Garden", "zh-TW": "我的花園" },
      "quick-capture": { en: "Quick Capture", "zh-TW": "快速捕捉" },
      settings: { en: "Settings", "zh-TW": "設定" },
      finance: { en: "Finance", "zh-TW": "財務" },
      assets: { en: "Assets", "zh-TW": "資產" },
      documents: { en: "Documents", "zh-TW": "文件" },
      "software-vault": { en: "Software Vault", "zh-TW": "軟體庫" },
      relationship: { en: "Relationships", "zh-TW": "人際關係" },
      relationships: { en: "Relationships", "zh-TW": "人際關係" },
      "role-model": { en: "Role Model", "zh-TW": "榜樣" },
      "role-models": { en: "Role Models", "zh-TW": "榜樣" },
      "ai-assistant": { en: "AI Assistant", "zh-TW": "AI 助理" },
      "youtube-radar": { en: "YouTube Radar", "zh-TW": "YouTube 雷達" },
      "business-analyst": { en: "Business Analyst", "zh-TW": "商業分析" },
    },
  },
  astronaut: {
    categories: {
      commandCenter: { en: "Mission Control", "zh-TW": "任務控制" },
      self: { en: "Inner Cosmos", "zh-TW": "內心宇宙" },
      career: { en: "Career Orbit", "zh-TW": "職涯軌道" },
      goalsExecution: { en: "Launch Pad", "zh-TW": "發射台" },
      knowledge: { en: "Star Charts", "zh-TW": "星圖" },
      learning: { en: "Training Bay", "zh-TW": "訓練艙" },
      relationship: { en: "Crew Network", "zh-TW": "組員網路" },
      resources: { en: "Cargo Hold", "zh-TW": "貨艙" },
    },
    items: {
      dashboard: { en: "Bridge", "zh-TW": "艦橋" },
      "life-agent": { en: "Shipmate", "zh-TW": "同行夥伴" },
      "daily-planner": { en: "Flight Plan", "zh-TW": "飛行計劃" },
      tasks: { en: "Missions", "zh-TW": "任務" },
      "weekly-review": { en: "Debrief", "zh-TW": "任務簡報" },
      "google-calendar": { en: "Orbit Sync", "zh-TW": "軌道同步" },
      calendar: { en: "Star Atlas", "zh-TW": "星圖" },
      analytics: { en: "Telemetry", "zh-TW": "遙測數據" },
      "about-me": { en: "Crew Profile", "zh-TW": "太空員檔案" },
      "grateful-things": { en: "Starlight Log", "zh-TW": "星光日誌" },
      "quote-library": { en: "Star Compendium", "zh-TW": "星語典藏" },
      "bucket-list": { en: "Star Chart", "zh-TW": "夢想航圖" },
      health: { en: "Vitals", "zh-TW": "生命體徵" },
      habits: { en: "Protocols", "zh-TW": "標準程序" },
      journal: { en: "Captain's Log", "zh-TW": "艦長日誌" },
      career: { en: "Home Orbit", "zh-TW": "首頁軌道" },
      "career-compass": { en: "Compass", "zh-TW": "指南針" },
      "career-profile": { en: "Profile", "zh-TW": "個人檔案" },
      "career-vault": { en: "Mission Archive", "zh-TW": "任務檔案庫" },
      "career-coach": { en: "AI Flight Coach", "zh-TW": "AI 飛行教練" },
      "career-pipeline": { en: "Pipeline", "zh-TW": "職涯管道" },
      "career-timeline": { en: "Timeline", "zh-TW": "時間軸" },
      "career-network": { en: "Network", "zh-TW": "人脈網絡" },
      "career-journal": { en: "Journal", "zh-TW": "決策日誌" },
      "career-analytics": { en: "Analytics", "zh-TW": "分析" },
      goals: { en: "Objectives", "zh-TW": "目標" },
      projects: { en: "Expeditions", "zh-TW": "遠征" },
      notes: { en: "Transmissions", "zh-TW": "訊號紀錄" },
      "knowledge-base": { en: "Data Core", "zh-TW": "資料核心" },
      "ai-knowledge": { en: "AI Module", "zh-TW": "AI 模組" },
      "mind-council": { en: "Orbital Council", "zh-TW": "軌道議會" },
      ideas: { en: "Signal Capture", "zh-TW": "訊號捕捉" },
      "japanese-study": { en: "Language Drill", "zh-TW": "語言訓練" },
      garden: { en: "Bio Lab", "zh-TW": "生物實驗室" },
      "quick-capture": { en: "Quick Signal", "zh-TW": "快速訊號" },
      settings: { en: "Mission Parameters", "zh-TW": "任務參數" },
      finance: { en: "Supply Budget", "zh-TW": "物資預算" },
      assets: { en: "Equipment", "zh-TW": "裝備" },
      documents: { en: "Ship Manifests", "zh-TW": "艦艇清單" },
      "software-vault": { en: "Software Arsenal", "zh-TW": "軟體軍火庫" },
      relationship: { en: "Crewmates", "zh-TW": "組員" },
      relationships: { en: "Crewmates", "zh-TW": "組員" },
      "role-model": { en: "Legends", "zh-TW": "傳奇人物" },
      "role-models": { en: "Legends", "zh-TW": "傳奇人物" },
      "ai-assistant": { en: "Ship AI", "zh-TW": "艦載 AI" },
      "youtube-radar": { en: "Signal Radar", "zh-TW": "訊號雷達" },
      "business-analyst": { en: "Mission Analyst", "zh-TW": "任務分析" },
    },
  },
  academia: {
    categories: {
      commandCenter: { en: "Study Hall", "zh-TW": "書房" },
      self: { en: "Self-Reflection", "zh-TW": "自省" },
      career: { en: "Faculty", "zh-TW": "學術生涯" },
      goalsExecution: { en: "Thesis & Lab", "zh-TW": "論文與實驗" },
      knowledge: { en: "Library", "zh-TW": "圖書館" },
      learning: { en: "Seminar", "zh-TW": "研討會" },
      relationship: { en: "Colleagues", "zh-TW": "同僚" },
      resources: { en: "Holdings", "zh-TW": "館藏" },
    },
    items: {
      dashboard: { en: "Overview", "zh-TW": "總覽" },
      "life-agent": { en: "Study Fellow", "zh-TW": "學伴" },
      "daily-planner": { en: "Agenda", "zh-TW": "議程" },
      tasks: { en: "Assignments", "zh-TW": "作業" },
      "weekly-review": { en: "Reflection", "zh-TW": "反思" },
      "google-calendar": { en: "Lecture Calendar", "zh-TW": "課表" },
      calendar: { en: "Almanac", "zh-TW": "曆書" },
      analytics: { en: "Research Data", "zh-TW": "研究數據" },
      "about-me": { en: "Curriculum Vitae", "zh-TW": "學術簡歷" },
      "grateful-things": { en: "Gratitude Notes", "zh-TW": "感恩筆記" },
      "quote-library": { en: "Commonplace Book", "zh-TW": "格言錄" },
      "bucket-list": { en: "Life Ambitions", "zh-TW": "人生志業" },
      health: { en: "Wellness", "zh-TW": "身心健康" },
      habits: { en: "Disciplines", "zh-TW": "自律" },
      journal: { en: "Diary", "zh-TW": "日記" },
      career: { en: "Faculty Home", "zh-TW": "首頁" },
      "career-compass": { en: "Compass", "zh-TW": "指南針" },
      "career-profile": { en: "Profile", "zh-TW": "個人檔案" },
      "career-vault": { en: "Dossier Archive", "zh-TW": "學術檔案庫" },
      "career-coach": { en: "Faculty Mentor", "zh-TW": "學術導師" },
      "career-pipeline": { en: "Pipeline", "zh-TW": "職涯管道" },
      "career-timeline": { en: "Timeline", "zh-TW": "時間軸" },
      "career-network": { en: "Network", "zh-TW": "人脈網絡" },
      "career-journal": { en: "Journal", "zh-TW": "決策日誌" },
      "career-analytics": { en: "Analytics", "zh-TW": "分析" },
      goals: { en: "Milestones", "zh-TW": "里程碑" },
      projects: { en: "Research", "zh-TW": "研究" },
      notes: { en: "Manuscripts", "zh-TW": "手稿" },
      "knowledge-base": { en: "Archives", "zh-TW": "檔案庫" },
      "ai-knowledge": { en: "AI Papers", "zh-TW": "AI 論文" },
      "mind-council": { en: "Symposium", "zh-TW": "研討議會" },
      ideas: { en: "Hypothesis", "zh-TW": "假說" },
      "japanese-study": { en: "Language Lab", "zh-TW": "語言教室" },
      garden: { en: "Botanical Notes", "zh-TW": "植物筆記" },
      "quick-capture": { en: "Quick Note", "zh-TW": "快速筆記" },
      settings: { en: "Preferences", "zh-TW": "偏好設定" },
      finance: { en: "Ledger", "zh-TW": "帳本" },
      assets: { en: "Estate", "zh-TW": "財產" },
      documents: { en: "Papers", "zh-TW": "文書" },
      "software-vault": { en: "Instrumentarium", "zh-TW": "工具典藏" },
      relationship: { en: "Fellows", "zh-TW": "學友" },
      relationships: { en: "Fellows", "zh-TW": "學友" },
      "role-model": { en: "Mentors", "zh-TW": "導師" },
      "role-models": { en: "Mentors", "zh-TW": "導師" },
      "ai-assistant": { en: "Research Assistant", "zh-TW": "研究助理" },
      "youtube-radar": { en: "Media Watch", "zh-TW": "媒體觀察" },
      "business-analyst": { en: "Case Study", "zh-TW": "案例研究" },
    },
  },
  forest: {
    categories: {
      commandCenter: { en: "Clearing", "zh-TW": "林間空地" },
      self: { en: "Inner Grove", "zh-TW": "心靈樹林" },
      career: { en: "Trailhead", "zh-TW": "步道起點" },
      goalsExecution: { en: "Seedbed", "zh-TW": "苗床" },
      knowledge: { en: "Root System", "zh-TW": "根系" },
      learning: { en: "Canopy", "zh-TW": "樹冠層" },
      relationship: { en: "Fellow Growers", "zh-TW": "種植夥伴" },
      resources: { en: "Larder", "zh-TW": "儲藏室" },
    },
    items: {
      dashboard: { en: "Meadow", "zh-TW": "草地" },
      "life-agent": { en: "Trail Companion", "zh-TW": "林徑夥伴" },
      "daily-planner": { en: "Day Path", "zh-TW": "日徑" },
      tasks: { en: "Seeds", "zh-TW": "種子" },
      "weekly-review": { en: "Season Review", "zh-TW": "季節回顧" },
      "google-calendar": { en: "Sun Dial", "zh-TW": "日晷" },
      calendar: { en: "Seasons", "zh-TW": "四季" },
      analytics: { en: "Growth Rings", "zh-TW": "年輪" },
      "about-me": { en: "My Roots", "zh-TW": "我的根" },
      "grateful-things": { en: "Bloom Journal", "zh-TW": "花開日誌" },
      "quote-library": { en: "Seed Vault", "zh-TW": "種籽典藏" },
      "bucket-list": { en: "Dream Orchard", "zh-TW": "夢想果園" },
      health: { en: "Vitality", "zh-TW": "生命力" },
      habits: { en: "Rhythms", "zh-TW": "自然節律" },
      journal: { en: "Field Notes", "zh-TW": "田野筆記" },
      career: { en: "Base Camp", "zh-TW": "首頁" },
      "career-compass": { en: "Compass", "zh-TW": "指南針" },
      "career-profile": { en: "Profile", "zh-TW": "個人檔案" },
      "career-vault": { en: "Trail Archive", "zh-TW": "步道檔案庫" },
      "career-coach": { en: "Trail Mentor", "zh-TW": "步道導師" },
      "career-pipeline": { en: "Pipeline", "zh-TW": "職涯管道" },
      "career-timeline": { en: "Timeline", "zh-TW": "時間軸" },
      "career-network": { en: "Network", "zh-TW": "人脈網絡" },
      "career-journal": { en: "Journal", "zh-TW": "決策日誌" },
      "career-analytics": { en: "Analytics", "zh-TW": "分析" },
      goals: { en: "Saplings", "zh-TW": "幼苗" },
      projects: { en: "Groves", "zh-TW": "林地" },
      notes: { en: "Leaf Pages", "zh-TW": "葉片" },
      "knowledge-base": { en: "Soil Layers", "zh-TW": "土壤層" },
      "ai-knowledge": { en: "Mycelium", "zh-TW": "菌絲網路" },
      "mind-council": { en: "Council Glade", "zh-TW": "林間議場" },
      ideas: { en: "Pollen", "zh-TW": "花粉" },
      "japanese-study": { en: "Language Nest", "zh-TW": "語言巢" },
      garden: { en: "My Garden", "zh-TW": "我的花園" },
      "quick-capture": { en: "Quick Sprout", "zh-TW": "快速萌芽" },
      settings: { en: "Garden Settings", "zh-TW": "花園設定" },
      finance: { en: "Harvest Ledger", "zh-TW": "收穫帳本" },
      assets: { en: "Land & Tools", "zh-TW": "土地與工具" },
      documents: { en: "Pressed Leaves", "zh-TW": "壓花葉" },
      "software-vault": { en: "Tool Grotto", "zh-TW": "工具樹洞" },
      relationship: { en: "Companions", "zh-TW": "同行者" },
      relationships: { en: "Companions", "zh-TW": "同行者" },
      "role-model": { en: "Old Growth", "zh-TW": "古木" },
      "role-models": { en: "Old Growth", "zh-TW": "古木" },
      "ai-assistant": { en: "Forest Spirit", "zh-TW": "森林精靈" },
      "youtube-radar": { en: "Bird Watch", "zh-TW": "鳥類觀察" },
      "business-analyst": { en: "Soil Analysis", "zh-TW": "土壤分析" },
    },
  },
};

function resolveItemId(key: string): string {
  return SPEC_TO_ITEM_ID[key] ?? key;
}

/** Resolve locale to one of the themed label keys (en or zh-TW). */
function resolveThemedLocale(locale: AppLocale): "en" | "zh-TW" | null {
  if (locale === "en") return "en";
  if (locale === "zh-TW" || locale === "zh-CN") return "zh-TW";
  return null;
}

/**
 * Full-locale themed overrides for specific items. These take precedence over
 * the en/zh-TW table above and over the generic nav-labels fallback.
 *
 * Use this for items where every theme has a distinctive name that should be
 * preserved across all supported locales (not just en/zh-TW). Currently used
 * for the Crew Network sub-items so that the original default-theme
 * Relationships / Role Model wording only appears in the default theme.
 */
type AllLocaleLabel = Record<AppLocale, string>;

const FULL_LOCALE_ITEM_OVERRIDES: Partial<
  Record<UiTheme, Record<string, AllLocaleLabel>>
> = {
  astronaut: {
    relationship: {
      en: "Crewmates",
      "zh-TW": "組員",
      "zh-CN": "组员",
      ja: "クルー",
      ko: "크루",
      fr: "Équipage",
      it: "Equipaggio",
      es: "Tripulación",
      vi: "Phi hành đoàn",
    },
    "role-model": {
      en: "Legends",
      "zh-TW": "傳奇人物",
      "zh-CN": "传奇人物",
      ja: "レジェンド",
      ko: "레전드",
      fr: "Légendes",
      it: "Leggende",
      es: "Leyendas",
      vi: "Huyền thoại",
    },
  },
  academia: {
    relationship: {
      en: "Fellows",
      "zh-TW": "學友",
      "zh-CN": "学友",
      ja: "学友",
      ko: "학우",
      fr: "Confrères",
      it: "Confratelli",
      es: "Compañeros",
      vi: "Bạn học",
    },
    "role-model": {
      en: "Mentors",
      "zh-TW": "導師",
      "zh-CN": "导师",
      ja: "メンター",
      ko: "멘토",
      fr: "Mentors",
      it: "Mentori",
      es: "Mentores",
      vi: "Người cố vấn",
    },
  },
  forest: {
    relationship: {
      en: "Companions",
      "zh-TW": "同行者",
      "zh-CN": "同行者",
      ja: "同行者",
      ko: "동행자",
      fr: "Compagnons",
      it: "Compagni",
      es: "Compañeros",
      vi: "Bạn đồng hành",
    },
    "role-model": {
      en: "Old Growth",
      "zh-TW": "古木",
      "zh-CN": "古木",
      ja: "古木",
      ko: "거목",
      fr: "Anciens",
      it: "Antichi",
      es: "Ancianos",
      vi: "Cổ thụ",
    },
  },
};

/** Aliased itemIds that should share the same override (e.g. plural form). */
const ITEM_ALIASES: Record<string, string> = {
  relationships: "relationship",
  "role-models": "role-model",
};

/**
 * Themed page descriptions used by container shells (e.g. RelationshipShell).
 * Keep separate from the categories table because descriptions are a free-form
 * sentence rather than a single label, and we deliberately want the original
 * wording (e.g. "People" / "Role Model") to appear ONLY in the default
 * theme. For non-default themes we provide a per-locale themed sentence so
 * the page never falls back to default copy.
 */
const THEMED_CATEGORY_DESCRIPTIONS: Partial<
  Record<UiTheme, Record<string, AllLocaleLabel>>
> = {
  astronaut: {
    relationship: {
      en: "Your crew across the stars — those you fly missions with, learn from, and look up to.",
      "zh-TW": "你橫跨星海的組員 —— 一同執行任務、學習與敬仰的同伴。",
      "zh-CN": "你横跨星海的组员 —— 一同执行任务、学习与敬仰的同伴。",
      ja: "星々を渡るあなたのクルー —— 共に任務を遂行し、学び、敬う仲間たち。",
      ko: "별을 가로지르는 당신의 크루 —— 함께 임무를 수행하고, 배우고, 존경하는 동료들.",
      fr: "Votre équipage parmi les étoiles — ceux avec qui vous menez des missions, apprenez et que vous admirez.",
      it: "Il tuo equipaggio tra le stelle — coloro con cui affronti missioni, da cui impari e che ammiri.",
      es: "Tu tripulación entre las estrellas — aquellos con quienes vuelas misiones, aprendes y a quienes admiras.",
      vi: "Phi hành đoàn của bạn giữa các vì sao — những người cùng bạn thực hiện nhiệm vụ, học hỏi và ngưỡng mộ.",
    },
  },
  academia: {
    relationship: {
      en: "The scholars who shape your inquiry — those you study alongside, learn from, and emulate.",
      "zh-TW": "塑造你學思的學人 —— 與你同窗、向你授業、令你景仰的師友。",
      "zh-CN": "塑造你学思的学人 —— 与你同窗、向你授业、令你景仰的师友。",
      ja: "あなたの探究をかたちづくる学徒たち —— 共に学び、教えを請い、範とする面々。",
      ko: "당신의 탐구를 빚어가는 학인들 —— 함께 공부하고, 가르침을 받고, 본받는 이들.",
      fr: "Les esprits qui façonnent votre recherche — ceux avec qui vous étudiez, apprenez et que vous prenez pour exemple.",
      it: "Gli studiosi che plasmano la tua ricerca — coloro con cui studi, da cui impari e che prendi a modello.",
      es: "Los estudiosos que dan forma a tu indagación — aquellos con quienes estudias, aprendes y a quienes emulas.",
      vi: "Những học giả định hình hành trình tri thức của bạn — người bạn cùng học, thọ giáo và noi theo.",
    },
  },
  forest: {
    relationship: {
      en: "The forest you grow within — fellow growers who share your soil, sunlight, and the elders rooted before you.",
      "zh-TW": "你成長所在的這片森林 —— 共享土壤陽光的種植夥伴，以及先你紮根的古木前輩。",
      "zh-CN": "你成长所在的这片森林 —— 共享土壤阳光的种植伙伴，以及先你扎根的古木前辈。",
      ja: "あなたが育つ森 —— 同じ土と光を分かち合う仲間たち、そして先に根を下ろした古木たち。",
      ko: "당신이 자라는 숲 —— 같은 흙과 햇빛을 나누는 동행자, 그리고 먼저 뿌리내린 거목들.",
      fr: "La forêt dans laquelle vous grandissez — ceux qui partagent votre sol, votre lumière, et les anciens enracinés avant vous.",
      it: "La foresta in cui cresci — coloro che condividono il tuo suolo e la tua luce, e gli antichi radicati prima di te.",
      es: "El bosque en el que creces — quienes comparten tu suelo y tu luz, y los ancianos enraizados antes que tú.",
      vi: "Khu rừng nơi bạn lớn lên — những bạn đồng hành chia sẻ đất và ánh nắng, cùng các cổ thụ đã bén rễ trước bạn.",
    },
  },
};

/**
 * Get a themed label for a navigation category.
 * Uses the user's language to pick en/zh-TW themed label.
 * Falls back to nav-labels.ts for unsupported locales (ja, ko, fr, etc.).
 */
export function getThemedCategoryLabel(
  categoryId: string,
  uiTheme: UiTheme,
  locale: AppLocale
): string {
  const themedLocale = resolveThemedLocale(locale);
  if (!themedLocale) return navCategoryTitle(categoryId, locale);

  const labels = themeLabelsMap[uiTheme]?.categories[categoryId];
  if (!labels) return navCategoryTitle(categoryId, locale);

  return labels[themedLocale];
}

/**
 * Get a themed label for a navigation item.
 * Uses the user's language to pick en/zh-TW themed label.
 * Falls back to nav-labels.ts for unsupported locales (ja, ko, fr, etc.).
 */
/**
 * Get a themed page description for a navigation category.
 * Returns null when the theme has no override (caller should then use its
 * own default copy — typically the locale-aware string from a *-ui.ts file).
 */
export function getThemedCategoryDescription(
  categoryId: string,
  uiTheme: UiTheme,
  locale: AppLocale
): string | null {
  const labels = THEMED_CATEGORY_DESCRIPTIONS[uiTheme]?.[categoryId];
  if (!labels) return null;
  return labels[locale];
}

export function getThemedItemLabel(
  itemId: string,
  uiTheme: UiTheme,
  locale: AppLocale
): string {
  const resolved = resolveItemId(itemId);

  // 1. Full-locale theme override takes precedence so themed terms (e.g.
  //    Crewmates / Legends) survive across all supported locales.
  const overrideKey = ITEM_ALIASES[resolved] ?? resolved;
  const override = FULL_LOCALE_ITEM_OVERRIDES[uiTheme]?.[overrideKey];
  if (override) return override[locale];

  // 2. Standard en/zh-TW themed table.
  const themedLocale = resolveThemedLocale(locale);
  if (!themedLocale) return navItemTitle(resolved, locale);

  const labels = themeLabelsMap[uiTheme]?.items[resolved];
  if (!labels) return navItemTitle(resolved, locale);

  return labels[themedLocale];
}
