/**
 * Typed UI copy for the AI Knowledge (prompt arsenal) surface.
 *
 * Follows the existing TS-based i18n architecture: English is the source of
 * truth, other locales are `DeepPartial` overrides that fall back to English
 * for any missing key. Covers all nine supported app locales.
 */

import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { PromptTopCategory, PromptWizardStepId } from "@/types/prompt";

// ---------------------------------------------------------------------------
// Copy type
// ---------------------------------------------------------------------------

export type AiKnowledgeUiCopy = {
  pageTitle: string;
  pageDescription: string;

  header: {
    createPrompt: string;
    commandPaletteShortcut: string;
    commandPaletteHint: string;
  };

  tabs: {
    library: string;
    myPrompts: string;
    favorites: string;
    folders: string;
    recent: string;
    activity: string;
  };

  /** Multi-select toolbar + bulk actions (spans Library / My prompts / Favorites). */
  selection: {
    select: string;
    done: string;
    cancel: string;
    selectedCount: (n: number) => string;
    addToFolder: string;
    addToFavorites: string;
    delete: string;
    /** Primary CTA shown when the intent is to create a new folder. */
    createFolderFromSelection: (n: number) => string;
    emptyHint: string;
  };

  /** Folders surface — cards, detail drawer, create/edit form, quick strip. */
  folders: {
    quickStripTitle: string;
    newFolder: string;
    itemCount: (n: number) => string;
    open: string;
    addPrompts: string;
    removeFromFolder: string;
    rename: string;
    editFolder: string;
    deleteFolder: string;
    deleteConfirmTitle: string;
    deleteConfirmBody: (name: string) => string;
    deleteConfirmAction: string;
    detailEmpty: string;
    // create / edit form
    formCreateTitle: string;
    formEditTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    summaryLabel: string;
    summaryPlaceholder: string;
    iconLabel: string;
    autoFill: string;
    autoFilling: string;
    save: string;
    saving: string;
    create: string;
    creating: string;
    // add-to-folder picker
    pickTitle: string;
    pickDescription: string;
    pickCreateNew: string;
    pickExisting: string;
    pickNoFolders: string;
  };

  filters: {
    allCategories: string;
    allSubcategories: string;
    clearFilters: string;
    searchPlaceholder: string;
    tagFilterPlaceholder: string;
    layoutGrid: string;
    layoutList: string;
  };

  /**
   * Human-readable labels for the 12 curated top-level categories.
   * Keys must match the DB `top_category` enum (and `PromptTopCategory`).
   */
  topCategoryLabels: Record<PromptTopCategory, string>;

  /** Short one-line descriptions shown under each top-level category. */
  topCategoryBlurbs: Record<PromptTopCategory, string>;

  promptCard: {
    libraryBadge: string;
    customBadge: string;
    forkedFromBadge: (sourceSlug: string) => string;
    featuredBadge: string;
    favorite: string;
    unfavorite: string;
    run: string;
    fork: string;
    edit: string;
    delete: string;
    variablesCount: (n: number) => string;
    usedCount: (n: number) => string;
  };

  detail: {
    back: string;
    promptBody: string;
    variables: string;
    tags: string;
    source: string;
    sourceLink: string;
    license: (value: string) => string;
    attribution: (value: string) => string;
    copyBody: string;
    runWithAi: string;
    providerGemini: string;
  };

  /** Phase 5 — run log + quick stats on the Activity tab. */
  activity: {
    statsRuns: string;
    statsMyPrompts: string;
    statsFavorites: string;
    refresh: string;
    emptyTitle: string;
    emptyDescription: string;
    openPrompt: string;
    rerun: string;
    unknownPrompt: string;
    statusSucceeded: string;
    statusFailed: string;
    statusPending: string;
    statusRunning: string;
    statusCanceled: string;
    variablesUsed: string;
    snippet: string;
    error: string;
  };

  /** Phase 5 — in-place editor for custom prompts. */
  editDrawer: {
    title: string;
    description: string;
    save: string;
    saving: string;
  };

  /** Run-with-Gemini flow (variable form + result). */
  run: {
    title: string;
    description: string;
    submit: string;
    submitting: string;
    result: string;
    copyResult: string;
    close: string;
    requiredTag: string;
    optionalTag: string;
    variableHint: (name: string) => string;
    noVariables: string;
  };

  create: {
    pageTitle: string;
    pageDescription: string;
    startBlank: string;
    startWithWizard: string;
    /** Short value prop for the wizard card on the create landing page. */
    wizardComingSoon: string;
    blankCardBody: string;
    /** Shown after Edit copies the body and sends the user to the blank creator. */
    editCopyThenBlank: string;
    backToLibrary: string;
    /** Add-prompt modal (replaces full-page create flow). */
    modalTitle: string;
    modalDescription: string;
    addManually: string;
    addWithWizard: string;
    manualCardDescription: string;
    wizardCardDescription: string;
    /** Back from a sub-step to the two-card chooser. */
    modalBackToChoice: string;
    autoMetadataHint: string;
    autoMetadataLoading: string;
  };

  /** Phase 4 — guided prompt creator (8 steps + review). */
  createWizard: {
    pageTitle: string;
    pageDescription: string;
    stepOf: (current: number, total: number) => string;
    steps: Record<PromptWizardStepId, { title: string; hint: string }>;
    next: string;
    back: string;
    reviewTitle: string;
    reviewHint: string;
    backToSteps: string;
    generateDraft: string;
    regenerate: string;
    generating: string;
    titleLabel: string;
    descriptionLabel: string;
    bodyLabel: string;
    categoryLabel: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    savePrompt: string;
    saving: string;
    toneCommaHint: string;
    addVariable: string;
    removeVariable: string;
    varName: string;
    varLabel: string;
    varRequired: string;
    varDescription: string;
    addExample: string;
    removeExample: string;
    exampleUser: string;
    exampleExpected: string;
    blankPageTitle: string;
    blankPageDescription: string;
    blankTitle: string;
    blankDescription: string;
    blankBody: string;
    blankTags: string;
    blankSave: string;
    blankSaving: string;
  };

  states: {
    loading: string;
    errorTitle: string;
    errorBodyGeneric: string;
    emptyLibraryTitle: string;
    emptyLibraryDescription: string;
    emptyMyPromptsTitle: string;
    emptyMyPromptsDescription: string;
    emptyFavoritesTitle: string;
    emptyFavoritesDescription: string;
    emptyRecentTitle: string;
    emptyRecentDescription: string;
    emptyFoldersTitle: string;
    emptyFoldersDescription: string;
    noSearchResultsTitle: string;
    noSearchResultsDescription: string;
  };

  toast: {
    favoriteAdded: string;
    favoriteRemoved: string;
    favoriteFailed: string;
    forked: (title: string) => string;
    forkFailed: string;
    created: string;
    createFailed: string;
    updated: string;
    updateFailed: string;
    deleted: string;
    deleteFailed: string;
    runFailed: string;
    runSuccess: string;
    wizardSynthesisFailed: string;
    wizardDraftReady: string;
    copyBodySuccess: string;
    copyBodyFailed: string;
    folderCreated: (name: string) => string;
    folderCreateFailed: string;
    folderUpdated: string;
    folderUpdateFailed: string;
    folderDeleted: string;
    folderDeleteFailed: string;
    addedToFolder: (name: string) => string;
    addToFolderFailed: string;
    removedFromFolder: string;
    bulkFavorited: (n: number) => string;
    bulkDeleted: (n: number) => string;
    bulkDeleteSkippedLibrary: (n: number) => string;
    folderAutofillFailed: string;
  };
};

// ---------------------------------------------------------------------------
// English source of truth
// ---------------------------------------------------------------------------

