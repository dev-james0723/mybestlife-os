import type { UiTheme } from "@/types/database";
import type { AppLocale } from "./app-locale";
import type {
  VaultSetupDifficulty,
  VaultStackIndustrySlug,
} from "@/lib/vault/software-library-schema";
import type { VaultBuildStackCopy } from "./vault-build-stack-ui";
import { getVaultBuildStackCopy } from "./vault-build-stack-ui";
import { getVaultIndustryLabels } from "./vault-industry-i18n";
import type { VaultCompareCopy, VaultInsightsCopy } from "./vault-phase4-ui";
import { getVaultPhase4Copy } from "./vault-phase4-ui";

/**
 * Full i18n manifest for the Software Vault feature across the 9 supported
 * locales. Per-theme vault metaphor labels live under `themeChrome`; theme-
 * agnostic strings live under `gallery`, `add`, `detail`, and `fields`.
 *
 * For `zh-TW`, we use Hong Kong Traditional idiom (not Taiwan style).
 */
export type VaultUiCopy = {
  nav: Record<UiTheme, string>;
  gate: {
    /** Per-theme prompt + CTA when the vault is locked. */
    prompts: Record<UiTheme, { prompt: string; cta: string }>;
    skipLink: string;
    unlocking: string;
    unlockedAnnouncement: string;
    reducedMotionNote: string;
    mute: string;
    unmute: string;
  };
  gallery: {
    title: Record<UiTheme, string>;
    description: Record<UiTheme, string>;
    addBtn: Record<UiTheme, string>;
    lockBtn: string;
    compareBtn: string;
    monthlyTotal: string;
    coreCount: string;
    totalCount: string;
    emptyTitle: Record<UiTheme, string>;
    emptyDescription: string;
    searchPlaceholder: string;
    defaultBadge: string;
    filters: {
      status: string;
      priority: string;
      costTier: string;
      category: string;
    };
    sort: {
      recent: string;
      alpha: string;
      mostUsed: string;
      costDesc: string;
    };
  };
  add: {
    dialogTitle: Record<UiTheme, string>;
    promptLabel: string;
    placeholder: string;
    fetchCta: string;
    fetching: string;
    retry: string;
    depositCta: Record<UiTheme, string>;
    aiGenerated: string;
    manualEntry: string;
    interview: {
      whyUse: string;
      priority: string;
      defaultToolFor: string;
    };
    errors: {
      rateLimited: string;
      notFound: string;
      partial: string;
    };
  };
  detail: {
    addToDefaultStack: string;
    removeFromDefaultStack: string;
    inDefaultStack: string;
    visitWebsite: string;
    relatedApps: string;
    updatedAgo: (rel: string) => string;
    edit: string;
    delete: string;
  };
  confirm: {
    deleteTitle: string;
    deleteDescription: string;
    cancel: string;
    confirmDelete: string;
  };
  fields: {
    category: string;
    platforms: string;
    cost: string;
    useCases: string;
    whyUseIt: string;
    bestFeature: string;
    biggestDownside: string;
    bestAlternative: string;
    replaces: string;
    tags: string;
    defaultToolFor: string;
    status: string;
    priority: string;
  };
  form: {
    sectionBasic: string;
    sectionUsage: string;
    sectionOpinion: string;
    appName: string;
    appNamePh: string;
    websiteUrl: string;
    iconUrl: string;
    iconUrlPh: string;
    iconPreview: string;
    summary: string;
    categoryPh: string;
    platformsPh: string;
    costType: string;
    costAmount: string;
    costAmountPh: string;
    costPeriod: string;
    costPeriodPh: string;
    tagsPh: string;
    aiBadge: string;
    editTitle: (name: string) => string;
    cancel: string;
    saveChanges: string;
  };
  modes: {
    groupAria: string;
    myVault: string;
    recommendedStacks: string;
    compare: string;
    buildMyStack: string;
    wipTitle: string;
    wipBody: string;
  };
  recommended: {
    filterAria: string;
    filterAll: string;
    industries: Record<VaultStackIndustrySlug, string>;
    estMonthly: (usd: number | null) => string;
    difficulty: Record<VaultSetupDifficulty, string>;
    toolCount: (n: number) => string;
    viewDetails: string;
    roleLabel: string;
    addEntireStack: string;
    addSelected: (n: number) => string;
    depositing: string;
    depositDone: (added: number, merged: number, skipped: number) => string;
    depositFailed: string;
    inVaultBadge: string;
    sectionRationale: string;
    sectionTradeoffs: string;
    sectionSetup: string;
    sectionTools: string;
    visitTool: string;
    selectAll: string;
    selectNone: string;
  };
  buildStack: VaultBuildStackCopy;
  compare: VaultCompareCopy;
  insights: VaultInsightsCopy;
};

function makeCopy(
  opts: {
    navDefault: string;
    navAstronaut: string;
    navAcademia: string;
    navForest: string;
    titleDefault: string;
    titleAstronaut: string;
    titleAcademia: string;
    titleForest: string;
    descDefault: string;
    descAstronaut: string;
    descAcademia: string;
    descForest: string;
    promptDefault: string;
    promptAstronaut: string;
    promptAcademia: string;
    promptForest: string;
    ctaDefault: string;
    ctaAstronaut: string;
    ctaAcademia: string;
    ctaForest: string;
    depositDefault: string;
    depositAstronaut: string;
    depositAcademia: string;
    depositForest: string;
    addBtnDefault: string;
    addBtnAstronaut: string;
    addBtnAcademia: string;
    addBtnForest: string;
    addDialogDefault: string;
    addDialogAstronaut: string;
    addDialogAcademia: string;
    addDialogForest: string;
    emptyDefault: string;
    emptyAstronaut: string;
    emptyAcademia: string;
    emptyForest: string;
    emptyDescription: string;
    skipLink: string;
    unlocking: string;
    unlockedAnnouncement: string;
    reducedMotionNote: string;
    mute: string;
    unmute: string;
    lockBtn: string;
    compareBtn: string;
    monthlyTotal: string;
    coreCount: string;
    totalCount: string;
    searchPlaceholder: string;
    galleryDefaultBadge: string;
    filterStatus: string;
    filterPriority: string;
    filterCostTier: string;
    filterCategory: string;
    sortRecent: string;
    sortAlpha: string;
    sortMostUsed: string;
    sortCostDesc: string;
    promptLabel: string;
    placeholder: string;
    fetchCta: string;
    fetching: string;
    retry: string;
    aiGenerated: string;
    manualEntry: string;
    interviewWhyUse: string;
    interviewPriority: string;
    interviewDefaultToolFor: string;
    errorRateLimited: string;
    errorNotFound: string;
    errorPartial: string;
    addToDefaultStack: string;
    removeFromDefaultStack: string;
    inDefaultStack: string;
    visitWebsite: string;
    relatedApps: string;
    updatedAgo: (rel: string) => string;
    edit: string;
    del: string;
    fieldCategory: string;
    fieldPlatforms: string;
    fieldCost: string;
    fieldUseCases: string;
    fieldWhyUseIt: string;
    fieldBestFeature: string;
    fieldBiggestDownside: string;
    fieldBestAlternative: string;
    fieldReplaces: string;
    fieldTags: string;
    fieldDefaultToolFor: string;
    fieldStatus: string;
    fieldPriority: string;
    confirmDeleteTitle: string;
    confirmDeleteDescription: string;
    confirmCancel: string;
    confirmDelete: string;
    formSectionBasic: string;
    formSectionUsage: string;
    formSectionOpinion: string;
    formAppName: string;
    formAppNamePh: string;
    formWebsiteUrl: string;
    formIconUrl: string;
    formIconUrlPh: string;
    formIconPreview: string;
    formSummary: string;
    formCategoryPh: string;
    formPlatformsPh: string;
    formCostType: string;
    formCostAmount: string;
    formCostAmountPh: string;
    formCostPeriod: string;
    formCostPeriodPh: string;
    formTagsPh: string;
    formAiBadge: string;
    formEditTitle: (name: string) => string;
    formCancel: string;
    formSaveChanges: string;
    modeGroupAria: string;
    modeMyVault: string;
    modeRecommendedStacks: string;
    modeCompare: string;
    modeBuildMyStack: string;
    modeWipTitle: string;
    modeWipBody: string;
    recFilterAria: string;
    recFilterAll: string;
    industryLabels: Record<VaultStackIndustrySlug, string>;
    recDiffEasy: string;
    recDiffModerate: string;
    recDiffAdvanced: string;
    recEstMonthly: (usd: number | null) => string;
    recToolCount: (n: number) => string;
    recViewDetails: string;
    recRoleLabel: string;
    recAddEntireStack: string;
    recAddSelected: (n: number) => string;
    recDepositing: string;
    recDepositDone: (added: number, merged: number, skipped: number) => string;
    recDepositFailed: string;
    recInVault: string;
    recSectionRationale: string;
    recSectionTradeoffs: string;
    recSectionSetup: string;
    recSectionTools: string;
    recVisitTool: string;
    recSelectAll: string;
    recSelectNone: string;
  },
): Omit<VaultUiCopy, "buildStack" | "compare" | "insights"> {
  return {
    nav: {
      default: opts.navDefault,
      astronaut: opts.navAstronaut,
      academia: opts.navAcademia,
      forest: opts.navForest,
    },
    gate: {
      prompts: {
        default: { prompt: opts.promptDefault, cta: opts.ctaDefault },
        astronaut: { prompt: opts.promptAstronaut, cta: opts.ctaAstronaut },
        academia: { prompt: opts.promptAcademia, cta: opts.ctaAcademia },
        forest: { prompt: opts.promptForest, cta: opts.ctaForest },
      },
      skipLink: opts.skipLink,
      unlocking: opts.unlocking,
      unlockedAnnouncement: opts.unlockedAnnouncement,
      reducedMotionNote: opts.reducedMotionNote,
      mute: opts.mute,
      unmute: opts.unmute,
    },
    gallery: {
      title: {
        default: opts.titleDefault,
        astronaut: opts.titleAstronaut,
        academia: opts.titleAcademia,
        forest: opts.titleForest,
      },
      description: {
        default: opts.descDefault,
        astronaut: opts.descAstronaut,
        academia: opts.descAcademia,
        forest: opts.descForest,
      },
      addBtn: {
        default: opts.addBtnDefault,
        astronaut: opts.addBtnAstronaut,
        academia: opts.addBtnAcademia,
        forest: opts.addBtnForest,
      },
      lockBtn: opts.lockBtn,
      compareBtn: opts.compareBtn,
      monthlyTotal: opts.monthlyTotal,
      coreCount: opts.coreCount,
      totalCount: opts.totalCount,
      emptyTitle: {
        default: opts.emptyDefault,
        astronaut: opts.emptyAstronaut,
        academia: opts.emptyAcademia,
        forest: opts.emptyForest,
      },
      emptyDescription: opts.emptyDescription,
      searchPlaceholder: opts.searchPlaceholder,
      defaultBadge: opts.galleryDefaultBadge,
      filters: {
        status: opts.filterStatus,
        priority: opts.filterPriority,
        costTier: opts.filterCostTier,
        category: opts.filterCategory,
      },
      sort: {
        recent: opts.sortRecent,
        alpha: opts.sortAlpha,
        mostUsed: opts.sortMostUsed,
        costDesc: opts.sortCostDesc,
      },
    },
    add: {
      dialogTitle: {
        default: opts.addDialogDefault,
        astronaut: opts.addDialogAstronaut,
        academia: opts.addDialogAcademia,
        forest: opts.addDialogForest,
      },
      promptLabel: opts.promptLabel,
      placeholder: opts.placeholder,
      fetchCta: opts.fetchCta,
      fetching: opts.fetching,
      retry: opts.retry,
      depositCta: {
        default: opts.depositDefault,
        astronaut: opts.depositAstronaut,
        academia: opts.depositAcademia,
        forest: opts.depositForest,
      },
      aiGenerated: opts.aiGenerated,
      manualEntry: opts.manualEntry,
      interview: {
        whyUse: opts.interviewWhyUse,
        priority: opts.interviewPriority,
        defaultToolFor: opts.interviewDefaultToolFor,
      },
      errors: {
        rateLimited: opts.errorRateLimited,
        notFound: opts.errorNotFound,
        partial: opts.errorPartial,
      },
    },
    detail: {
      addToDefaultStack: opts.addToDefaultStack,
      removeFromDefaultStack: opts.removeFromDefaultStack,
      inDefaultStack: opts.inDefaultStack,
      visitWebsite: opts.visitWebsite,
      relatedApps: opts.relatedApps,
      updatedAgo: opts.updatedAgo,
      edit: opts.edit,
      delete: opts.del,
    },
    fields: {
      category: opts.fieldCategory,
      platforms: opts.fieldPlatforms,
      cost: opts.fieldCost,
      useCases: opts.fieldUseCases,
      whyUseIt: opts.fieldWhyUseIt,
      bestFeature: opts.fieldBestFeature,
      biggestDownside: opts.fieldBiggestDownside,
      bestAlternative: opts.fieldBestAlternative,
      replaces: opts.fieldReplaces,
      tags: opts.fieldTags,
      defaultToolFor: opts.fieldDefaultToolFor,
      status: opts.fieldStatus,
      priority: opts.fieldPriority,
    },
    confirm: {
      deleteTitle: opts.confirmDeleteTitle,
      deleteDescription: opts.confirmDeleteDescription,
      cancel: opts.confirmCancel,
      confirmDelete: opts.confirmDelete,
    },
    form: {
      sectionBasic: opts.formSectionBasic,
      sectionUsage: opts.formSectionUsage,
      sectionOpinion: opts.formSectionOpinion,
      appName: opts.formAppName,
      appNamePh: opts.formAppNamePh,
      websiteUrl: opts.formWebsiteUrl,
      iconUrl: opts.formIconUrl,
      iconUrlPh: opts.formIconUrlPh,
      iconPreview: opts.formIconPreview,
      summary: opts.formSummary,
      categoryPh: opts.formCategoryPh,
      platformsPh: opts.formPlatformsPh,
      costType: opts.formCostType,
      costAmount: opts.formCostAmount,
      costAmountPh: opts.formCostAmountPh,
      costPeriod: opts.formCostPeriod,
      costPeriodPh: opts.formCostPeriodPh,
      tagsPh: opts.formTagsPh,
      aiBadge: opts.formAiBadge,
      editTitle: opts.formEditTitle,
      cancel: opts.formCancel,
      saveChanges: opts.formSaveChanges,
    },
    modes: {
      groupAria: opts.modeGroupAria,
      myVault: opts.modeMyVault,
      recommendedStacks: opts.modeRecommendedStacks,
      compare: opts.modeCompare,
      buildMyStack: opts.modeBuildMyStack,
      wipTitle: opts.modeWipTitle,
      wipBody: opts.modeWipBody,
    },
    recommended: {
      filterAria: opts.recFilterAria,
      filterAll: opts.recFilterAll,
      industries: opts.industryLabels,
      estMonthly: opts.recEstMonthly,
      difficulty: {
        easy: opts.recDiffEasy,
        moderate: opts.recDiffModerate,
        advanced: opts.recDiffAdvanced,
      },
      toolCount: opts.recToolCount,
      viewDetails: opts.recViewDetails,
      roleLabel: opts.recRoleLabel,
      addEntireStack: opts.recAddEntireStack,
      addSelected: opts.recAddSelected,
      depositing: opts.recDepositing,
      depositDone: opts.recDepositDone,
      depositFailed: opts.recDepositFailed,
      inVaultBadge: opts.recInVault,
      sectionRationale: opts.recSectionRationale,
      sectionTradeoffs: opts.recSectionTradeoffs,
      sectionSetup: opts.recSectionSetup,
      sectionTools: opts.recSectionTools,
      visitTool: opts.recVisitTool,
      selectAll: opts.recSelectAll,
      selectNone: opts.recSelectNone,
    },
  };
}

const en = makeCopy({
  navDefault: "Software Vault",
  navAstronaut: "Software Arsenal",
  navAcademia: "Instrumentarium",
  navForest: "Tool Grotto",
  titleDefault: "Software Vault",
  titleAstronaut: "Software Arsenal",
  titleAcademia: "Instrumentarium",
  titleForest: "Tool Grotto",
  descDefault: "Curate the tools you rely on, and why they earn a spot.",
  descAstronaut: "Flight-rated tools, racked and pressurised.",
  descAcademia: "Your shelf of well-worn instruments.",
  descForest: "The tools sheltered inside the old tree.",
  promptDefault: "Enter the combination",
  promptAstronaut: "Place palm to scan",
  promptAcademia: "Turn the key",
  promptForest: "Touch the sigil",
  ctaDefault: "Open Vault",
  ctaAstronaut: "Begin Scan",
  ctaAcademia: "Unlock",
  ctaForest: "Awaken",
  depositDefault: "Deposit into vault",
  depositAstronaut: "Commit to arsenal",
  depositAcademia: "Place in instrumentarium",
  depositForest: "Nestle in the grotto",
  addBtnDefault: "Add app",
  addBtnAstronaut: "Requisition tool",
  addBtnAcademia: "Catalogue instrument",
  addBtnForest: "Plant a tool",
  addDialogDefault: "Add to vault",
  addDialogAstronaut: "Requisition a new tool",
  addDialogAcademia: "Catalogue a new instrument",
  addDialogForest: "Invite a new tool",
  emptyDefault: "The vault is empty",
  emptyAstronaut: "The arsenal is silent",
  emptyAcademia: "The shelves are bare",
  emptyForest: "The grotto is quiet",
  emptyDescription: "Add your first tool to start mapping your stack.",
  skipLink: "Skip the animation",
  unlocking: "Unlocking…",
  unlockedAnnouncement: "Vault unlocked. Gallery ready.",
  reducedMotionNote: "Reduced motion is on — the vault opens directly.",
  mute: "Mute sound",
  unmute: "Unmute sound",
  lockBtn: "Lock vault",
  compareBtn: "Compare",
  monthlyTotal: "Monthly total",
  coreCount: "Core",
  totalCount: "Total",
  searchPlaceholder: "Search apps…",
  galleryDefaultBadge: "Default",
  filterStatus: "Status",
  filterPriority: "Priority",
  filterCostTier: "Cost",
  filterCategory: "Category",
  sortRecent: "Recently added",
  sortAlpha: "Alphabetical",
  sortMostUsed: "Most used",
  sortCostDesc: "Cost: high to low",
  promptLabel: "What do you want to add?",
  placeholder: "Name or URL (e.g. Linear, https://linear.app)",
  fetchCta: "Fetch with AI",
  fetching: "Fetching…",
  retry: "Retry AI",
  aiGenerated: "AI-generated",
  manualEntry: "Fill manually instead",
  interviewWhyUse: "What do you mainly use it for?",
  interviewPriority: "Is this Core, Using, or Trying?",
  interviewDefaultToolFor: "Default tool for which category?",
  errorRateLimited: "You've hit the hourly AI limit. Try again later or fill manually.",
  errorNotFound: "Couldn't resolve that app. Edit the fields below and save anyway.",
  errorPartial: "Some fields couldn't be generated — you can retry each one.",
  addToDefaultStack: "Add to default stack",
  removeFromDefaultStack: "Remove from default stack",
  inDefaultStack: "In default stack",
  visitWebsite: "Visit website",
  relatedApps: "Used alongside",
  updatedAgo: (rel) => `Updated ${rel}`,
  edit: "Edit",
  del: "Delete",
  fieldCategory: "Category",
  fieldPlatforms: "Platforms",
  fieldCost: "Cost",
  fieldUseCases: "Use cases",
  fieldWhyUseIt: "Why I use it",
  fieldBestFeature: "Best feature",
  fieldBiggestDownside: "Biggest downside",
  fieldBestAlternative: "Best alternative",
  fieldReplaces: "Replaces",
  fieldTags: "Tags",
  fieldDefaultToolFor: "Default tool for",
  fieldStatus: "Status",
  fieldPriority: "Priority",
  confirmDeleteTitle: "Delete entry?",
  confirmDeleteDescription: "This will remove the app from your vault. This action can't be undone.",
  confirmCancel: "Cancel",
  confirmDelete: "Delete",
  formSectionBasic: "Basic info",
  formSectionUsage: "Usage",
  formSectionOpinion: "Opinion",
  formAppName: "App name",
  formAppNamePh: "e.g. Cursor",
  formWebsiteUrl: "Website URL",
  formIconUrl: "Icon URL",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "App icon",
  formSummary: "Summary",
  formCategoryPh: "Productivity, Dev Tools…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "Cost type",
  formCostAmount: "Cost amount",
  formCostAmountPh: "Leave empty if free",
  formCostPeriod: "Cost period",
  formCostPeriodPh: "month, year…",
  formTagsPh: "comma-separated",
  formAiBadge: "AI generated",
  formEditTitle: (name) => `Edit ${name}`,
  formCancel: "Cancel",
  formSaveChanges: "Save changes",
  modeGroupAria: "Software vault sections",
  modeMyVault: "My Vault",
  modeRecommendedStacks: "Recommended Stacks",
  modeCompare: "Compare",
  modeBuildMyStack: "Build My Stack",
  modeWipTitle: "In progress",
  modeWipBody:
    "This section is being wired up. Switch to My Vault to manage your personal tools — stacks, AI builder, compare, and insights arrive in upcoming phases.",
  recFilterAria: "Filter recommended stacks by industry",
  recFilterAll: "All industries",
  industryLabels: getVaultIndustryLabels("en"),
  recDiffEasy: "Easy setup",
  recDiffModerate: "Moderate",
  recDiffAdvanced: "Advanced",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Est. cost TBD" : `~$${Math.round(usd)}/mo`,
  recToolCount: (n) => `${n} tools`,
  recViewDetails: "View stack",
  recRoleLabel: "Role",
  recAddEntireStack: "Add entire stack",
  recAddSelected: (n) => (n <= 0 ? "Add selected" : `Add selected (${n})`),
  recDepositing: "Adding to vault…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`${added} new`);
    if (merged) parts.push(`${merged} merged into existing`);
    if (skipped) parts.push(`${skipped} skipped`);
    return parts.length ? parts.join(" · ") : "No changes";
  },
  recDepositFailed: "Could not add to vault",
  recInVault: "In your vault",
  recSectionRationale: "Why this stack works",
  recSectionTradeoffs: "Tradeoffs",
  recSectionSetup: "Suggested setup order",
  recSectionTools: "Tools in this stack",
  recVisitTool: "Visit site",
  recSelectAll: "Select all",
  recSelectNone: "Clear",
});