const en: AiKnowledgeUiCopy = {
  pageTitle: "AI Knowledge",
  pageDescription:
    "Your personal prompt arsenal — curated library, custom prompts, and AI-assisted creation.",
  header: {
    createPrompt: "Create prompt",
    commandPaletteShortcut: "⌘K",
    commandPaletteHint: "Search all prompts",
  },
  tabs: {
    library: "Library",
    myPrompts: "My prompts",
    favorites: "Favorites",
    folders: "Folders",
    recent: "Recent",
    activity: "Activity",
  },
  selection: {
    select: "Select",
    done: "Done",
    cancel: "Cancel",
    selectedCount: (n) => (n === 1 ? "1 selected" : `${n} selected`),
    addToFolder: "Add to folder",
    addToFavorites: "Add to favorites",
    delete: "Delete",
    createFolderFromSelection: (n) =>
      n === 1 ? "Create folder from 1 prompt" : `Create folder from ${n} prompts`,
    emptyHint: "Pick prompts from any tab, then add them to a folder.",
  },
  folders: {
    quickStripTitle: "Folders",
    newFolder: "New folder",
    itemCount: (n) => (n === 1 ? "1 prompt" : `${n} prompts`),
    open: "Open",
    addPrompts: "Add prompts",
    removeFromFolder: "Remove from folder",
    rename: "Rename",
    editFolder: "Edit folder",
    deleteFolder: "Delete folder",
    deleteConfirmTitle: "Delete folder?",
    deleteConfirmBody: (name) =>
      `"${name}" will be removed. Your prompts stay safe — only the folder is deleted.`,
    deleteConfirmAction: "Delete folder",
    detailEmpty: "This folder is empty. Add prompts to start filling it.",
    formCreateTitle: "Create folder",
    formEditTitle: "Edit folder",
    nameLabel: "Folder name",
    namePlaceholder: "e.g. Writing toolkit",
    summaryLabel: "Summary",
    summaryPlaceholder: "One line on what this folder collects…",
    iconLabel: "Icon",
    autoFill: "Auto-fill with AI",
    autoFilling: "Naming with AI…",
    save: "Save folder",
    saving: "Saving…",
    create: "Create folder",
    creating: "Creating…",
    pickTitle: "Add to folder",
    pickDescription: "Drop the selected prompts into a folder.",
    pickCreateNew: "Create new folder",
    pickExisting: "Add to an existing folder",
    pickNoFolders: "No folders yet — create your first one.",
  },
  activity: {
    statsRuns: "Runs in history",
    statsMyPrompts: "My prompts",
    statsFavorites: "Favorites (library + custom)",
    refresh: "Refresh log",
    emptyTitle: "No runs yet",
    emptyDescription:
      "Execute a prompt with Run — each attempt appears here with status and a short snippet.",
    openPrompt: "Open prompt",
    rerun: "Re-run",
    unknownPrompt: "Prompt removed or unavailable",
    statusSucceeded: "Succeeded",
    statusFailed: "Failed",
    statusPending: "Pending",
    statusRunning: "Running",
    statusCanceled: "Canceled",
    variablesUsed: "Variables used",
    snippet: "Snippet",
    error: "Error",
  },
  editDrawer: {
    title: "Edit prompt",
    description: "Changes save to My prompts. Variable placeholders use {name} syntax.",
    save: "Save changes",
    saving: "Saving…",
  },
  filters: {
    allCategories: "All categories",
    allSubcategories: "All subcategories",
    clearFilters: "Clear filters",
    searchPlaceholder: "Search prompts…",
    tagFilterPlaceholder: "Filter by tag",
    layoutGrid: "Grid",
    layoutList: "List",
  },
  topCategoryLabels: {
    writing_content: "Writing & Content",
    productivity_planning: "Productivity & Planning",
    coding_development: "Coding & Development",
    research_analysis: "Research & Analysis",
    business_strategy: "Business & Strategy",
    learning_education: "Learning & Education",
    career_professional: "Career & Professional",
    life_personal_growth: "Life & Personal Growth",
    arts_creative: "Arts & Creative",
    language_learning: "Language Learning",
    expert_personas: "Expert Personas",
    meta_prompt_engineering: "Meta & Prompt Engineering",
  },
  topCategoryBlurbs: {
    writing_content: "Copywriting, editing, newsletters, creative writing.",
    productivity_planning: "Task breakdown, meeting notes, planning rituals.",
    coding_development: "Code review, debugging, architecture, testing.",
    research_analysis: "Literature review, competitive analysis, synthesis.",
    business_strategy: "Strategy, go-to-market, financials, pitching.",
    learning_education: "Tutoring, study plans, Socratic dialog.",
    career_professional: "Resumes, interviews, networking, negotiation.",
    life_personal_growth: "Journaling, reflection, relationships, habits.",
    arts_creative: "Music, story, visual direction, poetry.",
    language_learning: "Conversation, grammar, contextual translation.",
    expert_personas: "Lawyer, therapist, advisor, coach.",
    meta_prompt_engineering: "SuperPrompt, CoT, few-shot, self-review.",
  },
  promptCard: {
    libraryBadge: "Library",
    customBadge: "Custom",
    forkedFromBadge: (sourceSlug) => `Forked from ${sourceSlug}`,
    featuredBadge: "Featured",
    favorite: "Favorite",
    unfavorite: "Unfavorite",
    run: "Run",
    fork: "Fork",
    edit: "Edit",
    delete: "Delete",
    variablesCount: (n) =>
      n === 0 ? "No variables" : n === 1 ? "1 variable" : `${n} variables`,
    usedCount: (n) =>
      n === 0 ? "Never used" : n === 1 ? "Used once" : `Used ${n} times`,
  },
  detail: {
    back: "Back to prompts",
    promptBody: "Prompt body",
    variables: "Variables",
    tags: "Tags",
    source: "Source",
    sourceLink: "View source",
    license: (value) => `License: ${value}`,
    attribution: (value) => `Credit: ${value}`,
    copyBody: "Copy prompt",
    runWithAi: "Run with AI",
    providerGemini: "Gemini",
  },
  run: {
    title: "Run prompt",
    description:
      "Fill in the variables below. The assembled prompt is sent to Gemini; your run is saved to history.",
    submit: "Run with Gemini",
    submitting: "Running…",
    result: "Result",
    copyResult: "Copy result",
    close: "Close",
    requiredTag: "Required",
    optionalTag: "Optional",
    variableHint: (name) => `Value for {${name}}`,
    noVariables:
      "No {placeholders} in this prompt — the full text will be sent to Gemini as written.",
  },
  create: {
    pageTitle: "Create prompt",
    pageDescription: "Start blank or let the AI wizard scaffold one with you.",
    startBlank: "Start blank",
    startWithWizard: "Start with AI wizard",
    wizardComingSoon:
      "Eight guided steps (goal → examples), then Gemini drafts your prompt — edit and save when you are happy.",
    blankCardBody:
      "Write title, description, and full prompt body yourself. Variables use {name} placeholders.",
    editCopyThenBlank:
      "Prompt body copied. Paste it on the blank creator page to revise and save.",
    backToLibrary: "Back to library",
    modalTitle: "Add prompt",
    modalDescription:
      "Start from scratch or let the AI wizard guide you — same flow as before, now in a glass panel.",
    addManually: "Add Manually",
    addWithWizard: "Add with AI Wizard",
    manualCardDescription:
      "Write the full prompt body; tags, category, and short description can be filled automatically from your text.",
    wizardCardDescription:
      "Eight guided steps (goal → examples), then Gemini drafts your prompt — edit and save when you are happy.",
    modalBackToChoice: "Other options",
    autoMetadataHint:
      "After you write enough of the prompt body, we suggest tags, category, and a short description (you can edit them).",
    autoMetadataLoading: "Suggesting metadata…",
  },
  createWizard: {
    pageTitle: "AI prompt wizard",
    pageDescription:
      "Answer each step; on Review, generate a draft with Gemini, tweak it, then save to My prompts.",
    stepOf: (c, t) => `Step ${c} of ${t}`,
    steps: {
      goal: {
        title: "Goal",
        hint: "What should the AI help you accomplish? Be specific about success criteria.",
      },
      expert_role: {
        title: "Expert role",
        hint: "Who should the model act as? (e.g. “senior product manager”, “kind writing coach”).",
      },
      context: {
        title: "Context",
        hint: "Background the model needs: audience, product, constraints, links, or assumptions.",
      },
      output_format: {
        title: "Output format",
        hint: "How should the answer be structured? (bullets, JSON, memo, table, code blocks, etc.)",
      },
      tone_style: {
        title: "Tone & style",
        hint: "Comma-separated adjectives or short phrases (e.g. concise, warm, executive).",
      },
      variables: {
        title: "Variables",
        hint: "Define `{placeholder}` fields the user will fill at run time. Name must be letters, numbers, underscore.",
      },
      guardrails: {
        title: "Guardrails",
        hint: "What must the model never do? What should it double-check? Safety, privacy, or policy notes.",
      },
      examples: {
        title: "Examples",
        hint: "Optional few-shot pairs: sample user input and the ideal assistant reply.",
      },
    },
    next: "Next",
    back: "Back",
    reviewTitle: "Review & generate",
    reviewHint:
      "Generate a draft from your answers. You can edit title, description, body, category, and tags before saving.",
    backToSteps: "Edit earlier steps",
    generateDraft: "Generate draft with Gemini",
    regenerate: "Regenerate",
    generating: "Generating draft…",
    titleLabel: "Title",
    descriptionLabel: "Description",
    bodyLabel: "Prompt body",
    categoryLabel: "Top category",
    tagsLabel: "Tags",
    tagsPlaceholder: "comma, separated, tags",
    savePrompt: "Save to My prompts",
    saving: "Saving…",
    toneCommaHint: "e.g. concise, friendly, analytical",
    addVariable: "Add variable",
    removeVariable: "Remove",
    varName: "Token (e.g. topic)",
    varLabel: "Label",
    varRequired: "Required",
    varDescription: "Help text",
    addExample: "Add example pair",
    removeExample: "Remove example",
    exampleUser: "Sample user message",
    exampleExpected: "Ideal assistant reply",
    blankPageTitle: "Blank prompt",
    blankPageDescription:
      "Write your prompt directly. Use {variableName} for run-time inputs.",
    blankTitle: "Title",
    blankDescription: "Short description",
    blankBody: "Prompt body",
    blankTags: "Tags (comma-separated)",
    blankSave: "Save prompt",
    blankSaving: "Saving…",
  },
  states: {
    loading: "Loading prompts…",
    errorTitle: "Something went wrong",
    errorBodyGeneric: "We could not load your prompts. Please retry.",
    emptyLibraryTitle: "Library is empty",
    emptyLibraryDescription:
      "Run the seed script to import prompts from the awesome-prompts library.",
    emptyMyPromptsTitle: "No prompts yet",
    emptyMyPromptsDescription:
      "Fork a library prompt or create one from scratch to fill your arsenal.",
    emptyFavoritesTitle: "No favorites yet",
    emptyFavoritesDescription: "Star prompts you love to keep them one tap away.",
    emptyRecentTitle: "Nothing recent",
    emptyRecentDescription: "Prompts you run will surface here.",
    emptyFoldersTitle: "No folders yet",
    emptyFoldersDescription:
      "Group related prompts into folders — select prompts and let AI name the folder for you.",
    noSearchResultsTitle: "No matching prompts",
    noSearchResultsDescription:
      "Try a different keyword, tag, or category — or clear filters.",
  },
  toast: {
    favoriteAdded: "Added to favorites",
    favoriteRemoved: "Removed from favorites",
    favoriteFailed: "Couldn't update favorites",
    forked: (title) => `Forked "${title}" to your prompts`,
    forkFailed: "Couldn't fork this prompt",
    created: "Prompt created",
    createFailed: "Couldn't save prompt",
    updated: "Prompt updated",
    updateFailed: "Couldn't update prompt",
    deleted: "Prompt deleted",
    deleteFailed: "Couldn't delete prompt",
    runFailed: "Couldn't run the prompt. Check your AI key and try again.",
    runSuccess: "Run finished — output is below.",
    wizardSynthesisFailed: "Could not generate a draft. Check your AI key and try again.",
    wizardDraftReady: "Draft generated — review and save below.",
    copyBodySuccess: "Prompt copied to clipboard",
    copyBodyFailed: "Couldn't copy the prompt",
    folderCreated: (name) => `Folder "${name}" created`,
    folderCreateFailed: "Couldn't create the folder",
    folderUpdated: "Folder updated",
    folderUpdateFailed: "Couldn't update the folder",
    folderDeleted: "Folder deleted",
    folderDeleteFailed: "Couldn't delete the folder",
    addedToFolder: (name) => `Added to "${name}"`,
    addToFolderFailed: "Couldn't add to the folder",
    removedFromFolder: "Removed from folder",
    bulkFavorited: (n) =>
      n === 1 ? "1 prompt favorited" : `${n} prompts favorited`,
    bulkDeleted: (n) => (n === 1 ? "1 prompt deleted" : `${n} prompts deleted`),
    bulkDeleteSkippedLibrary: (n) =>
      n === 1
        ? "1 library prompt skipped (can't be deleted)"
        : `${n} library prompts skipped (can't be deleted)`,
    folderAutofillFailed: "Couldn't name the folder with AI. Fill it in manually.",
  },
};