const zhTW = makeCopy({
  navDefault: "軟體庫",
  navAstronaut: "軟體軍火庫",
  navAcademia: "工具典藏",
  navForest: "工具樹洞",
  titleDefault: "軟體庫",
  titleAstronaut: "軟體軍火庫",
  titleAcademia: "工具典藏",
  titleForest: "工具樹洞",
  descDefault: "打理你真正靠得住嘅工具，記低點解佢哋值得留低。",
  descAstronaut: "飛行認證嘅工具，排得齊齊整整。",
  descAcademia: "你架子上用慣用熟嘅工具。",
  descForest: "藏喺老樹入面嘅工具。",
  promptDefault: "輸入密碼組合",
  promptAstronaut: "放手掌嚟掃描",
  promptAcademia: "旋動鎖匙",
  promptForest: "輕觸樹紋",
  ctaDefault: "開庫",
  ctaAstronaut: "開始掃描",
  ctaAcademia: "解鎖",
  ctaForest: "喚醒",
  depositDefault: "存入軟體庫",
  depositAstronaut: "列入軍火庫",
  depositAcademia: "納入典藏",
  depositForest: "安置入樹洞",
  addBtnDefault: "加入 app",
  addBtnAstronaut: "申領工具",
  addBtnAcademia: "編目一件工具",
  addBtnForest: "種下一件工具",
  addDialogDefault: "加入軟體庫",
  addDialogAstronaut: "申領新工具",
  addDialogAcademia: "為新工具編目",
  addDialogForest: "邀請新工具",
  emptyDefault: "軟體庫仲係空嘅",
  emptyAstronaut: "軍火庫靜英英",
  emptyAcademia: "架上還未有典藏",
  emptyForest: "樹洞仲好靜",
  emptyDescription: "加入第一件工具，開始建構你嘅工具地圖。",
  skipLink: "略過動畫",
  unlocking: "正在解鎖…",
  unlockedAnnouncement: "軟體庫已開啟，進入展示區。",
  reducedMotionNote: "已啟用低動態模式，直接進入軟體庫。",
  mute: "關聲",
  unmute: "開聲",
  lockBtn: "鎖返軟體庫",
  compareBtn: "比較",
  monthlyTotal: "每月合計",
  coreCount: "核心",
  totalCount: "總數",
  searchPlaceholder: "搜尋應用程式…",
  galleryDefaultBadge: "預設",
  filterStatus: "狀態",
  filterPriority: "優先度",
  filterCostTier: "費用",
  filterCategory: "類別",
  sortRecent: "最近加入",
  sortAlpha: "按字母",
  sortMostUsed: "最常用",
  sortCostDesc: "費用：由高至低",
  promptLabel: "你想加入邊個?",
  placeholder: "名稱或網址（例如：Linear、https://linear.app）",
  fetchCta: "用 AI 自動填寫",
  fetching: "抓取中…",
  retry: "重試 AI",
  aiGenerated: "由 AI 生成",
  manualEntry: "改為手動填寫",
  interviewWhyUse: "你主要用嚟做咩?",
  interviewPriority: "係核心、使用中定試用中?",
  interviewDefaultToolFor: "邊個範疇嘅預設工具?",
  errorRateLimited: "已達每小時 AI 上限，請稍後再試或手動填寫。",
  errorNotFound: "搵唔到呢個應用程式，可以直接編輯下面嘅欄位再儲存。",
  errorPartial: "部份欄位未能生成，可以逐項重試。",
  addToDefaultStack: "加入預設工具組",
  removeFromDefaultStack: "從預設工具組移除",
  inDefaultStack: "已在預設工具組",
  visitWebsite: "前往網站",
  relatedApps: "常一齊用",
  updatedAgo: (rel) => `${rel}前更新`,
  edit: "編輯",
  del: "刪除",
  fieldCategory: "類別",
  fieldPlatforms: "平台",
  fieldCost: "費用",
  fieldUseCases: "用途",
  fieldWhyUseIt: "我點解用",
  fieldBestFeature: "最鍾意嘅功能",
  fieldBiggestDownside: "最大缺點",
  fieldBestAlternative: "最佳替代品",
  fieldReplaces: "取代咗",
  fieldTags: "標籤",
  fieldDefaultToolFor: "預設工具適用於",
  fieldStatus: "狀態",
  fieldPriority: "優先度",
  confirmDeleteTitle: "確定刪除?",
  confirmDeleteDescription: "將會從你嘅軟體庫移除呢個 app，呢個動作無法復原。",
  confirmCancel: "取消",
  confirmDelete: "刪除",
  formSectionBasic: "基本資料",
  formSectionUsage: "用途",
  formSectionOpinion: "感想",
  formAppName: "App 名",
  formAppNamePh: "例如：Cursor",
  formWebsiteUrl: "網址",
  formIconUrl: "圖示網址",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "App 圖示",
  formSummary: "摘要",
  formCategoryPh: "例如：生產力、開發工具…",
  formPlatformsPh: "macOS、iOS、Web…",
  formCostType: "收費類型",
  formCostAmount: "金額",
  formCostAmountPh: "免費就留空",
  formCostPeriod: "週期",
  formCostPeriodPh: "月、年…",
  formTagsPh: "用逗號分隔",
  formAiBadge: "由 AI 生成",
  formEditTitle: (name) => `編輯 ${name}`,
  formCancel: "取消",
  formSaveChanges: "儲存",
  modeGroupAria: "軟體庫區塊",
  modeMyVault: "我的庫藏",
  modeRecommendedStacks: "推薦組合",
  modeCompare: "比較",
  modeBuildMyStack: "組裝我的套裝",
  modeWipTitle: "建置中",
  modeWipBody:
    "此區塊尚在串接。請切換到「我的庫藏」管理個人工具；推薦組合、AI 組裝、比較與洞察將在後續階段推出。",
  recFilterAria: "按行業篩選推薦組合",
  recFilterAll: "全部行業",
  industryLabels: getVaultIndustryLabels("zh-TW"),
  recDiffEasy: "易上手",
  recDiffModerate: "中等",
  recDiffAdvanced: "進階",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "費用待定" : `約 US$${Math.round(usd)}/月`,
  recToolCount: (n) => `${n} 個工具`,
  recViewDetails: "查看組合",
  recRoleLabel: "角色",
  recAddEntireStack: "加入成個組合",
  recAddSelected: (n) => (n <= 0 ? "加入已選" : `加入已選（${n}）`),
  recDepositing: "加入緊庫藏…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`新增 ${added}`);
    if (merged) parts.push(`合併 ${merged} 個現有項目`);
    if (skipped) parts.push(`略過 ${skipped}`);
    return parts.length ? parts.join(" · ") : "無變更";
  },
  recDepositFailed: "加入庫藏失敗",
  recInVault: "已在庫藏",
  recSectionRationale: "點解呢個組合work",
  recSectionTradeoffs: "取捨",
  recSectionSetup: "建議開喺邊步",
  recSectionTools: "組合入面嘅工具",
  recVisitTool: "開官方網站",
  recSelectAll: "全選",
  recSelectNone: "清空",
});

const zhCN = makeCopy({
  navDefault: "软件库",
  navAstronaut: "软件军械库",
  navAcademia: "工具典藏",
  navForest: "工具树洞",
  titleDefault: "软件库",
  titleAstronaut: "软件军械库",
  titleAcademia: "工具典藏",
  titleForest: "工具树洞",
  descDefault: "整理你真正依赖的工具,记下它们值得保留的理由。",
  descAstronaut: "经过飞行认证的工具,整齐排列。",
  descAcademia: "你书架上日复一日使用的工具。",
  descForest: "藏在老树中的工具。",
  promptDefault: "输入密码组合",
  promptAstronaut: "将手掌放上扫描",
  promptAcademia: "转动钥匙",
  promptForest: "轻触树纹",
  ctaDefault: "开启软件库",
  ctaAstronaut: "开始扫描",
  ctaAcademia: "解锁",
  ctaForest: "唤醒",
  depositDefault: "存入软件库",
  depositAstronaut: "纳入军械库",
  depositAcademia: "纳入典藏",
  depositForest: "安放入树洞",
  addBtnDefault: "添加应用",
  addBtnAstronaut: "申领工具",
  addBtnAcademia: "编目工具",
  addBtnForest: "种下工具",
  addDialogDefault: "加入软件库",
  addDialogAstronaut: "申领新工具",
  addDialogAcademia: "为新工具编目",
  addDialogForest: "邀请新工具",
  emptyDefault: "软件库还是空的",
  emptyAstronaut: "军械库悄然无声",
  emptyAcademia: "架上尚无典藏",
  emptyForest: "树洞很安静",
  emptyDescription: "添加第一件工具,开始绘制你的工具地图。",
  skipLink: "跳过动画",
  unlocking: "正在解锁…",
  unlockedAnnouncement: "软件库已开启,进入展示区。",
  reducedMotionNote: "已启用低动态模式,直接进入软件库。",
  mute: "静音",
  unmute: "开启声音",
  lockBtn: "锁回软件库",
  compareBtn: "比较",
  monthlyTotal: "每月合计",
  coreCount: "核心",
  totalCount: "总数",
  searchPlaceholder: "搜索应用…",
  galleryDefaultBadge: "默认",
  filterStatus: "状态",
  filterPriority: "优先级",
  filterCostTier: "费用",
  filterCategory: "类别",
  sortRecent: "最近添加",
  sortAlpha: "按字母",
  sortMostUsed: "最常使用",
  sortCostDesc: "费用:从高到低",
  promptLabel: "想添加什么?",
  placeholder: "名称或网址(例如:Linear、https://linear.app)",
  fetchCta: "用 AI 自动填写",
  fetching: "抓取中…",
  retry: "重试 AI",
  aiGenerated: "由 AI 生成",
  manualEntry: "改为手动填写",
  interviewWhyUse: "你主要用它做什么?",
  interviewPriority: "是核心、正在使用还是试用?",
  interviewDefaultToolFor: "是哪个类别的默认工具?",
  errorRateLimited: "已达到每小时 AI 限额,请稍后再试或手动填写。",
  errorNotFound: "找不到该应用,可以直接编辑下面的字段再保存。",
  errorPartial: "部分字段未能生成,可以逐项重试。",
  addToDefaultStack: "加入默认工具组",
  removeFromDefaultStack: "从默认工具组移除",
  inDefaultStack: "已加入默认工具组",
  visitWebsite: "访问网站",
  relatedApps: "常搭配使用",
  updatedAgo: (rel) => `${rel}前更新`,
  edit: "编辑",
  del: "删除",
  fieldCategory: "类别",
  fieldPlatforms: "平台",
  fieldCost: "费用",
  fieldUseCases: "用途",
  fieldWhyUseIt: "我为何使用",
  fieldBestFeature: "最喜欢的功能",
  fieldBiggestDownside: "最大缺点",
  fieldBestAlternative: "最佳替代",
  fieldReplaces: "取代了",
  fieldTags: "标签",
  fieldDefaultToolFor: "默认工具适用于",
  fieldStatus: "状态",
  fieldPriority: "优先级",
  confirmDeleteTitle: "确认删除?",
  confirmDeleteDescription: "将从你的软件库中移除这个应用,此操作无法撤销。",
  confirmCancel: "取消",
  confirmDelete: "删除",
  formSectionBasic: "基本信息",
  formSectionUsage: "用途",
  formSectionOpinion: "感想",
  formAppName: "应用名",
  formAppNamePh: "例如:Cursor",
  formWebsiteUrl: "网址",
  formIconUrl: "图标网址",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "应用图标",
  formSummary: "摘要",
  formCategoryPh: "生产力、开发工具…",
  formPlatformsPh: "macOS、iOS、Web…",
  formCostType: "收费类型",
  formCostAmount: "金额",
  formCostAmountPh: "免费请留空",
  formCostPeriod: "周期",
  formCostPeriodPh: "月、年…",
  formTagsPh: "用逗号分隔",
  formAiBadge: "由 AI 生成",
  formEditTitle: (name) => `编辑 ${name}`,
  formCancel: "取消",
  formSaveChanges: "保存",
  modeGroupAria: "软件库分区",
  modeMyVault: "我的库",
  modeRecommendedStacks: "推荐组合",
  modeCompare: "对比",
  modeBuildMyStack: "组建我的套装",
  modeWipTitle: "建设中",
  modeWipBody:
    "此区域仍在接入。请切换到「我的库」管理个人工具；推荐组合、AI 组装、对比与洞察将在后续阶段上线。",
  recFilterAria: "按行业筛选推荐组合",
  recFilterAll: "全部行业",
  industryLabels: getVaultIndustryLabels("zh-CN"),
  recDiffEasy: "易上手",
  recDiffModerate: "中等",
  recDiffAdvanced: "进阶",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "费用待定" : `约 $${Math.round(usd)}/月`,
  recToolCount: (n) => `${n} 个工具`,
  recViewDetails: "查看组合",
  recRoleLabel: "角色",
  recAddEntireStack: "添加整个组合",
  recAddSelected: (n) => (n <= 0 ? "添加所选" : `添加所选（${n}）`),
  recDepositing: "正在加入库…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`新增 ${added}`);
    if (merged) parts.push(`合并 ${merged} 条已有记录`);
    if (skipped) parts.push(`跳过 ${skipped}`);
    return parts.length ? parts.join(" · ") : "无变更";
  },
  recDepositFailed: "无法加入库",
  recInVault: "已在库中",
  recSectionRationale: "为何这套组合有效",
  recSectionTradeoffs: "取舍",
  recSectionSetup: "建议搭建顺序",
  recSectionTools: "组合内工具",
  recVisitTool: "访问官网",
  recSelectAll: "全选",
  recSelectNone: "清空",
});

const ja = makeCopy({
  navDefault: "ソフトウェア保管庫",
  navAstronaut: "ソフトウェア・アーセナル",
  navAcademia: "道具典蔵",
  navForest: "道具の木洞",
  titleDefault: "ソフトウェア保管庫",
  titleAstronaut: "ソフトウェア・アーセナル",
  titleAcademia: "道具典蔵",
  titleForest: "道具の木洞",
  descDefault: "信頼できる道具だけを、選んだ理由とともに。",
  descAstronaut: "実戦投入されたツールを、整然と格納。",
  descAcademia: "使い込まれた道具が並ぶ書架。",
  descForest: "古い木に抱かれた道具たち。",
  promptDefault: "ダイヤル番号を入力",
  promptAstronaut: "掌をかざしてスキャン",
  promptAcademia: "鍵を回す",
  promptForest: "樹紋にそっと触れる",
  ctaDefault: "保管庫を開く",
  ctaAstronaut: "スキャン開始",
  ctaAcademia: "解錠",
  ctaForest: "呼び覚ます",
  depositDefault: "保管庫に預ける",
  depositAstronaut: "アーセナルへ登録",
  depositAcademia: "典蔵に加える",
  depositForest: "木洞に収める",
  addBtnDefault: "アプリを追加",
  addBtnAstronaut: "ツールを申請",
  addBtnAcademia: "道具を目録化",
  addBtnForest: "道具を植える",
  addDialogDefault: "保管庫に追加",
  addDialogAstronaut: "新しいツールを申請",
  addDialogAcademia: "新しい道具を目録化",
  addDialogForest: "新しい道具を招き入れる",
  emptyDefault: "保管庫はまだ空です",
  emptyAstronaut: "アーセナルは静まり返っています",
  emptyAcademia: "棚はまだ空です",
  emptyForest: "木洞は静かです",
  emptyDescription: "最初のツールを入れて、スタックの地図を描き始めましょう。",
  skipLink: "アニメーションをスキップ",
  unlocking: "解錠中…",
  unlockedAnnouncement: "保管庫が開きました。ギャラリーを表示します。",
  reducedMotionNote: "低モーション設定が有効です。そのまま表示します。",
  mute: "サウンドをミュート",
  unmute: "サウンドを再生",
  lockBtn: "保管庫を施錠",
  compareBtn: "比較",
  monthlyTotal: "月額合計",
  coreCount: "コア",
  totalCount: "合計",
  searchPlaceholder: "アプリを検索…",
  galleryDefaultBadge: "既定",
  filterStatus: "ステータス",
  filterPriority: "優先度",
  filterCostTier: "費用",
  filterCategory: "カテゴリ",
  sortRecent: "最近追加",
  sortAlpha: "アルファベット順",
  sortMostUsed: "よく使う順",
  sortCostDesc: "費用:高い順",
  promptLabel: "何を追加しますか?",
  placeholder: "名前または URL(例:Linear、https://linear.app)",
  fetchCta: "AI で取得",
  fetching: "取得中…",
  retry: "AI を再試行",
  aiGenerated: "AI 生成",
  manualEntry: "手動入力に切り替え",
  interviewWhyUse: "主に何に使っていますか?",
  interviewPriority: "コア / 使用中 / 試用中 のどれ?",
  interviewDefaultToolFor: "どのカテゴリの既定ツールですか?",
  errorRateLimited: "1 時間あたりの AI 上限に達しました。時間をおくか手動で入力してください。",
  errorNotFound: "そのアプリを特定できませんでした。下の欄を編集して保存できます。",
  errorPartial: "生成できなかった項目があります。個別に再試行できます。",
  addToDefaultStack: "既定スタックに追加",
  removeFromDefaultStack: "既定スタックから外す",
  inDefaultStack: "既定スタックに登録済み",
  visitWebsite: "ウェブサイトへ",
  relatedApps: "よく一緒に使う",
  updatedAgo: (rel) => `${rel}前に更新`,
  edit: "編集",
  del: "削除",
  fieldCategory: "カテゴリ",
  fieldPlatforms: "プラットフォーム",
  fieldCost: "費用",
  fieldUseCases: "用途",
  fieldWhyUseIt: "使う理由",
  fieldBestFeature: "お気に入り機能",
  fieldBiggestDownside: "いちばんの弱点",
  fieldBestAlternative: "代替候補",
  fieldReplaces: "置き換えたもの",
  fieldTags: "タグ",
  fieldDefaultToolFor: "既定ツールのカテゴリ",
  fieldStatus: "ステータス",
  fieldPriority: "優先度",
  confirmDeleteTitle: "削除しますか?",
  confirmDeleteDescription: "このアプリを保管庫から削除します。元に戻せません。",
  confirmCancel: "キャンセル",
  confirmDelete: "削除",
  formSectionBasic: "基本情報",
  formSectionUsage: "使い方",
  formSectionOpinion: "所感",
  formAppName: "アプリ名",
  formAppNamePh: "例:Cursor",
  formWebsiteUrl: "ウェブサイト URL",
  formIconUrl: "アイコン URL",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "アプリアイコン",
  formSummary: "要約",
  formCategoryPh: "生産性、開発ツール…",
  formPlatformsPh: "macOS、iOS、Web…",
  formCostType: "料金タイプ",
  formCostAmount: "金額",
  formCostAmountPh: "無料なら空欄に",
  formCostPeriod: "期間",
  formCostPeriodPh: "月、年…",
  formTagsPh: "カンマ区切り",
  formAiBadge: "AI 生成",
  formEditTitle: (name) => `${name}を編集`,
  formCancel: "キャンセル",
  formSaveChanges: "保存",
  modeGroupAria: "ソフトウェア金庫のセクション",
  modeMyVault: "マイ金庫",
  modeRecommendedStacks: "おすすめスタック",
  modeCompare: "比較",
  modeBuildMyStack: "スタックを組む",
  modeWipTitle: "準備中",
  modeWipBody:
    "このエリアは接続中です。「マイ金庫」で個人ツールを管理してください。スタック、AIビルダー、比較、インサイトは今後のフェーズで追加されます。",
  recFilterAria: "業界でおすすめスタックを絞り込む",
  recFilterAll: "すべての業界",
  industryLabels: getVaultIndustryLabels("ja"),
  recDiffEasy: "かんたん",
  recDiffModerate: "ふつう",
  recDiffAdvanced: "高度",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "費用は未定" : `約 $${Math.round(usd)}/月`,
  recToolCount: (n) => `ツール ${n}件`,
  recViewDetails: "スタックを見る",
  recRoleLabel: "役割",
  recAddEntireStack: "スタック全体を追加",
  recAddSelected: (n) => (n <= 0 ? "選択したものを追加" : `選択したものを追加（${n}）`),
  recDepositing: "金庫に追加中…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`新規 ${added}`);
    if (merged) parts.push(`既存に統合 ${merged}`);
    if (skipped) parts.push(`スキップ ${skipped}`);
    return parts.length ? parts.join(" · ") : "変更なし";
  },
  recDepositFailed: "金庫に追加できませんでした",
  recInVault: "金庫にあります",
  recSectionRationale: "このスタックが効く理由",
  recSectionTradeoffs: "トレードオフ",
  recSectionSetup: "おすすめの導入順",
  recSectionTools: "含まれるツール",
  recVisitTool: "サイトを開く",
  recSelectAll: "すべて選択",
  recSelectNone: "クリア",
});