// ---------------------------------------------------------------------------
// Locale overrides (Phase 1 covers the highest-value strings; full coverage
// fills out naturally as Phase 2/3/4 UI ships. Missing keys fall back to EN.)
// ---------------------------------------------------------------------------

const zhTW: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "AI 知識庫",
  pageDescription: "你的個人提示詞武器庫 — 精選收藏、自訂範本與 AI 輔助建立。",
  header: {
    createPrompt: "建立提示詞",
    commandPaletteHint: "搜尋所有提示詞",
  },
  tabs: {
    library: "精選庫",
    myPrompts: "我的提示詞",
    favorites: "最愛",
    folders: "資料夾",
    recent: "最近使用",
    activity: "執行紀錄",
  },
  selection: {
    select: "選取",
    done: "完成",
    cancel: "取消",
    selectedCount: (n) => `已選 ${n} 個`,
    addToFolder: "加入資料夾",
    addToFavorites: "加入最愛",
    delete: "刪除",
    createFolderFromSelection: (n) => `用這 ${n} 個提示詞建立資料夾`,
    emptyHint: "可橫跨任何分頁挑選提示詞，再一次過加入資料夾。",
  },
  folders: {
    quickStripTitle: "資料夾",
    newFolder: "新增資料夾",
    itemCount: (n) => `${n} 個提示詞`,
    open: "開啟",
    addPrompts: "加入提示詞",
    removeFromFolder: "移出資料夾",
    rename: "重新命名",
    editFolder: "編輯資料夾",
    deleteFolder: "刪除資料夾",
    deleteConfirmTitle: "刪除資料夾？",
    deleteConfirmBody: (name) =>
      `將會移除「${name}」。你的提示詞不會被刪除，只會移除這個資料夾。`,
    deleteConfirmAction: "刪除資料夾",
    detailEmpty: "這個資料夾還是空的，加入提示詞開始收藏吧。",
    formCreateTitle: "建立資料夾",
    formEditTitle: "編輯資料夾",
    nameLabel: "資料夾名稱",
    namePlaceholder: "例如：寫作工具箱",
    summaryLabel: "簡介",
    summaryPlaceholder: "用一句話說明這個資料夾收藏了什麼…",
    iconLabel: "圖示",
    autoFill: "用 AI 自動填寫",
    autoFilling: "AI 命名中…",
    save: "儲存資料夾",
    saving: "儲存中…",
    create: "建立資料夾",
    creating: "建立中…",
    pickTitle: "加入資料夾",
    pickDescription: "把已選的提示詞放進資料夾。",
    pickCreateNew: "建立新資料夾",
    pickExisting: "加入現有資料夾",
    pickNoFolders: "還沒有資料夾 — 建立第一個吧。",
  },
  filters: {
    allCategories: "所有分類",
    allSubcategories: "所有子分類",
    clearFilters: "清除篩選",
    searchPlaceholder: "搜尋提示詞…",
    tagFilterPlaceholder: "依標籤篩選",
    layoutGrid: "格狀",
    layoutList: "列表",
  },
  topCategoryLabels: {
    writing_content: "寫作與內容",
    productivity_planning: "生產力與規劃",
    coding_development: "程式開發",
    research_analysis: "研究與分析",
    business_strategy: "商業與策略",
    learning_education: "學習與教學",
    career_professional: "職涯與專業",
    life_personal_growth: "生活與成長",
    arts_creative: "藝術與創作",
    language_learning: "語言學習",
    expert_personas: "專家角色",
    meta_prompt_engineering: "Meta 與提示詞工程",
  },
  promptCard: {
    libraryBadge: "精選",
    customBadge: "自訂",
    featuredBadge: "精選",
    favorite: "加入最愛",
    unfavorite: "移除最愛",
    run: "執行",
    fork: "複製",
    edit: "編輯",
    delete: "刪除",
    variablesCount: (n) => (n === 0 ? "無變數" : `${n} 個變數`),
    usedCount: (n) => (n === 0 ? "尚未使用" : `已使用 ${n} 次`),
  },
  detail: {
    back: "返回提示詞列表",
    promptBody: "提示詞內容",
    variables: "變數",
    tags: "標籤",
    source: "來源",
    sourceLink: "查看原始檔",
    copyBody: "複製提示詞",
    runWithAi: "使用 AI 執行",
    providerGemini: "Gemini",
  },
  run: {
    title: "執行提示詞",
    description:
      "填寫下方變數。組合後的內容會送交 Gemini，並將此次執行記錄到歷史。",
    submit: "以 Gemini 執行",
    submitting: "執行中…",
    result: "結果",
    copyResult: "複製結果",
    close: "關閉",
    requiredTag: "必填",
    optionalTag: "選填",
    variableHint: (name) => `{${name}} 的值`,
    noVariables: "此提示詞沒有變數占位符 — 將以原文送交 Gemini。",
  },
  create: {
    pageTitle: "建立提示詞",
    pageDescription: "從空白開始，或讓 AI 小幫手陪你一起打造。",
    startBlank: "從空白開始",
    startWithWizard: "使用 AI 小幫手",
    wizardComingSoon:
      "八個引導步驟（目標→範例），接著由 Gemini 產出草稿，你可再編輯後儲存。",
    blankCardBody:
      "自行撰寫標題、說明與完整內容；變數請使用 {名稱} 占位符。",
    editCopyThenBlank:
      "已複製提示詞內容。請在「從空白建立」頁面貼上並修改後儲存。",
    backToLibrary: "返回精選庫",
    modalTitle: "新增提示詞",
    modalDescription:
      "與知識庫相同的玻璃面板：手動撰寫或由 AI 精靈引導，全程不需離開此頁。",
    addManually: "手動新增",
    addWithWizard: "使用 AI 精靈新增",
    manualCardDescription:
      "先撰寫完整提示詞內容；系統會依內容建議標籤、分類與簡短說明（你可再修改）。",
    wizardCardDescription:
      "八個引導步驟（目標→範例），接著由 Gemini 產出草稿，你可再編輯後儲存。",
    modalBackToChoice: "其他方式",
    autoMetadataHint:
      "輸入足夠長度的提示詞內容後，會自動建議標籤、頂層分類與簡短說明（皆可手動調整）。",
    autoMetadataLoading: "正在產生建議…",
  },
  createWizard: {
    pageTitle: "AI 提示詞小幫手",
    stepOf: (c, t) => `第 ${c} 步，共 ${t} 步`,
  },
  states: {
    loading: "載入提示詞中…",
    errorTitle: "發生錯誤",
    errorBodyGeneric: "無法載入你的提示詞，請稍後再試。",
    emptyLibraryTitle: "精選庫為空",
    emptyLibraryDescription: "執行 seed 腳本以匯入 awesome-prompts 的內容。",
    emptyMyPromptsTitle: "尚未建立提示詞",
    emptyMyPromptsDescription: "從精選庫複製或從空白建立，打造屬於你的武器庫。",
    emptyFavoritesTitle: "尚無最愛",
    emptyFavoritesDescription: "將喜愛的提示詞加入最愛，方便隨時使用。",
    emptyRecentTitle: "尚無紀錄",
    emptyRecentDescription: "執行過的提示詞會出現在這裡。",
    emptyFoldersTitle: "尚未建立資料夾",
    emptyFoldersDescription:
      "把相關的提示詞整理成資料夾 — 選取提示詞，讓 AI 幫你命名。",
    noSearchResultsTitle: "找不到提示詞",
    noSearchResultsDescription: "試試其他關鍵字、標籤或分類，或清除篩選條件。",
  },
  toast: {
    favoriteAdded: "已加入最愛",
    favoriteRemoved: "已移除最愛",
    favoriteFailed: "更新最愛失敗",
    forked: (title) => `已將「${title}」複製到你的提示詞`,
    forkFailed: "複製提示詞失敗",
    created: "提示詞已建立",
    createFailed: "儲存提示詞失敗",
    updated: "提示詞已更新",
    updateFailed: "更新提示詞失敗",
    deleted: "提示詞已刪除",
    deleteFailed: "刪除提示詞失敗",
    runFailed: "無法執行提示詞，請檢查 AI 金鑰後重試。",
    runSuccess: "執行完成，結果如下。",
    wizardSynthesisFailed: "無法產生草稿，請檢查 AI 金鑰後重試。",
    wizardDraftReady: "草稿已產生，請於下方檢視並儲存。",
    copyBodySuccess: "提示詞已複製到剪貼簿",
    copyBodyFailed: "複製失敗",
    folderCreated: (name) => `已建立資料夾「${name}」`,
    folderCreateFailed: "建立資料夾失敗",
    folderUpdated: "資料夾已更新",
    folderUpdateFailed: "更新資料夾失敗",
    folderDeleted: "資料夾已刪除",
    folderDeleteFailed: "刪除資料夾失敗",
    addedToFolder: (name) => `已加入「${name}」`,
    addToFolderFailed: "加入資料夾失敗",
    removedFromFolder: "已移出資料夾",
    bulkFavorited: (n) => `已將 ${n} 個提示詞加入最愛`,
    bulkDeleted: (n) => `已刪除 ${n} 個提示詞`,
    bulkDeleteSkippedLibrary: (n) => `已略過 ${n} 個系統範本（無法刪除）`,
    folderAutofillFailed: "AI 命名失敗，請手動填寫。",
  },
};

const zhCN: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "AI 知识库",
  pageDescription: "你的个人提示词武器库 — 精选收藏、自定义模板与 AI 辅助创建。",
  header: {
    createPrompt: "创建提示词",
    commandPaletteHint: "搜索所有提示词",
  },
  tabs: {
    library: "精选库",
    myPrompts: "我的提示词",
    favorites: "收藏",
    recent: "最近使用",
    activity: "运行记录",
  },
  filters: {
    allCategories: "全部分类",
    allSubcategories: "全部子分类",
    clearFilters: "清除筛选",
    searchPlaceholder: "搜索提示词…",
    tagFilterPlaceholder: "按标签筛选",
    layoutGrid: "网格",
    layoutList: "列表",
  },
  topCategoryLabels: {
    writing_content: "写作与内容",
    productivity_planning: "生产力与规划",
    coding_development: "编程与开发",
    research_analysis: "研究与分析",
    business_strategy: "商业与战略",
    learning_education: "学习与教育",
    career_professional: "职业与专业",
    life_personal_growth: "生活与成长",
    arts_creative: "艺术与创作",
    language_learning: "语言学习",
    expert_personas: "专家角色",
    meta_prompt_engineering: "Meta 与提示词工程",
  },
  promptCard: {
    libraryBadge: "精选",
    customBadge: "自定义",
    featuredBadge: "精选",
    favorite: "收藏",
    unfavorite: "取消收藏",
    run: "运行",
    fork: "复制",
    edit: "编辑",
    delete: "删除",
    variablesCount: (n) => (n === 0 ? "无变量" : `${n} 个变量`),
    usedCount: (n) => (n === 0 ? "未使用过" : `已使用 ${n} 次`),
  },
  detail: {
    back: "返回提示词列表",
    promptBody: "提示词正文",
    variables: "变量",
    tags: "标签",
    source: "来源",
    sourceLink: "查看源文件",
    copyBody: "复制提示词",
    runWithAi: "用 AI 运行",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "创建提示词",
    pageDescription: "从空白开始，或让 AI 向导陪你一步步搭好。",
    startBlank: "从空白开始",
    startWithWizard: "使用 AI 向导",
    wizardComingSoon: "对话式向导将在第四阶段上线，目前请先从空白创建。",
    backToLibrary: "返回精选库",
  },
  states: {
    loading: "正在加载提示词…",
    errorTitle: "出错啦",
    errorBodyGeneric: "无法加载你的提示词，请稍后再试。",
    emptyLibraryTitle: "精选库为空",
    emptyLibraryDescription: "运行 seed 脚本即可从 awesome-prompts 导入提示词。",
    emptyMyPromptsTitle: "暂无提示词",
    emptyMyPromptsDescription: "从精选库复制或从空白创建，打造你的武器库。",
    emptyFavoritesTitle: "暂无收藏",
    emptyFavoritesDescription: "把喜欢的提示词收藏起来方便快速使用。",
    emptyRecentTitle: "暂无记录",
    emptyRecentDescription: "运行过的提示词会出现在这里。",
    noSearchResultsTitle: "没有匹配的提示词",
    noSearchResultsDescription: "换个关键字、标签或分类，或清除筛选。",
  },
  toast: {
    favoriteAdded: "已加入收藏",
    favoriteRemoved: "已取消收藏",
    favoriteFailed: "更新收藏失败",
    forked: (title) => `已将"${title}"复制到你的提示词`,
    forkFailed: "复制提示词失败",
    created: "提示词已创建",
    createFailed: "保存失败",
    updated: "提示词已更新",
    updateFailed: "更新失败",
    deleted: "提示词已删除",
    deleteFailed: "删除失败",
    runFailed: "运行失败，请检查 AI 密钥后重试。",
    copyBodySuccess: "提示词已复制到剪贴板",
    copyBodyFailed: "复制失败",
  },
};