const ko = makeCopy({
  navDefault: "소프트웨어 금고",
  navAstronaut: "소프트웨어 무기고",
  navAcademia: "도구 소장고",
  navForest: "도구 나무굴",
  titleDefault: "소프트웨어 금고",
  titleAstronaut: "소프트웨어 무기고",
  titleAcademia: "도구 소장고",
  titleForest: "도구 나무굴",
  descDefault: "정말 의지하는 도구만 추려 이유와 함께 보관합니다.",
  descAstronaut: "검증된 도구들을 정돈해 보관합니다.",
  descAcademia: "오래 써 온 도구들의 서가.",
  descForest: "오래된 나무가 품은 도구들.",
  promptDefault: "조합 번호 입력",
  promptAstronaut: "손바닥을 대어 스캔",
  promptAcademia: "열쇠 돌리기",
  promptForest: "나무 문양을 살며시 누르기",
  ctaDefault: "금고 열기",
  ctaAstronaut: "스캔 시작",
  ctaAcademia: "잠금 해제",
  ctaForest: "깨우기",
  depositDefault: "금고에 보관",
  depositAstronaut: "무기고에 배치",
  depositAcademia: "소장고에 수록",
  depositForest: "나무굴에 깃들이기",
  addBtnDefault: "앱 추가",
  addBtnAstronaut: "도구 청구",
  addBtnAcademia: "도구 목록화",
  addBtnForest: "도구 심기",
  addDialogDefault: "금고에 추가",
  addDialogAstronaut: "새 도구 청구",
  addDialogAcademia: "새 도구 목록화",
  addDialogForest: "새 도구 맞이하기",
  emptyDefault: "금고가 비어 있어요",
  emptyAstronaut: "무기고가 조용합니다",
  emptyAcademia: "서가가 비어 있어요",
  emptyForest: "나무굴이 고요합니다",
  emptyDescription: "첫 도구를 추가해 스택 지도를 그려 보세요.",
  skipLink: "애니메이션 건너뛰기",
  unlocking: "잠금 해제 중…",
  unlockedAnnouncement: "금고가 열렸습니다. 갤러리를 엽니다.",
  reducedMotionNote: "모션 최소화가 켜져 있어 바로 열립니다.",
  mute: "소리 끄기",
  unmute: "소리 켜기",
  lockBtn: "금고 잠그기",
  compareBtn: "비교",
  monthlyTotal: "월 합계",
  coreCount: "핵심",
  totalCount: "합계",
  searchPlaceholder: "앱 검색…",
  galleryDefaultBadge: "기본",
  filterStatus: "상태",
  filterPriority: "우선순위",
  filterCostTier: "비용",
  filterCategory: "카테고리",
  sortRecent: "최근 추가",
  sortAlpha: "가나다순",
  sortMostUsed: "자주 사용",
  sortCostDesc: "비용: 높은 순",
  promptLabel: "무엇을 추가할까요?",
  placeholder: "이름 또는 URL (예: Linear, https://linear.app)",
  fetchCta: "AI 로 자동 채우기",
  fetching: "가져오는 중…",
  retry: "AI 다시 시도",
  aiGenerated: "AI 생성",
  manualEntry: "직접 입력으로 전환",
  interviewWhyUse: "주로 어디에 사용하나요?",
  interviewPriority: "핵심 / 사용 중 / 시험 중 중 어느 쪽인가요?",
  interviewDefaultToolFor: "어떤 카테고리의 기본 도구인가요?",
  errorRateLimited: "시간당 AI 한도에 도달했습니다. 잠시 후 다시 시도하거나 직접 입력해 주세요.",
  errorNotFound: "해당 앱을 찾지 못했습니다. 아래 항목을 수정해 저장할 수 있습니다.",
  errorPartial: "일부 항목을 생성하지 못했습니다. 항목별로 재시도할 수 있어요.",
  addToDefaultStack: "기본 스택에 추가",
  removeFromDefaultStack: "기본 스택에서 제거",
  inDefaultStack: "기본 스택에 등록됨",
  visitWebsite: "웹사이트 열기",
  relatedApps: "함께 쓰이는 도구",
  updatedAgo: (rel) => `${rel} 전 업데이트`,
  edit: "편집",
  del: "삭제",
  fieldCategory: "카테고리",
  fieldPlatforms: "플랫폼",
  fieldCost: "비용",
  fieldUseCases: "용도",
  fieldWhyUseIt: "사용 이유",
  fieldBestFeature: "최고의 기능",
  fieldBiggestDownside: "가장 큰 단점",
  fieldBestAlternative: "대체 후보",
  fieldReplaces: "대체한 것",
  fieldTags: "태그",
  fieldDefaultToolFor: "기본 도구 카테고리",
  fieldStatus: "상태",
  fieldPriority: "우선순위",
  confirmDeleteTitle: "삭제할까요?",
  confirmDeleteDescription: "이 앱을 금고에서 제거합니다. 되돌릴 수 없어요.",
  confirmCancel: "취소",
  confirmDelete: "삭제",
  formSectionBasic: "기본 정보",
  formSectionUsage: "사용",
  formSectionOpinion: "소감",
  formAppName: "앱 이름",
  formAppNamePh: "예: Cursor",
  formWebsiteUrl: "웹사이트 URL",
  formIconUrl: "아이콘 URL",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "앱 아이콘",
  formSummary: "요약",
  formCategoryPh: "생산성, 개발 도구…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "요금제",
  formCostAmount: "금액",
  formCostAmountPh: "무료면 비워 두세요",
  formCostPeriod: "주기",
  formCostPeriodPh: "월, 연…",
  formTagsPh: "쉼표로 구분",
  formAiBadge: "AI 생성",
  formEditTitle: (name) => `${name} 편집`,
  formCancel: "취소",
  formSaveChanges: "저장",
  modeGroupAria: "소프트웨어 금고 구역",
  modeMyVault: "내 금고",
  modeRecommendedStacks: "추천 스택",
  modeCompare: "비교",
  modeBuildMyStack: "스택 만들기",
  modeWipTitle: "준비 중",
  modeWipBody:
    "이 영역은 연결 중입니다. 개인 도구는「내 금고」에서 관리하세요. 추천 스택, AI 빌더, 비교, 인사이트는 이후 단계에서 제공됩니다.",
  recFilterAria: "업종별로 추천 스택 필터",
  recFilterAll: "모든 업종",
  industryLabels: getVaultIndustryLabels("ko"),
  recDiffEasy: "쉬운 설정",
  recDiffModerate: "보통",
  recDiffAdvanced: "고급",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "비용 미정" : `약 $${Math.round(usd)}/월`,
  recToolCount: (n) => `도구 ${n}개`,
  recViewDetails: "스택 보기",
  recRoleLabel: "역할",
  recAddEntireStack: "스택 전체 추가",
  recAddSelected: (n) => (n <= 0 ? "선택 항목 추가" : `선택 항목 추가 (${n})`),
  recDepositing: "금고에 추가 중…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`신규 ${added}`);
    if (merged) parts.push(`기존 항목에 병합 ${merged}`);
    if (skipped) parts.push(`건너뜀 ${skipped}`);
    return parts.length ? parts.join(" · ") : "변경 없음";
  },
  recDepositFailed: "금고에 추가하지 못했습니다",
  recInVault: "금고에 있음",
  recSectionRationale: "이 스택이 맞는 이유",
  recSectionTradeoffs: "장단점",
  recSectionSetup: "권장 도입 순서",
  recSectionTools: "포함 도구",
  recVisitTool: "사이트 열기",
  recSelectAll: "모두 선택",
  recSelectNone: "지우기",
});

const fr = makeCopy({
  navDefault: "Coffre logiciels",
  navAstronaut: "Arsenal logiciel",
  navAcademia: "Instrumentarium",
  navForest: "Creux à outils",
  titleDefault: "Coffre logiciels",
  titleAstronaut: "Arsenal logiciel",
  titleAcademia: "Instrumentarium",
  titleForest: "Creux à outils",
  descDefault: "Rassemblez les outils qui comptent et dites pourquoi.",
  descAstronaut: "Des outils certifiés, bien rangés et pressurisés.",
  descAcademia: "Vos instruments de prédilection, sur leur étagère.",
  descForest: "Les outils abrités dans le vieil arbre.",
  promptDefault: "Saisir la combinaison",
  promptAstronaut: "Posez la paume pour scanner",
  promptAcademia: "Tournez la clé",
  promptForest: "Touchez la marque",
  ctaDefault: "Ouvrir le coffre",
  ctaAstronaut: "Lancer le scan",
  ctaAcademia: "Déverrouiller",
  ctaForest: "Éveiller",
  depositDefault: "Déposer dans le coffre",
  depositAstronaut: "Intégrer à l'arsenal",
  depositAcademia: "Ranger dans l'instrumentarium",
  depositForest: "Nicher dans le creux",
  addBtnDefault: "Ajouter une app",
  addBtnAstronaut: "Commander un outil",
  addBtnAcademia: "Cataloguer un instrument",
  addBtnForest: "Planter un outil",
  addDialogDefault: "Ajouter au coffre",
  addDialogAstronaut: "Commander un nouvel outil",
  addDialogAcademia: "Cataloguer un nouvel instrument",
  addDialogForest: "Accueillir un nouvel outil",
  emptyDefault: "Le coffre est vide",
  emptyAstronaut: "L'arsenal est silencieux",
  emptyAcademia: "Les rayons sont vides",
  emptyForest: "Le creux est silencieux",
  emptyDescription: "Ajoutez un premier outil pour commencer votre cartographie.",
  skipLink: "Passer l'animation",
  unlocking: "Déverrouillage…",
  unlockedAnnouncement: "Coffre ouvert. Galerie prête.",
  reducedMotionNote: "Animations réduites activées : ouverture directe.",
  mute: "Couper le son",
  unmute: "Activer le son",
  lockBtn: "Verrouiller",
  compareBtn: "Comparer",
  monthlyTotal: "Total mensuel",
  coreCount: "Essentiels",
  totalCount: "Total",
  searchPlaceholder: "Rechercher une app…",
  galleryDefaultBadge: "Par défaut",
  filterStatus: "Statut",
  filterPriority: "Priorité",
  filterCostTier: "Coût",
  filterCategory: "Catégorie",
  sortRecent: "Récemment ajouté",
  sortAlpha: "Alphabétique",
  sortMostUsed: "Plus utilisés",
  sortCostDesc: "Coût : décroissant",
  promptLabel: "Que voulez-vous ajouter ?",
  placeholder: "Nom ou URL (ex. Linear, https://linear.app)",
  fetchCta: "Remplir avec l'IA",
  fetching: "Récupération…",
  retry: "Réessayer",
  aiGenerated: "Généré par l'IA",
  manualEntry: "Remplir manuellement",
  interviewWhyUse: "À quoi vous sert-il surtout ?",
  interviewPriority: "Essentiel, en usage ou à l'essai ?",
  interviewDefaultToolFor: "Outil par défaut pour quelle catégorie ?",
  errorRateLimited: "Limite IA horaire atteinte. Réessayez plus tard ou remplissez à la main.",
  errorNotFound: "App introuvable. Modifiez les champs ci-dessous puis enregistrez.",
  errorPartial: "Certains champs n'ont pas pu être générés — réessayez-les un par un.",
  addToDefaultStack: "Ajouter aux outils par défaut",
  removeFromDefaultStack: "Retirer des outils par défaut",
  inDefaultStack: "Déjà dans les outils par défaut",
  visitWebsite: "Visiter le site",
  relatedApps: "Souvent associés",
  updatedAgo: (rel) => `Mise à jour il y a ${rel}`,
  edit: "Modifier",
  del: "Supprimer",
  fieldCategory: "Catégorie",
  fieldPlatforms: "Plateformes",
  fieldCost: "Coût",
  fieldUseCases: "Usages",
  fieldWhyUseIt: "Pourquoi je l'utilise",
  fieldBestFeature: "Meilleure fonction",
  fieldBiggestDownside: "Plus gros défaut",
  fieldBestAlternative: "Meilleure alternative",
  fieldReplaces: "Remplace",
  fieldTags: "Étiquettes",
  fieldDefaultToolFor: "Outil par défaut pour",
  fieldStatus: "Statut",
  fieldPriority: "Priorité",
  confirmDeleteTitle: "Supprimer l'entrée ?",
  confirmDeleteDescription: "Cela retire l'application du coffre. Action irréversible.",
  confirmCancel: "Annuler",
  confirmDelete: "Supprimer",
  formSectionBasic: "Informations de base",
  formSectionUsage: "Usage",
  formSectionOpinion: "Avis",
  formAppName: "Nom de l'app",
  formAppNamePh: "ex. Cursor",
  formWebsiteUrl: "URL du site",
  formIconUrl: "URL de l'icône",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "Icône de l'app",
  formSummary: "Résumé",
  formCategoryPh: "Productivité, Dev…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "Type de coût",
  formCostAmount: "Montant",
  formCostAmountPh: "Laisser vide si gratuit",
  formCostPeriod: "Période",
  formCostPeriodPh: "mois, année…",
  formTagsPh: "séparés par des virgules",
  formAiBadge: "Généré par IA",
  formEditTitle: (name) => `Modifier ${name}`,
  formCancel: "Annuler",
  formSaveChanges: "Enregistrer",
  modeGroupAria: "Sections du coffre logiciel",
  modeMyVault: "Mon coffre",
  modeRecommendedStacks: "Stacks recommandés",
  modeCompare: "Comparer",
  modeBuildMyStack: "Composer ma stack",
  modeWipTitle: "En cours",
  modeWipBody:
    "Cette section est en cours de branchement. Utilisez « Mon coffre » pour vos outils personnels — stacks, assistant IA, comparaison et insights arrivent dans les prochaines phases.",
  recFilterAria: "Filtrer les stacks par secteur",
  recFilterAll: "Tous les secteurs",
  industryLabels: getVaultIndustryLabels("fr"),
  recDiffEasy: "Mise en place facile",
  recDiffModerate: "Modérée",
  recDiffAdvanced: "Avancée",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Coût à préciser" : `~${Math.round(usd)} $/mois`,
  recToolCount: (n) => `${n} outils`,
  recViewDetails: "Voir la stack",
  recRoleLabel: "Rôle",
  recAddEntireStack: "Ajouter toute la stack",
  recAddSelected: (n) => (n <= 0 ? "Ajouter la sélection" : `Ajouter la sélection (${n})`),
  recDepositing: "Ajout au coffre…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`${added} nouveaux`);
    if (merged) parts.push(`${merged} fusionnés`);
    if (skipped) parts.push(`${skipped} ignorés`);
    return parts.length ? parts.join(" · ") : "Aucun changement";
  },
  recDepositFailed: "Impossible d'ajouter au coffre",
  recInVault: "Déjà dans le coffre",
  recSectionRationale: "Pourquoi cette stack tient la route",
  recSectionTradeoffs: "Compromis",
  recSectionSetup: "Ordre de mise en place suggéré",
  recSectionTools: "Outils inclus",
  recVisitTool: "Voir le site",
  recSelectAll: "Tout sélectionner",
  recSelectNone: "Effacer",
});