const ja: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "AI ナレッジ",
  pageDescription:
    "あなた専用のプロンプト武器庫 — 厳選ライブラリとカスタム作成、AI サポート。",
  header: {
    createPrompt: "プロンプトを作成",
    commandPaletteHint: "すべてのプロンプトを検索",
  },
  tabs: {
    library: "ライブラリ",
    myPrompts: "マイプロンプト",
    favorites: "お気に入り",
    recent: "最近",
    activity: "アクティビティ",
  },
  filters: {
    allCategories: "すべてのカテゴリ",
    allSubcategories: "すべてのサブカテゴリ",
    clearFilters: "フィルタをクリア",
    searchPlaceholder: "プロンプトを検索…",
    tagFilterPlaceholder: "タグでフィルタ",
    layoutGrid: "グリッド",
    layoutList: "リスト",
  },
  topCategoryLabels: {
    writing_content: "執筆 & コンテンツ",
    productivity_planning: "生産性 & 計画",
    coding_development: "コーディング",
    research_analysis: "リサーチ & 分析",
    business_strategy: "ビジネス & 戦略",
    learning_education: "学習 & 教育",
    career_professional: "キャリア & プロフェッショナル",
    life_personal_growth: "生活 & 自己成長",
    arts_creative: "アート & クリエイティブ",
    language_learning: "語学学習",
    expert_personas: "専門家ペルソナ",
    meta_prompt_engineering: "メタ & プロンプトエンジニアリング",
  },
  promptCard: {
    libraryBadge: "ライブラリ",
    customBadge: "カスタム",
    featuredBadge: "注目",
    favorite: "お気に入り",
    unfavorite: "解除",
    run: "実行",
    fork: "複製",
    edit: "編集",
    delete: "削除",
    variablesCount: (n) => (n === 0 ? "変数なし" : `${n} 個の変数`),
    usedCount: (n) => (n === 0 ? "未使用" : `${n} 回使用`),
  },
  detail: {
    back: "プロンプト一覧へ戻る",
    promptBody: "プロンプト本文",
    variables: "変数",
    tags: "タグ",
    source: "出典",
    sourceLink: "ソースを表示",
    copyBody: "プロンプトをコピー",
    runWithAi: "AI で実行",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "プロンプト作成",
    pageDescription: "ゼロから始めるか、AI ウィザードに手伝ってもらいましょう。",
    startBlank: "ゼロから作成",
    startWithWizard: "AI ウィザードを使う",
    wizardComingSoon:
      "会話型ウィザードはフェーズ 4 で登場予定です。今はゼロから作成してください。",
    backToLibrary: "ライブラリへ戻る",
  },
  states: {
    loading: "プロンプトを読み込み中…",
    errorTitle: "エラーが発生しました",
    errorBodyGeneric: "読み込みに失敗しました。もう一度お試しください。",
    emptyLibraryTitle: "ライブラリが空です",
    emptyLibraryDescription:
      "seed スクリプトを実行して awesome-prompts をインポートしてください。",
    emptyMyPromptsTitle: "プロンプトはまだありません",
    emptyMyPromptsDescription:
      "ライブラリから複製するか、ゼロから作成して武器庫を構築しましょう。",
    emptyFavoritesTitle: "お気に入りはまだありません",
    emptyFavoritesDescription: "気に入ったプロンプトをお気に入りに追加できます。",
    emptyRecentTitle: "履歴なし",
    emptyRecentDescription: "実行したプロンプトがここに表示されます。",
    noSearchResultsTitle: "該当なし",
    noSearchResultsDescription: "別のキーワードやタグ、カテゴリを試してみてください。",
  },
  toast: {
    favoriteAdded: "お気に入りに追加しました",
    favoriteRemoved: "お気に入りから外しました",
    favoriteFailed: "お気に入りの更新に失敗しました",
    forked: (title) => `"${title}" をマイプロンプトに複製しました`,
    forkFailed: "プロンプトの複製に失敗しました",
    created: "プロンプトを作成しました",
    createFailed: "保存に失敗しました",
    updated: "プロンプトを更新しました",
    updateFailed: "更新に失敗しました",
    deleted: "プロンプトを削除しました",
    deleteFailed: "削除に失敗しました",
    runFailed: "実行に失敗しました。AI キーを確認してください。",
    copyBodySuccess: "プロンプトをクリップボードにコピーしました",
    copyBodyFailed: "コピーに失敗しました",
  },
};