const it = makeCopy({
  navDefault: "Archivio software",
  navAstronaut: "Arsenale software",
  navAcademia: "Instrumentarium",
  navForest: "Grotta degli attrezzi",
  titleDefault: "Archivio software",
  titleAstronaut: "Arsenale software",
  titleAcademia: "Instrumentarium",
  titleForest: "Grotta degli attrezzi",
  descDefault: "Raccogli gli strumenti su cui fai davvero affidamento e il perché.",
  descAstronaut: "Attrezzi certificati, stivati e pressurizzati.",
  descAcademia: "Gli strumenti di casa sullo scaffale.",
  descForest: "Gli attrezzi custoditi nel vecchio albero.",
  promptDefault: "Inserisci la combinazione",
  promptAstronaut: "Appoggia il palmo per la scansione",
  promptAcademia: "Gira la chiave",
  promptForest: "Tocca il sigillo",
  ctaDefault: "Apri l'archivio",
  ctaAstronaut: "Avvia scansione",
  ctaAcademia: "Sblocca",
  ctaForest: "Risveglia",
  depositDefault: "Deposita nell'archivio",
  depositAstronaut: "Registra nell'arsenale",
  depositAcademia: "Aggiungi all'instrumentarium",
  depositForest: "Annida nella grotta",
  addBtnDefault: "Aggiungi app",
  addBtnAstronaut: "Richiedi strumento",
  addBtnAcademia: "Cataloga strumento",
  addBtnForest: "Pianta uno strumento",
  addDialogDefault: "Aggiungi all'archivio",
  addDialogAstronaut: "Richiedi un nuovo strumento",
  addDialogAcademia: "Cataloga un nuovo strumento",
  addDialogForest: "Accogli un nuovo strumento",
  emptyDefault: "L'archivio è vuoto",
  emptyAstronaut: "L'arsenale è silenzioso",
  emptyAcademia: "Gli scaffali sono vuoti",
  emptyForest: "La grotta è silenziosa",
  emptyDescription: "Aggiungi il primo strumento per tracciare il tuo stack.",
  skipLink: "Salta l'animazione",
  unlocking: "Sblocco…",
  unlockedAnnouncement: "Archivio aperto. Galleria pronta.",
  reducedMotionNote: "Animazioni ridotte attive: apertura diretta.",
  mute: "Muto",
  unmute: "Attiva audio",
  lockBtn: "Blocca archivio",
  compareBtn: "Confronta",
  monthlyTotal: "Totale mensile",
  coreCount: "Core",
  totalCount: "Totale",
  searchPlaceholder: "Cerca app…",
  galleryDefaultBadge: "Predefinito",
  filterStatus: "Stato",
  filterPriority: "Priorità",
  filterCostTier: "Costo",
  filterCategory: "Categoria",
  sortRecent: "Aggiunti di recente",
  sortAlpha: "Alfabetico",
  sortMostUsed: "Più usati",
  sortCostDesc: "Costo: decrescente",
  promptLabel: "Che cosa vuoi aggiungere?",
  placeholder: "Nome o URL (es. Linear, https://linear.app)",
  fetchCta: "Compila con IA",
  fetching: "Recupero…",
  retry: "Riprova",
  aiGenerated: "Generato da IA",
  manualEntry: "Compila manualmente",
  interviewWhyUse: "Per cosa lo usi soprattutto?",
  interviewPriority: "È core, in uso o in prova?",
  interviewDefaultToolFor: "Strumento predefinito per quale categoria?",
  errorRateLimited: "Limite IA orario raggiunto. Riprova più tardi o compila a mano.",
  errorNotFound: "Non riesco a identificare l'app. Modifica i campi sotto e salva.",
  errorPartial: "Alcuni campi non sono stati generati — puoi riprovarli singolarmente.",
  addToDefaultStack: "Aggiungi agli strumenti predefiniti",
  removeFromDefaultStack: "Rimuovi dagli strumenti predefiniti",
  inDefaultStack: "Già negli strumenti predefiniti",
  visitWebsite: "Vai al sito",
  relatedApps: "Spesso usati insieme",
  updatedAgo: (rel) => `Aggiornato ${rel} fa`,
  edit: "Modifica",
  del: "Elimina",
  fieldCategory: "Categoria",
  fieldPlatforms: "Piattaforme",
  fieldCost: "Costo",
  fieldUseCases: "Casi d'uso",
  fieldWhyUseIt: "Perché lo uso",
  fieldBestFeature: "Funzione migliore",
  fieldBiggestDownside: "Difetto principale",
  fieldBestAlternative: "Miglior alternativa",
  fieldReplaces: "Sostituisce",
  fieldTags: "Tag",
  fieldDefaultToolFor: "Strumento predefinito per",
  fieldStatus: "Stato",
  fieldPriority: "Priorità",
  confirmDeleteTitle: "Eliminare la voce?",
  confirmDeleteDescription: "L'app verrà rimossa dall'archivio. Azione non annullabile.",
  confirmCancel: "Annulla",
  confirmDelete: "Elimina",
  formSectionBasic: "Informazioni di base",
  formSectionUsage: "Uso",
  formSectionOpinion: "Opinione",
  formAppName: "Nome dell'app",
  formAppNamePh: "es. Cursor",
  formWebsiteUrl: "URL del sito",
  formIconUrl: "URL dell'icona",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "Icona app",
  formSummary: "Riepilogo",
  formCategoryPh: "Produttività, Dev…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "Tipo di costo",
  formCostAmount: "Importo",
  formCostAmountPh: "Lascia vuoto se gratuito",
  formCostPeriod: "Periodo",
  formCostPeriodPh: "mese, anno…",
  formTagsPh: "separati da virgole",
  formAiBadge: "Generato da IA",
  formEditTitle: (name) => `Modifica ${name}`,
  formCancel: "Annulla",
  formSaveChanges: "Salva",
  modeGroupAria: "Sezioni della cassaforte software",
  modeMyVault: "La mia cassaforte",
  modeRecommendedStacks: "Stack consigliati",
  modeCompare: "Confronta",
  modeBuildMyStack: "Crea il mio stack",
  modeWipTitle: "In lavorazione",
  modeWipBody:
    "Quest’area è in collegamento. Vai a « La mia cassaforte » per gestire i tuoi strumenti — stack, builder IA, confronto e insight arriveranno nelle fasi successive.",
  recFilterAria: "Filtra gli stack per settore",
  recFilterAll: "Tutti i settori",
  industryLabels: getVaultIndustryLabels("it"),
  recDiffEasy: "Configurazione facile",
  recDiffModerate: "Media",
  recDiffAdvanced: "Avanzata",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Costo da definire" : `~${Math.round(usd)} $/mese`,
  recToolCount: (n) => `${n} strumenti`,
  recViewDetails: "Vedi lo stack",
  recRoleLabel: "Ruolo",
  recAddEntireStack: "Aggiungi tutto lo stack",
  recAddSelected: (n) => (n <= 0 ? "Aggiungi selezionati" : `Aggiungi selezionati (${n})`),
  recDepositing: "Aggiunta alla cassaforte…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`${added} nuovi`);
    if (merged) parts.push(`${merged} uniti a esistenti`);
    if (skipped) parts.push(`${skipped} saltati`);
    return parts.length ? parts.join(" · ") : "Nessuna modifica";
  },
  recDepositFailed: "Impossibile aggiungere alla cassaforte",
  recInVault: "Già in cassaforte",
  recSectionRationale: "Perché funziona",
  recSectionTradeoffs: "Compromessi",
  recSectionSetup: "Ordine di attivazione consigliato",
  recSectionTools: "Strumenti inclusi",
  recVisitTool: "Apri il sito",
  recSelectAll: "Seleziona tutto",
  recSelectNone: "Pulisci",
});

const es = makeCopy({
  navDefault: "Bóveda de software",
  navAstronaut: "Arsenal de software",
  navAcademia: "Instrumentarium",
  navForest: "Refugio de herramientas",
  titleDefault: "Bóveda de software",
  titleAstronaut: "Arsenal de software",
  titleAcademia: "Instrumentarium",
  titleForest: "Refugio de herramientas",
  descDefault: "Reúne las herramientas en las que confías y por qué.",
  descAstronaut: "Herramientas homologadas, ordenadas y presurizadas.",
  descAcademia: "Tus instrumentos de siempre, en su estante.",
  descForest: "Las herramientas cobijadas en el viejo árbol.",
  promptDefault: "Introduce la combinación",
  promptAstronaut: "Apoya la palma para escanear",
  promptAcademia: "Gira la llave",
  promptForest: "Toca el sigilo",
  ctaDefault: "Abrir la bóveda",
  ctaAstronaut: "Iniciar escaneo",
  ctaAcademia: "Desbloquear",
  ctaForest: "Despertar",
  depositDefault: "Depositar en la bóveda",
  depositAstronaut: "Registrar en el arsenal",
  depositAcademia: "Guardar en el instrumentarium",
  depositForest: "Anidar en el refugio",
  addBtnDefault: "Añadir app",
  addBtnAstronaut: "Solicitar herramienta",
  addBtnAcademia: "Catalogar instrumento",
  addBtnForest: "Plantar una herramienta",
  addDialogDefault: "Añadir a la bóveda",
  addDialogAstronaut: "Solicitar una nueva herramienta",
  addDialogAcademia: "Catalogar un nuevo instrumento",
  addDialogForest: "Acoger una nueva herramienta",
  emptyDefault: "La bóveda está vacía",
  emptyAstronaut: "El arsenal está en silencio",
  emptyAcademia: "Los estantes están vacíos",
  emptyForest: "El refugio está en silencio",
  emptyDescription: "Añade tu primera herramienta para empezar a mapear tu stack.",
  skipLink: "Saltar animación",
  unlocking: "Desbloqueando…",
  unlockedAnnouncement: "Bóveda abierta. Galería lista.",
  reducedMotionNote: "Modo de movimiento reducido activo: apertura directa.",
  mute: "Silenciar",
  unmute: "Activar sonido",
  lockBtn: "Bloquear bóveda",
  compareBtn: "Comparar",
  monthlyTotal: "Total mensual",
  coreCount: "Esenciales",
  totalCount: "Total",
  searchPlaceholder: "Buscar apps…",
  galleryDefaultBadge: "Predeterminada",
  filterStatus: "Estado",
  filterPriority: "Prioridad",
  filterCostTier: "Coste",
  filterCategory: "Categoría",
  sortRecent: "Añadidas recientemente",
  sortAlpha: "Alfabético",
  sortMostUsed: "Más usadas",
  sortCostDesc: "Coste: de mayor a menor",
  promptLabel: "¿Qué quieres añadir?",
  placeholder: "Nombre o URL (p. ej. Linear, https://linear.app)",
  fetchCta: "Rellenar con IA",
  fetching: "Recuperando…",
  retry: "Reintentar",
  aiGenerated: "Generado por IA",
  manualEntry: "Rellenar manualmente",
  interviewWhyUse: "¿Para qué la usas sobre todo?",
  interviewPriority: "¿Es esencial, en uso o en prueba?",
  interviewDefaultToolFor: "¿Herramienta predeterminada para qué categoría?",
  errorRateLimited: "Has alcanzado el límite de IA por hora. Espera o rellena a mano.",
  errorNotFound: "No se ha podido identificar la app. Edita los campos y guarda.",
  errorPartial: "Algunos campos no se han generado; puedes reintentarlos uno a uno.",
  addToDefaultStack: "Añadir al stack predeterminado",
  removeFromDefaultStack: "Quitar del stack predeterminado",
  inDefaultStack: "Ya está en el stack predeterminado",
  visitWebsite: "Visitar sitio",
  relatedApps: "Se usan a menudo juntas",
  updatedAgo: (rel) => `Actualizado hace ${rel}`,
  edit: "Editar",
  del: "Eliminar",
  fieldCategory: "Categoría",
  fieldPlatforms: "Plataformas",
  fieldCost: "Coste",
  fieldUseCases: "Casos de uso",
  fieldWhyUseIt: "Por qué la uso",
  fieldBestFeature: "Mejor función",
  fieldBiggestDownside: "Mayor inconveniente",
  fieldBestAlternative: "Mejor alternativa",
  fieldReplaces: "Reemplaza a",
  fieldTags: "Etiquetas",
  fieldDefaultToolFor: "Herramienta predeterminada para",
  fieldStatus: "Estado",
  fieldPriority: "Prioridad",
  confirmDeleteTitle: "¿Eliminar entrada?",
  confirmDeleteDescription: "Se quitará la app de la bóveda. Esta acción no se puede deshacer.",
  confirmCancel: "Cancelar",
  confirmDelete: "Eliminar",
  formSectionBasic: "Información básica",
  formSectionUsage: "Uso",
  formSectionOpinion: "Opinión",
  formAppName: "Nombre de la app",
  formAppNamePh: "p. ej. Cursor",
  formWebsiteUrl: "URL del sitio",
  formIconUrl: "URL del icono",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "Icono de la app",
  formSummary: "Resumen",
  formCategoryPh: "Productividad, Dev…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "Tipo de coste",
  formCostAmount: "Importe",
  formCostAmountPh: "Déjalo vacío si es gratis",
  formCostPeriod: "Periodo",
  formCostPeriodPh: "mes, año…",
  formTagsPh: "separadas por comas",
  formAiBadge: "Generado por IA",
  formEditTitle: (name) => `Editar ${name}`,
  formCancel: "Cancelar",
  formSaveChanges: "Guardar",
  modeGroupAria: "Secciones de la bóveda de software",
  modeMyVault: "Mi bóveda",
  modeRecommendedStacks: "Stacks recomendados",
  modeCompare: "Comparar",
  modeBuildMyStack: "Armar mi stack",
  modeWipTitle: "En progreso",
  modeWipBody:
    "Esta sección se está conectando. Usa « Mi bóveda » para tus herramientas personales; stacks, asistente IA, comparación e información llegarán en fases posteriores.",
  recFilterAria: "Filtrar stacks por sector",
  recFilterAll: "Todos los sectores",
  industryLabels: getVaultIndustryLabels("es"),
  recDiffEasy: "Configuración fácil",
  recDiffModerate: "Moderada",
  recDiffAdvanced: "Avanzada",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Coste por definir" : `~${Math.round(usd)} $/mes`,
  recToolCount: (n) => `${n} herramientas`,
  recViewDetails: "Ver stack",
  recRoleLabel: "Rol",
  recAddEntireStack: "Añadir stack completo",
  recAddSelected: (n) => (n <= 0 ? "Añadir selección" : `Añadir selección (${n})`),
  recDepositing: "Añadiendo a la bóveda…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`${added} nuevos`);
    if (merged) parts.push(`${merged} fusionados`);
    if (skipped) parts.push(`${skipped} omitidos`);
    return parts.length ? parts.join(" · ") : "Sin cambios";
  },
  recDepositFailed: "No se pudo añadir a la bóveda",
  recInVault: "Ya en tu bóveda",
  recSectionRationale: "Por qué encaja",
  recSectionTradeoffs: "Contras y matices",
  recSectionSetup: "Orden sugerido de puesta en marcha",
  recSectionTools: "Herramientas incluidas",
  recVisitTool: "Abrir sitio",
  recSelectAll: "Seleccionar todo",
  recSelectNone: "Limpiar",
});

const vi = makeCopy({
  navDefault: "Kho phần mềm",
  navAstronaut: "Kho vũ khí phần mềm",
  navAcademia: "Bộ sưu tập công cụ",
  navForest: "Hốc cây công cụ",
  titleDefault: "Kho phần mềm",
  titleAstronaut: "Kho vũ khí phần mềm",
  titleAcademia: "Bộ sưu tập công cụ",
  titleForest: "Hốc cây công cụ",
  descDefault: "Chăm chút những công cụ bạn thực sự tin dùng và lý do của chúng.",
  descAstronaut: "Những công cụ đã được kiểm định, xếp gọn và nén khí.",
  descAcademia: "Bộ dụng cụ quen thuộc trên kệ sách của bạn.",
  descForest: "Những công cụ náu mình trong thân cây cổ thụ.",
  promptDefault: "Nhập mã khoá",
  promptAstronaut: "Đặt lòng bàn tay để quét",
  promptAcademia: "Xoay chìa khoá",
  promptForest: "Chạm vào dấu tích",
  ctaDefault: "Mở kho",
  ctaAstronaut: "Bắt đầu quét",
  ctaAcademia: "Mở khoá",
  ctaForest: "Đánh thức",
  depositDefault: "Gửi vào kho",
  depositAstronaut: "Đưa vào kho vũ khí",
  depositAcademia: "Xếp vào bộ sưu tập",
  depositForest: "Đặt vào hốc cây",
  addBtnDefault: "Thêm app",
  addBtnAstronaut: "Yêu cầu công cụ",
  addBtnAcademia: "Đưa vào danh mục",
  addBtnForest: "Gieo một công cụ",
  addDialogDefault: "Thêm vào kho",
  addDialogAstronaut: "Yêu cầu công cụ mới",
  addDialogAcademia: "Đưa công cụ mới vào danh mục",
  addDialogForest: "Đón một công cụ mới",
  emptyDefault: "Kho vẫn đang trống",
  emptyAstronaut: "Kho vũ khí lặng thinh",
  emptyAcademia: "Kệ vẫn còn trống",
  emptyForest: "Hốc cây thật yên",
  emptyDescription: "Thêm công cụ đầu tiên để bắt đầu vẽ bản đồ stack của bạn.",
  skipLink: "Bỏ qua hiệu ứng",
  unlocking: "Đang mở khoá…",
  unlockedAnnouncement: "Đã mở khoá kho. Sẵn sàng xem thư viện.",
  reducedMotionNote: "Đã bật chế độ giảm chuyển động — mở kho trực tiếp.",
  mute: "Tắt tiếng",
  unmute: "Bật tiếng",
  lockBtn: "Khoá kho",
  compareBtn: "So sánh",
  monthlyTotal: "Tổng hàng tháng",
  coreCount: "Cốt lõi",
  totalCount: "Tổng",
  searchPlaceholder: "Tìm app…",
  galleryDefaultBadge: "Mặc định",
  filterStatus: "Trạng thái",
  filterPriority: "Ưu tiên",
  filterCostTier: "Chi phí",
  filterCategory: "Danh mục",
  sortRecent: "Mới thêm",
  sortAlpha: "Theo bảng chữ",
  sortMostUsed: "Dùng nhiều nhất",
  sortCostDesc: "Chi phí: cao đến thấp",
  promptLabel: "Bạn muốn thêm gì?",
  placeholder: "Tên hoặc URL (ví dụ: Linear, https://linear.app)",
  fetchCta: "Điền bằng AI",
  fetching: "Đang tìm…",
  retry: "Thử lại AI",
  aiGenerated: "Do AI tạo",
  manualEntry: "Nhập thủ công",
  interviewWhyUse: "Bạn chủ yếu dùng nó để làm gì?",
  interviewPriority: "Cốt lõi, đang dùng hay đang thử?",
  interviewDefaultToolFor: "Công cụ mặc định cho danh mục nào?",
  errorRateLimited: "Đã đạt giới hạn AI trong giờ. Hãy thử lại sau hoặc nhập thủ công.",
  errorNotFound: "Không tra được app đó. Bạn có thể chỉnh các ô bên dưới rồi lưu.",
  errorPartial: "Một số trường chưa tạo được — bạn có thể thử lại từng trường.",
  addToDefaultStack: "Thêm vào bộ công cụ mặc định",
  removeFromDefaultStack: "Bỏ khỏi bộ công cụ mặc định",
  inDefaultStack: "Đã nằm trong bộ mặc định",
  visitWebsite: "Mở website",
  relatedApps: "Thường dùng cùng",
  updatedAgo: (rel) => `Cập nhật cách đây ${rel}`,
  edit: "Sửa",
  del: "Xoá",
  fieldCategory: "Danh mục",
  fieldPlatforms: "Nền tảng",
  fieldCost: "Chi phí",
  fieldUseCases: "Trường hợp dùng",
  fieldWhyUseIt: "Vì sao tôi dùng",
  fieldBestFeature: "Tính năng hay nhất",
  fieldBiggestDownside: "Điểm trừ lớn nhất",
  fieldBestAlternative: "Lựa chọn thay thế",
  fieldReplaces: "Thay thế cho",
  fieldTags: "Thẻ",
  fieldDefaultToolFor: "Công cụ mặc định cho",
  fieldStatus: "Trạng thái",
  fieldPriority: "Ưu tiên",
  confirmDeleteTitle: "Xoá mục này?",
  confirmDeleteDescription: "App sẽ bị gỡ khỏi kho của bạn. Không thể hoàn tác.",
  confirmCancel: "Huỷ",
  confirmDelete: "Xoá",
  formSectionBasic: "Thông tin cơ bản",
  formSectionUsage: "Sử dụng",
  formSectionOpinion: "Cảm nhận",
  formAppName: "Tên app",
  formAppNamePh: "ví dụ: Cursor",
  formWebsiteUrl: "URL trang web",
  formIconUrl: "URL biểu tượng",
  formIconUrlPh: "https://…/icon.png",
  formIconPreview: "Biểu tượng app",
  formSummary: "Tóm tắt",
  formCategoryPh: "Năng suất, công cụ lập trình…",
  formPlatformsPh: "macOS, iOS, Web…",
  formCostType: "Kiểu chi phí",
  formCostAmount: "Số tiền",
  formCostAmountPh: "Để trống nếu miễn phí",
  formCostPeriod: "Chu kỳ",
  formCostPeriodPh: "tháng, năm…",
  formTagsPh: "phân cách bằng dấu phẩy",
  formAiBadge: "Do AI tạo",
  formEditTitle: (name) => `Chỉnh sửa ${name}`,
  formCancel: "Huỷ",
  formSaveChanges: "Lưu",
  modeGroupAria: "Khu vực kho phần mềm",
  modeMyVault: "Kho của tôi",
  modeRecommendedStacks: "Stack gợi ý",
  modeCompare: "So sánh",
  modeBuildMyStack: "Dựng stack cho tôi",
  modeWipTitle: "Đang hoàn thiện",
  modeWipBody:
    "Khu vực này đang được nối vào hệ thống. Hãy dùng « Kho của tôi » để quản lý công cụ cá nhân — stack gợi ý, trình dựng AI, so sánh và insight sẽ có ở các giai đoạn sau.",
  recFilterAria: "Lọc stack theo ngành",
  recFilterAll: "Mọi ngành",
  industryLabels: getVaultIndustryLabels("vi"),
  recDiffEasy: "Dễ triển khai",
  recDiffModerate: "Trung bình",
  recDiffAdvanced: "Nâng cao",
  recEstMonthly: (usd) =>
    usd == null || !Number.isFinite(usd) ? "Chi phí chưa rõ" : `~$${Math.round(usd)}/tháng`,
  recToolCount: (n) => `${n} công cụ`,
  recViewDetails: "Xem stack",
  recRoleLabel: "Vai trò",
  recAddEntireStack: "Thêm cả stack",
  recAddSelected: (n) => (n <= 0 ? "Thêm mục đã chọn" : `Thêm mục đã chọn (${n})`),
  recDepositing: "Đang thêm vào kho…",
  recDepositDone: (added, merged, skipped) => {
    const parts: string[] = [];
    if (added) parts.push(`${added} mới`);
    if (merged) parts.push(`gộp ${merged} mục có sẵn`);
    if (skipped) parts.push(`bỏ qua ${skipped}`);
    return parts.length ? parts.join(" · ") : "Không đổi";
  },
  recDepositFailed: "Không thêm được vào kho",
  recInVault: "Đã có trong kho",
  recSectionRationale: "Vì sao stack này hợp lý",
  recSectionTradeoffs: "Đánh đổi",
  recSectionSetup: "Thứ tự triển khai gợi ý",
  recSectionTools: "Công cụ trong stack",
  recVisitTool: "Mở trang web",
  recSelectAll: "Chọn tất cả",
  recSelectNone: "Bỏ chọn",
});

const VAULT_COPY: Record<AppLocale, Omit<VaultUiCopy, "buildStack" | "compare" | "insights">> = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
};

export function getVaultUiCopy(locale: AppLocale): VaultUiCopy {
  const base = VAULT_COPY[locale] ?? VAULT_COPY.en;
  const phase4 = getVaultPhase4Copy(locale);
  return {
    ...base,
    buildStack: getVaultBuildStackCopy(locale),
    compare: phase4.compare,
    insights: phase4.insights,
  };
}