const ko: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "AI 지식 저장소",
  pageDescription:
    "나만의 프롬프트 무기고 — 큐레이션 라이브러리, 커스텀 프롬프트, AI 지원 생성.",
  header: {
    createPrompt: "프롬프트 만들기",
    commandPaletteHint: "모든 프롬프트 검색",
  },
  tabs: {
    library: "라이브러리",
    myPrompts: "내 프롬프트",
    favorites: "즐겨찾기",
    recent: "최근",
    activity: "활동",
  },
  filters: {
    allCategories: "모든 카테고리",
    allSubcategories: "모든 하위 카테고리",
    clearFilters: "필터 초기화",
    searchPlaceholder: "프롬프트 검색…",
    tagFilterPlaceholder: "태그로 필터",
    layoutGrid: "그리드",
    layoutList: "리스트",
  },
  topCategoryLabels: {
    writing_content: "글쓰기 & 콘텐츠",
    productivity_planning: "생산성 & 플래닝",
    coding_development: "코딩 & 개발",
    research_analysis: "리서치 & 분석",
    business_strategy: "비즈니스 & 전략",
    learning_education: "학습 & 교육",
    career_professional: "커리어 & 전문성",
    life_personal_growth: "삶 & 성장",
    arts_creative: "예술 & 창작",
    language_learning: "언어 학습",
    expert_personas: "전문가 페르소나",
    meta_prompt_engineering: "메타 & 프롬프트 엔지니어링",
  },
  promptCard: {
    libraryBadge: "라이브러리",
    customBadge: "커스텀",
    featuredBadge: "추천",
    favorite: "즐겨찾기",
    unfavorite: "즐겨찾기 해제",
    run: "실행",
    fork: "복제",
    edit: "편집",
    delete: "삭제",
    variablesCount: (n) => (n === 0 ? "변수 없음" : `변수 ${n}개`),
    usedCount: (n) => (n === 0 ? "미사용" : `${n}회 사용`),
  },
  detail: {
    back: "프롬프트 목록으로",
    promptBody: "프롬프트 본문",
    variables: "변수",
    tags: "태그",
    source: "출처",
    sourceLink: "원본 보기",
    copyBody: "프롬프트 복사",
    runWithAi: "AI로 실행",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "프롬프트 만들기",
    pageDescription: "처음부터 시작하거나 AI 마법사의 도움을 받으세요.",
    startBlank: "처음부터 시작",
    startWithWizard: "AI 마법사 사용",
    wizardComingSoon:
      "대화형 마법사는 4단계에 출시됩니다. 지금은 처음부터 시작해 주세요.",
    backToLibrary: "라이브러리로 돌아가기",
  },
  states: {
    loading: "프롬프트를 불러오는 중…",
    errorTitle: "문제가 발생했습니다",
    errorBodyGeneric: "프롬프트를 불러오지 못했습니다. 다시 시도해 주세요.",
    emptyLibraryTitle: "라이브러리가 비어 있어요",
    emptyLibraryDescription:
      "seed 스크립트를 실행하여 awesome-prompts를 가져오세요.",
    emptyMyPromptsTitle: "아직 프롬프트가 없어요",
    emptyMyPromptsDescription:
      "라이브러리에서 복제하거나 처음부터 만들어 무기고를 채워보세요.",
    emptyFavoritesTitle: "즐겨찾기가 없어요",
    emptyFavoritesDescription: "마음에 드는 프롬프트를 즐겨찾기에 추가해 보세요.",
    emptyRecentTitle: "기록 없음",
    emptyRecentDescription: "실행한 프롬프트가 여기에 표시됩니다.",
    noSearchResultsTitle: "검색 결과 없음",
    noSearchResultsDescription: "다른 키워드, 태그, 카테고리로 시도해 보세요.",
  },
  toast: {
    favoriteAdded: "즐겨찾기에 추가됨",
    favoriteRemoved: "즐겨찾기에서 제거됨",
    favoriteFailed: "즐겨찾기 업데이트 실패",
    forked: (title) => `"${title}"을(를) 내 프롬프트에 복제했어요`,
    forkFailed: "복제에 실패했어요",
    created: "프롬프트가 생성됨",
    createFailed: "저장 실패",
    updated: "프롬프트가 업데이트됨",
    updateFailed: "업데이트 실패",
    deleted: "프롬프트 삭제됨",
    deleteFailed: "삭제 실패",
    runFailed: "실행 실패. AI 키를 확인한 뒤 다시 시도해 주세요.",
    copyBodySuccess: "프롬프트가 클립보드에 복사됨",
    copyBodyFailed: "복사 실패",
  },
};

const fr: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "Connaissance IA",
  pageDescription:
    "Votre arsenal personnel de prompts — bibliothèque, prompts custom, création assistée.",
  header: {
    createPrompt: "Créer un prompt",
    commandPaletteHint: "Rechercher les prompts",
  },
  tabs: {
    library: "Bibliothèque",
    myPrompts: "Mes prompts",
    favorites: "Favoris",
    recent: "Récents",
    activity: "Activité",
  },
  filters: {
    allCategories: "Toutes catégories",
    allSubcategories: "Toutes sous-catégories",
    clearFilters: "Effacer les filtres",
    searchPlaceholder: "Rechercher des prompts…",
    tagFilterPlaceholder: "Filtrer par tag",
    layoutGrid: "Grille",
    layoutList: "Liste",
  },
  topCategoryLabels: {
    writing_content: "Écriture & Contenu",
    productivity_planning: "Productivité & Planification",
    coding_development: "Code & Développement",
    research_analysis: "Recherche & Analyse",
    business_strategy: "Business & Stratégie",
    learning_education: "Apprentissage & Éducation",
    career_professional: "Carrière & Pro",
    life_personal_growth: "Vie & Croissance perso",
    arts_creative: "Arts & Création",
    language_learning: "Apprentissage des langues",
    expert_personas: "Personas d'experts",
    meta_prompt_engineering: "Méta & Ingénierie de prompts",
  },
  promptCard: {
    libraryBadge: "Bibliothèque",
    customBadge: "Custom",
    featuredBadge: "À la une",
    favorite: "Favori",
    unfavorite: "Retirer",
    run: "Exécuter",
    fork: "Dupliquer",
    edit: "Modifier",
    delete: "Supprimer",
    variablesCount: (n) =>
      n === 0 ? "Aucune variable" : n === 1 ? "1 variable" : `${n} variables`,
    usedCount: (n) =>
      n === 0
        ? "Jamais utilisé"
        : n === 1
          ? "Utilisé 1 fois"
          : `Utilisé ${n} fois`,
  },
  detail: {
    back: "Retour aux prompts",
    promptBody: "Corps du prompt",
    variables: "Variables",
    tags: "Tags",
    source: "Source",
    sourceLink: "Voir la source",
    copyBody: "Copier le prompt",
    runWithAi: "Exécuter avec l'IA",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "Créer un prompt",
    pageDescription:
      "Commencer de zéro ou laisser l'assistant IA vous guider.",
    startBlank: "Commencer de zéro",
    startWithWizard: "Utiliser l'assistant IA",
    wizardComingSoon:
      "L'assistant conversationnel arrive en Phase 4. En attendant, partez de zéro.",
    backToLibrary: "Retour à la bibliothèque",
  },
  states: {
    loading: "Chargement des prompts…",
    errorTitle: "Une erreur est survenue",
    errorBodyGeneric: "Impossible de charger vos prompts. Réessayez.",
    emptyLibraryTitle: "Bibliothèque vide",
    emptyLibraryDescription:
      "Lancez le script de seed pour importer awesome-prompts.",
    emptyMyPromptsTitle: "Aucun prompt",
    emptyMyPromptsDescription:
      "Dupliquez depuis la bibliothèque ou créez-en un nouveau.",
    emptyFavoritesTitle: "Aucun favori",
    emptyFavoritesDescription:
      "Ajoutez vos prompts favoris pour les garder à portée.",
    emptyRecentTitle: "Rien de récent",
    emptyRecentDescription: "Les prompts exécutés apparaîtront ici.",
    noSearchResultsTitle: "Aucun résultat",
    noSearchResultsDescription:
      "Essayez un autre mot-clé, tag, ou catégorie.",
  },
  toast: {
    favoriteAdded: "Ajouté aux favoris",
    favoriteRemoved: "Retiré des favoris",
    favoriteFailed: "Impossible de mettre à jour les favoris",
    forked: (title) => `« ${title} » dupliqué dans vos prompts`,
    forkFailed: "Impossible de dupliquer",
    created: "Prompt créé",
    createFailed: "Impossible d'enregistrer",
    updated: "Prompt mis à jour",
    updateFailed: "Impossible de mettre à jour",
    deleted: "Prompt supprimé",
    deleteFailed: "Impossible de supprimer",
    runFailed: "Exécution impossible. Vérifiez votre clé IA et réessayez.",
    copyBodySuccess: "Prompt copié dans le presse-papiers",
    copyBodyFailed: "Impossible de copier",
  },
};

const it: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "Conoscenza IA",
  pageDescription:
    "Il tuo arsenale personale di prompt — libreria, prompt custom, creazione assistita.",
  header: {
    createPrompt: "Crea prompt",
    commandPaletteHint: "Cerca tutti i prompt",
  },
  tabs: {
    library: "Libreria",
    myPrompts: "I miei prompt",
    favorites: "Preferiti",
    recent: "Recenti",
    activity: "Attività",
  },
  filters: {
    allCategories: "Tutte le categorie",
    allSubcategories: "Tutte le sottocategorie",
    clearFilters: "Cancella filtri",
    searchPlaceholder: "Cerca prompt…",
    tagFilterPlaceholder: "Filtra per tag",
    layoutGrid: "Griglia",
    layoutList: "Elenco",
  },
  topCategoryLabels: {
    writing_content: "Scrittura & Contenuti",
    productivity_planning: "Produttività & Pianificazione",
    coding_development: "Coding & Sviluppo",
    research_analysis: "Ricerca & Analisi",
    business_strategy: "Business & Strategia",
    learning_education: "Apprendimento & Educazione",
    career_professional: "Carriera & Professionale",
    life_personal_growth: "Vita & Crescita personale",
    arts_creative: "Arte & Creatività",
    language_learning: "Apprendimento lingue",
    expert_personas: "Personaggi esperti",
    meta_prompt_engineering: "Meta & Ingegneria del prompt",
  },
  promptCard: {
    libraryBadge: "Libreria",
    customBadge: "Custom",
    featuredBadge: "In evidenza",
    favorite: "Preferito",
    unfavorite: "Rimuovi",
    run: "Esegui",
    fork: "Duplica",
    edit: "Modifica",
    delete: "Elimina",
    variablesCount: (n) =>
      n === 0 ? "Nessuna variabile" : n === 1 ? "1 variabile" : `${n} variabili`,
    usedCount: (n) =>
      n === 0 ? "Mai usato" : n === 1 ? "Usato 1 volta" : `Usato ${n} volte`,
  },
  detail: {
    back: "Torna ai prompt",
    promptBody: "Corpo del prompt",
    variables: "Variabili",
    tags: "Tag",
    source: "Fonte",
    sourceLink: "Mostra fonte",
    copyBody: "Copia prompt",
    runWithAi: "Esegui con IA",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "Crea prompt",
    pageDescription: "Partendo da zero o con l'aiuto della procedura guidata IA.",
    startBlank: "Parti da zero",
    startWithWizard: "Usa la procedura guidata",
    wizardComingSoon:
      "La procedura guidata arriva nella Fase 4. Per ora parti da zero.",
    backToLibrary: "Torna alla libreria",
  },
  states: {
    loading: "Caricamento prompt…",
    errorTitle: "Qualcosa è andato storto",
    errorBodyGeneric: "Impossibile caricare i prompt. Riprova.",
    emptyLibraryTitle: "Libreria vuota",
    emptyLibraryDescription:
      "Esegui lo script di seed per importare awesome-prompts.",
    emptyMyPromptsTitle: "Nessun prompt",
    emptyMyPromptsDescription:
      "Duplica dalla libreria o crea un nuovo prompt da zero.",
    emptyFavoritesTitle: "Nessun preferito",
    emptyFavoritesDescription:
      "Aggiungi ai preferiti i prompt che usi più spesso.",
    emptyRecentTitle: "Nessuna attività recente",
    emptyRecentDescription: "I prompt che esegui appariranno qui.",
    noSearchResultsTitle: "Nessun risultato",
    noSearchResultsDescription:
      "Prova un'altra parola chiave, tag o categoria.",
  },
  toast: {
    favoriteAdded: "Aggiunto ai preferiti",
    favoriteRemoved: "Rimosso dai preferiti",
    favoriteFailed: "Impossibile aggiornare i preferiti",
    forked: (title) => `"${title}" duplicato nei tuoi prompt`,
    forkFailed: "Impossibile duplicare",
    created: "Prompt creato",
    createFailed: "Impossibile salvare",
    updated: "Prompt aggiornato",
    updateFailed: "Impossibile aggiornare",
    deleted: "Prompt eliminato",
    deleteFailed: "Impossibile eliminare",
    runFailed: "Esecuzione fallita. Controlla la chiave IA e riprova.",
    copyBodySuccess: "Prompt copiato negli appunti",
    copyBodyFailed: "Impossibile copiare",
  },
};

const es: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "Conocimiento IA",
  pageDescription:
    "Tu arsenal personal de prompts — biblioteca curada, prompts propios y creación asistida.",
  header: {
    createPrompt: "Crear prompt",
    commandPaletteHint: "Buscar todos los prompts",
  },
  tabs: {
    library: "Biblioteca",
    myPrompts: "Mis prompts",
    favorites: "Favoritos",
    recent: "Recientes",
    activity: "Actividad",
  },
  filters: {
    allCategories: "Todas las categorías",
    allSubcategories: "Todas las subcategorías",
    clearFilters: "Limpiar filtros",
    searchPlaceholder: "Buscar prompts…",
    tagFilterPlaceholder: "Filtrar por etiqueta",
    layoutGrid: "Cuadrícula",
    layoutList: "Lista",
  },
  topCategoryLabels: {
    writing_content: "Escritura y Contenido",
    productivity_planning: "Productividad y Planificación",
    coding_development: "Código y Desarrollo",
    research_analysis: "Investigación y Análisis",
    business_strategy: "Negocios y Estrategia",
    learning_education: "Aprendizaje y Educación",
    career_professional: "Carrera y Profesional",
    life_personal_growth: "Vida y Crecimiento",
    arts_creative: "Arte y Creatividad",
    language_learning: "Aprendizaje de idiomas",
    expert_personas: "Personas expertas",
    meta_prompt_engineering: "Meta e ingeniería de prompts",
  },
  promptCard: {
    libraryBadge: "Biblioteca",
    customBadge: "Propio",
    featuredBadge: "Destacado",
    favorite: "Favorito",
    unfavorite: "Quitar",
    run: "Ejecutar",
    fork: "Duplicar",
    edit: "Editar",
    delete: "Eliminar",
    variablesCount: (n) =>
      n === 0 ? "Sin variables" : n === 1 ? "1 variable" : `${n} variables`,
    usedCount: (n) =>
      n === 0 ? "Nunca usado" : n === 1 ? "Usado 1 vez" : `Usado ${n} veces`,
  },
  detail: {
    back: "Volver a los prompts",
    promptBody: "Cuerpo del prompt",
    variables: "Variables",
    tags: "Etiquetas",
    source: "Fuente",
    sourceLink: "Ver fuente",
    copyBody: "Copiar prompt",
    runWithAi: "Ejecutar con IA",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "Crear prompt",
    pageDescription:
      "Empieza en blanco o deja que el asistente IA te guíe paso a paso.",
    startBlank: "Empezar en blanco",
    startWithWizard: "Usar asistente IA",
    wizardComingSoon:
      "El asistente conversacional llega en la Fase 4. Por ahora, empieza en blanco.",
    backToLibrary: "Volver a la biblioteca",
  },
  states: {
    loading: "Cargando prompts…",
    errorTitle: "Algo salió mal",
    errorBodyGeneric: "No pudimos cargar tus prompts. Inténtalo de nuevo.",
    emptyLibraryTitle: "Biblioteca vacía",
    emptyLibraryDescription:
      "Ejecuta el script de seed para importar awesome-prompts.",
    emptyMyPromptsTitle: "No hay prompts",
    emptyMyPromptsDescription:
      "Duplica desde la biblioteca o crea uno nuevo desde cero.",
    emptyFavoritesTitle: "No hay favoritos",
    emptyFavoritesDescription:
      "Marca tus prompts preferidos para tenerlos a mano.",
    emptyRecentTitle: "Sin actividad reciente",
    emptyRecentDescription: "Los prompts que ejecutes aparecerán aquí.",
    noSearchResultsTitle: "Sin resultados",
    noSearchResultsDescription:
      "Prueba otra palabra, etiqueta o categoría.",
  },
  toast: {
    favoriteAdded: "Añadido a favoritos",
    favoriteRemoved: "Quitado de favoritos",
    favoriteFailed: "No se pudo actualizar favoritos",
    forked: (title) => `"${title}" duplicado en tus prompts`,
    forkFailed: "No se pudo duplicar",
    created: "Prompt creado",
    createFailed: "No se pudo guardar",
    updated: "Prompt actualizado",
    updateFailed: "No se pudo actualizar",
    deleted: "Prompt eliminado",
    deleteFailed: "No se pudo eliminar",
    runFailed: "Error de ejecución. Verifica tu clave IA.",
    copyBodySuccess: "Prompt copiado al portapapeles",
    copyBodyFailed: "No se pudo copiar",
  },
};

const vi: DeepPartial<AiKnowledgeUiCopy> = {
  pageTitle: "Kho tri thức AI",
  pageDescription:
    "Kho prompt cá nhân — thư viện chọn lọc, prompt tự tạo và AI hỗ trợ.",
  header: {
    createPrompt: "Tạo prompt",
    commandPaletteHint: "Tìm kiếm mọi prompt",
  },
  tabs: {
    library: "Thư viện",
    myPrompts: "Prompt của tôi",
    favorites: "Yêu thích",
    recent: "Gần đây",
    activity: "Hoạt động",
  },
  filters: {
    allCategories: "Tất cả danh mục",
    allSubcategories: "Tất cả danh mục con",
    clearFilters: "Xoá bộ lọc",
    searchPlaceholder: "Tìm prompt…",
    tagFilterPlaceholder: "Lọc theo thẻ",
    layoutGrid: "Lưới",
    layoutList: "Danh sách",
  },
  topCategoryLabels: {
    writing_content: "Viết & Nội dung",
    productivity_planning: "Năng suất & Lập kế hoạch",
    coding_development: "Lập trình & Phát triển",
    research_analysis: "Nghiên cứu & Phân tích",
    business_strategy: "Kinh doanh & Chiến lược",
    learning_education: "Học tập & Giáo dục",
    career_professional: "Sự nghiệp & Chuyên môn",
    life_personal_growth: "Cuộc sống & Phát triển cá nhân",
    arts_creative: "Nghệ thuật & Sáng tạo",
    language_learning: "Học ngôn ngữ",
    expert_personas: "Nhân vật chuyên gia",
    meta_prompt_engineering: "Meta & Kỹ thuật prompt",
  },
  promptCard: {
    libraryBadge: "Thư viện",
    customBadge: "Tự tạo",
    featuredBadge: "Nổi bật",
    favorite: "Yêu thích",
    unfavorite: "Bỏ yêu thích",
    run: "Chạy",
    fork: "Sao chép",
    edit: "Sửa",
    delete: "Xoá",
    variablesCount: (n) =>
      n === 0 ? "Không có biến" : `${n} biến`,
    usedCount: (n) => (n === 0 ? "Chưa dùng" : `Đã dùng ${n} lần`),
  },
  detail: {
    back: "Về danh sách prompt",
    promptBody: "Nội dung prompt",
    variables: "Biến",
    tags: "Thẻ",
    source: "Nguồn",
    sourceLink: "Xem nguồn",
    copyBody: "Sao chép prompt",
    runWithAi: "Chạy với AI",
    providerGemini: "Gemini",
  },
  create: {
    pageTitle: "Tạo prompt",
    pageDescription: "Bắt đầu trắng hoặc để trợ lý AI hướng dẫn bạn.",
    startBlank: "Bắt đầu trắng",
    startWithWizard: "Dùng trợ lý AI",
    wizardComingSoon:
      "Trợ lý hội thoại sẽ có ở Phase 4. Trước mắt hãy bắt đầu trắng.",
    backToLibrary: "Về thư viện",
  },
  states: {
    loading: "Đang tải prompt…",
    errorTitle: "Có lỗi xảy ra",
    errorBodyGeneric: "Không tải được prompt. Vui lòng thử lại.",
    emptyLibraryTitle: "Thư viện trống",
    emptyLibraryDescription:
      "Chạy script seed để nhập kho prompt từ awesome-prompts.",
    emptyMyPromptsTitle: "Chưa có prompt",
    emptyMyPromptsDescription:
      "Sao chép từ thư viện hoặc tạo mới từ trắng để xây kho của bạn.",
    emptyFavoritesTitle: "Chưa có yêu thích",
    emptyFavoritesDescription:
      "Đánh dấu yêu thích để truy cập nhanh các prompt ưa dùng.",
    emptyRecentTitle: "Chưa có hoạt động gần đây",
    emptyRecentDescription: "Prompt đã chạy sẽ hiển thị ở đây.",
    noSearchResultsTitle: "Không có kết quả",
    noSearchResultsDescription: "Thử từ khoá, thẻ hoặc danh mục khác.",
  },
  toast: {
    favoriteAdded: "Đã thêm vào yêu thích",
    favoriteRemoved: "Đã bỏ yêu thích",
    favoriteFailed: "Không cập nhật được yêu thích",
    forked: (title) => `Đã sao chép "${title}" vào prompt của bạn`,
    forkFailed: "Không sao chép được prompt",
    created: "Đã tạo prompt",
    createFailed: "Không lưu được prompt",
    updated: "Đã cập nhật prompt",
    updateFailed: "Không cập nhật được",
    deleted: "Đã xoá prompt",
    deleteFailed: "Không xoá được",
    runFailed: "Chạy thất bại. Hãy kiểm tra khoá AI và thử lại.",
    copyBodySuccess: "Đã sao chép prompt vào bộ nhớ tạm",
    copyBodyFailed: "Không sao chép được",
  },
};

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------

const localized = createLocaleCopyMap<AiKnowledgeUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getAiKnowledgeUiCopy(locale: AppLocale): AiKnowledgeUiCopy {
  return localized[locale] ?? localized.en;
}
