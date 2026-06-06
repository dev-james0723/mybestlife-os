import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { AITool, PromptCategory } from "@/types/ai-coach";

export type PromptCategoryLabels = Record<PromptCategory, string>;
export type AIToolLabels = Record<AITool, string>;

export type AICoachCopy = {
  pageTitle: string;
  pageDescription: string;
  landing: {
    coachCardTitle: string;
    coachCardDescription: string;
    openCoach: string;
  };
  breadcrumb: {
    career: string;
    coach: string;
    use: string;
  };
  searchPlaceholder: string;
  tabs: {
    all: string;
    favorites: string;
    recent: string;
  };
  categoriesHeader: string;
  categories: PromptCategoryLabels;
  allCategoriesLabel: string;
  card: {
    use: string;
    favorite: string;
    unfavorite: string;
    edit: string;
    delete: string;
    customBadge: string;
    premiumBadge: string;
    usedCount: (n: number) => string;
    requiresVars: (n: number) => string;
    attachesFiles: (n: number) => string;
  };
  empty: {
    noPrompts: string;
    noResults: string;
    noFavorites: string;
    noRecent: string;
  };
  customCta: {
    create: string;
    edit: string;
  };
  profile: {
    title: string;
    description: string;
    edit: string;
    incompleteBanner: string;
    fields: {
      currentRole: string;
      industry: string;
      yearsExperience: string;
      topSkills: string;
      careerGoals: string;
      painPoints: string;
      targetRoles: string;
    };
    placeholders: {
      currentRole: string;
      industry: string;
      yearsExperience: string;
      topSkills: string;
      careerGoals: string;
      painPoints: string;
      targetRoles: string;
    };
    hints: {
      skillsHint: string;
      rolesHint: string;
    };
    save: string;
    saving: string;
    cancel: string;
  };
  flow: {
    stepIndicator: (current: number, total: number) => string;
    steps: {
      variables: string;
      attachments: string;
      aiTool: string;
      preview: string;
    };
    variables: {
      title: string;
      description: string;
      requiredBadge: string;
      optionalBadge: string;
      requiredError: string;
      fillPlaceholder: (name: string) => string;
    };
    attachments: {
      title: string;
      description: string;
      noFilesInCategory: string;
      goToVault: string;
      selectedCount: (n: number) => string;
      skipStep: string;
    };
    aiTool: {
      title: string;
      description: string;
      useDefault: (toolName: string) => string;
      estimatedTokens: (approx: number) => string;
      charCount: (n: number) => string;
      noPrefillNote: string;
      prefillNote: string;
      customMissing: string;
    };
    preview: {
      title: string;
      description: string;
      edit: string;
      finish: string;
      copy: string;
      dispatch: string;
      hideToggle: string;
    };
    nav: {
      back: string;
      next: string;
      dispatch: string;
      cancel: string;
    };
  };
  toast: {
    promptCopied: (toolName: string) => string;
    promptCopiedGeneric: string;
    opened: (toolName: string) => string;
    attachReminder: string;
    profileSaved: string;
    preferencesSaved: string;
    customCreated: string;
    customUpdated: string;
    customDeleted: string;
    favoriteAdded: string;
    favoriteRemoved: string;
    saveFailed: string;
    copyFailed: string;
    openFailed: string;
    urlTruncatedFallback: string;
  };
  custom: {
    create: string;
    edit: string;
    fields: {
      title: string;
      icon: string;
      tags: string;
      body: string;
      attachmentCategories: string;
      requiredVars: string;
      optionalVars: string;
    };
    placeholders: {
      title: string;
      tags: string;
      body: string;
    };
    bodyHint: string;
    detectedVars: string;
    noVarsDetected: string;
    save: string;
    saving: string;
    cancel: string;
    deleteConfirmTitle: string;
    deleteConfirmDescription: (title: string) => string;
    deleteConfirm: string;
    deleting: string;
  };
  settings: {
    title: string;
    description: string;
    defaultAI: {
      label: string;
      hint: string;
    };
    customAI: {
      urlLabel: string;
      urlPlaceholder: string;
      nameLabel: string;
      namePlaceholder: string;
      hint: string;
    };
    promptLanguage: {
      label: string;
      hint: string;
      followProfile: string;
    };
    autoCopy: {
      label: string;
      hint: string;
    };
    showPreview: {
      label: string;
      hint: string;
    };
    allowAIAnalysis: {
      label: string;
      hint: string;
      privacy: string;
    };
    versionRetention: {
      label: string;
      hint: string;
      options: {
        ten: string;
        twentyFive: string;
        hundred: string;
      };
    };
    save: string;
    saving: string;
  };
  tools: AIToolLabels;
  vaultAction: {
    useWithAI: string;
  };
  errors: {
    loadFailed: string;
    templateNotFound: string;
    profileIncomplete: string;
  };
};

const base: AICoachCopy = {
  pageTitle: "AI Career Coach",
  pageDescription:
    "A prompt, template, and action library for resumes, interviews, transitions, branding, applications, and career growth.",
  landing: {
    coachCardTitle: "AI Career Coach",
    coachCardDescription:
      "Run a proven prompt in ChatGPT, Claude, Gemini, and more — pre-filled with your profile.",
    openCoach: "Open Coach",
  },
  breadcrumb: {
    career: "Career",
    coach: "AI Coach",
    use: "Use Prompt",
  },
  searchPlaceholder: "Search prompts…",
  tabs: {
    all: "All",
    favorites: "Favorites",
    recent: "Recent",
  },
  categoriesHeader: "By category",
  categories: {
    resume: "Resume",
    interview: "Interview",
    discovery: "Discovery",
    transition: "Pivot",
    growth: "Growth",
    branding: "Branding",
    application: "Application",
    other: "Other",
  },
  allCategoriesLabel: "All",
  card: {
    use: "Use",
    favorite: "Favorite",
    unfavorite: "Unfavorite",
    edit: "Edit",
    delete: "Delete",
    customBadge: "Custom",
    premiumBadge: "Pro",
    usedCount: (n) => (n === 1 ? "Used once" : `Used ${n} times`),
    requiresVars: (n) =>
      n === 1 ? "1 variable needed" : `${n} variables needed`,
    attachesFiles: (n) => (n === 1 ? "Attaches 1 file" : `Attaches ${n} files`),
  },
  empty: {
    noPrompts: "No prompts yet.",
    noResults: "No prompts match your filters.",
    noFavorites: "Star a prompt to add it here.",
    noRecent: "Prompts you run will show up here.",
  },
  customCta: {
    create: "+ Create custom prompt",
    edit: "Edit custom prompt",
  },
  profile: {
    title: "Your career profile",
    description:
      "Fill this once. Every prompt will include these details automatically.",
    edit: "Edit profile",
    incompleteBanner:
      "Add your career profile so every prompt includes your context automatically.",
    fields: {
      currentRole: "Current role",
      industry: "Industry",
      yearsExperience: "Years of experience",
      topSkills: "Top skills",
      careerGoals: "Career goals",
      painPoints: "Current challenges",
      targetRoles: "Target roles",
    },
    placeholders: {
      currentRole: "e.g. Senior Product Designer",
      industry: "e.g. FinTech",
      yearsExperience: "e.g. 8",
      topSkills: "Comma-separated: design systems, Figma, research…",
      careerGoals: "What you're working toward in the next 12-24 months.",
      painPoints: "The biggest career blockers you're facing right now.",
      targetRoles: "Comma-separated: Head of Design, Design Director…",
    },
    hints: {
      skillsHint: "Up to 15 skills. Comma-separated.",
      rolesHint: "Roles you'd apply for. Comma-separated.",
    },
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
  },
  flow: {
    stepIndicator: (c, t) => `Step ${c} of ${t}`,
    steps: {
      variables: "Variables",
      attachments: "Attachments",
      aiTool: "AI Tool",
      preview: "Preview",
    },
    variables: {
      title: "Fill in the details",
      description: "These replace the [VARIABLES] in the prompt.",
      requiredBadge: "Required",
      optionalBadge: "Optional",
      requiredError: "Please fill all required fields.",
      fillPlaceholder: (name) => `Enter ${name.toLowerCase()}…`,
    },
    attachments: {
      title: "Attach files",
      description: "Pick Vault files to reference. They'll be listed in the prompt.",
      noFilesInCategory:
        "You don't have any files in the suggested categories yet.",
      goToVault: "Go to Vault",
      selectedCount: (n) => `${n} selected`,
      skipStep: "Skip — no files needed",
    },
    aiTool: {
      title: "Choose your AI",
      description: "Where should we send this prompt?",
      useDefault: (name) => `Use default (${name})`,
      estimatedTokens: (n) => `~${n.toLocaleString()} tokens`,
      charCount: (n) => `${n.toLocaleString()} characters`,
      noPrefillNote:
        "This tool doesn't accept prompts via URL. We'll open it and copy your prompt — paste it with Cmd+V / Ctrl+V.",
      prefillNote:
        "Prompt will be pre-filled in the URL and also copied to your clipboard.",
      customMissing:
        "Add a custom AI URL in Settings → AI Preferences first.",
    },
    preview: {
      title: "Review and send",
      description: "You can still tweak the prompt before dispatching.",
      edit: "Edit",
      finish: "Done editing",
      copy: "Copy",
      dispatch: "Dispatch to AI",
      hideToggle: "Hide preview on future runs",
    },
    nav: {
      back: "Back",
      next: "Next",
      dispatch: "Dispatch",
      cancel: "Cancel",
    },
  },
  toast: {
    promptCopied: (name) => `Prompt copied — paste it in ${name} (Cmd/Ctrl+V).`,
    promptCopiedGeneric: "Prompt copied to clipboard.",
    opened: (name) => `Opened ${name} in a new tab.`,
    attachReminder:
      "Don't forget: paste each attached file in the AI chat after you send the prompt.",
    profileSaved: "Career profile saved.",
    preferencesSaved: "AI preferences saved.",
    customCreated: "Custom prompt created.",
    customUpdated: "Custom prompt updated.",
    customDeleted: "Custom prompt deleted.",
    favoriteAdded: "Added to favorites.",
    favoriteRemoved: "Removed from favorites.",
    saveFailed: "Could not save. Please try again.",
    copyFailed:
      "Couldn't copy automatically. Select the preview and copy manually.",
    openFailed:
      "Browser blocked opening the AI. Prompt was copied — open the AI manually and paste.",
    urlTruncatedFallback:
      "Prompt was too long for the URL. Opened homepage — paste from clipboard.",
  },
  custom: {
    create: "Create custom prompt",
    edit: "Edit custom prompt",
    fields: {
      title: "Title",
      icon: "Icon",
      tags: "Tags",
      body: "Prompt body",
      attachmentCategories: "Which Vault categories attach here?",
      requiredVars: "Required variables",
      optionalVars: "Optional variables",
    },
    placeholders: {
      title: "e.g. Weekly career check-in",
      tags: "Comma-separated tags",
      body: "Write your prompt. Use [VARIABLE_NAME] for placeholders.",
    },
    bodyHint: "Use [VARIABLE_NAME] anywhere you want user input.",
    detectedVars: "Detected variables",
    noVarsDetected: "No variables detected yet.",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    deleteConfirmTitle: "Delete custom prompt?",
    deleteConfirmDescription: (title) =>
      `"${title}" will be permanently removed.`,
    deleteConfirm: "Delete",
    deleting: "Deleting…",
  },
  settings: {
    title: "AI Preferences",
    description:
      "Tell us which AI you prefer so the Coach sends prompts straight there.",
    defaultAI: {
      label: "Default AI tool",
      hint: "Used when you dispatch a prompt without picking manually.",
    },
    customAI: {
      urlLabel: "Custom AI URL",
      urlPlaceholder: "https://…",
      nameLabel: "Display name",
      namePlaceholder: "e.g. My Company LLM",
      hint: "Used when you pick 'Custom' in the tool selector.",
    },
    promptLanguage: {
      label: "Prompt language",
      hint:
        "The language the AI will think in. Default follows your app language.",
      followProfile: "Follow app language",
    },
    autoCopy: {
      label: "Auto-copy prompt to clipboard",
      hint: "We always copy as a fallback, even when URL pre-fill works.",
    },
    showPreview: {
      label: "Show prompt preview before dispatch",
      hint: "Review step where you can still edit the final prompt.",
    },
    allowAIAnalysis: {
      label: "Allow AI analysis for smart tags",
      hint: "When on, a quick summary of newly uploaded files is sent to Anthropic to suggest category, tags, and description.",
      privacy:
        "We never store the file content server-side. Disable any time.",
    },
    versionRetention: {
      label: "Version retention",
      hint: "How many past versions to keep per file. Older versions are auto-archived.",
      options: {
        ten: "Keep last 10 (default)",
        twentyFive: "Keep last 25",
        hundred: "Keep last 100",
      },
    },
    save: "Save preferences",
    saving: "Saving…",
  },
  tools: {
    chatgpt: "ChatGPT",
    claude: "Claude",
    gemini: "Gemini",
    perplexity: "Perplexity",
    grok: "Grok",
    custom: "Custom",
  },
  vaultAction: {
    useWithAI: "Use with AI",
  },
  errors: {
    loadFailed: "Could not load. Please refresh.",
    templateNotFound: "Prompt not found.",
    profileIncomplete:
      "We'll skip your profile context for now. Add details in your career profile for richer prompts.",
  },
};

const zhTW: DeepPartial<AICoachCopy> = {
  pageTitle: "AI 職涯教練",
  pageDescription: "精選提示庫，將 Vault 檔案連接到任何 AI 工具。",
  landing: {
    coachCardTitle: "AI 職涯教練",
    coachCardDescription:
      "在 ChatGPT、Claude、Gemini 等工具中運行驗證過的提示——預填你的個人檔案。",
    openCoach: "開啟教練",
  },
  breadcrumb: { career: "職涯", coach: "AI 教練", use: "使用提示" },
  searchPlaceholder: "搜尋提示…",
  tabs: { all: "全部", favorites: "我的最愛", recent: "最近使用" },
  categoriesHeader: "依分類",
  categories: {
    resume: "履歷",
    interview: "面試",
    discovery: "探索",
    transition: "轉換",
    growth: "成長",
    branding: "品牌",
    application: "應徵",
    other: "其他",
  },
  allCategoriesLabel: "全部",
  card: {
    use: "使用",
    favorite: "加入最愛",
    unfavorite: "取消最愛",
    edit: "編輯",
    delete: "刪除",
    customBadge: "自訂",
    premiumBadge: "Pro",
    usedCount: (n) => (n === 1 ? "使用 1 次" : `使用 ${n} 次`),
    requiresVars: (n) => `需要 ${n} 個變數`,
    attachesFiles: (n) => `附加 ${n} 個檔案`,
  },
  empty: {
    noPrompts: "還沒有提示。",
    noResults: "沒有符合篩選條件的提示。",
    noFavorites: "把喜愛的提示加星號即可顯示在這。",
    noRecent: "你執行過的提示會出現在這裡。",
  },
  customCta: { create: "+ 建立自訂提示", edit: "編輯自訂提示" },
  profile: {
    title: "你的職涯檔案",
    description: "填寫一次即可，每個提示都會自動帶入這些資訊。",
    edit: "編輯檔案",
    incompleteBanner: "完善職涯檔案，讓每個提示都能自動帶入你的背景。",
    fields: {
      currentRole: "目前職位",
      industry: "產業",
      yearsExperience: "年資",
      topSkills: "主要專長",
      careerGoals: "職涯目標",
      painPoints: "目前挑戰",
      targetRoles: "目標職位",
    },
    placeholders: {
      currentRole: "例：資深產品設計師",
      industry: "例：金融科技",
      yearsExperience: "例：8",
      topSkills: "用逗號分隔：設計系統、Figma、使用者研究…",
      careerGoals: "未來 12-24 個月想達成的目標。",
      painPoints: "目前最大的職涯瓶頸。",
      targetRoles: "用逗號分隔：設計總監、設計主管…",
    },
    hints: {
      skillsHint: "最多 15 項，逗號分隔。",
      rolesHint: "你想應徵的角色，逗號分隔。",
    },
    save: "儲存",
    saving: "儲存中…",
    cancel: "取消",
  },
  flow: {
    stepIndicator: (c, t) => `第 ${c} / ${t} 步`,
    steps: {
      variables: "變數",
      attachments: "附件",
      aiTool: "AI 工具",
      preview: "預覽",
    },
    variables: {
      title: "填寫細節",
      description: "這些內容會取代提示中的 [變數]。",
      requiredBadge: "必填",
      optionalBadge: "選填",
      requiredError: "請填寫所有必要欄位。",
      fillPlaceholder: (name) => `輸入 ${name.toLowerCase()}…`,
    },
    attachments: {
      title: "附加檔案",
      description: "挑選要引用的 Vault 檔案，會列在提示中。",
      noFilesInCategory: "建議的分類中還沒有檔案。",
      goToVault: "前往 Vault",
      selectedCount: (n) => `已選 ${n} 個`,
      skipStep: "略過——不需要檔案",
    },
    aiTool: {
      title: "選擇 AI",
      description: "要把提示送到哪裡？",
      useDefault: (name) => `使用預設（${name}）`,
      estimatedTokens: (n) => `約 ${n.toLocaleString()} tokens`,
      charCount: (n) => `${n.toLocaleString()} 字元`,
      noPrefillNote:
        "此工具不接受 URL 提示，我們會開啟它並複製提示，請按 Cmd+V / Ctrl+V 貼上。",
      prefillNote: "提示會預先填入 URL 並同時複製到剪貼簿。",
      customMissing: "請先在 設定 → AI 偏好 加上自訂 AI URL。",
    },
    preview: {
      title: "檢查並送出",
      description: "送出前還可以微調提示。",
      edit: "編輯",
      finish: "完成編輯",
      copy: "複製",
      dispatch: "送到 AI",
      hideToggle: "以後不顯示預覽",
    },
    nav: { back: "上一步", next: "下一步", dispatch: "送出", cancel: "取消" },
  },
  toast: {
    promptCopied: (name) => `提示已複製——請在 ${name} 按 Cmd/Ctrl+V 貼上。`,
    promptCopiedGeneric: "提示已複製到剪貼簿。",
    opened: (name) => `已在新分頁開啟 ${name}。`,
    attachReminder: "別忘了：送出提示後，請在 AI 對話中貼上每個附件檔案。",
    profileSaved: "職涯檔案已儲存。",
    preferencesSaved: "AI 偏好已儲存。",
    customCreated: "自訂提示已建立。",
    customUpdated: "自訂提示已更新。",
    customDeleted: "自訂提示已刪除。",
    favoriteAdded: "已加入最愛。",
    favoriteRemoved: "已從最愛移除。",
    saveFailed: "儲存失敗，請再試一次。",
    copyFailed: "無法自動複製，請手動選取預覽內容。",
    openFailed: "瀏覽器阻擋開啟 AI。提示已複製，請手動開啟 AI 並貼上。",
    urlTruncatedFallback: "提示太長，改用首頁開啟，請從剪貼簿貼上。",
  },
  custom: {
    create: "建立自訂提示",
    edit: "編輯自訂提示",
    fields: {
      title: "標題",
      icon: "圖示",
      tags: "標籤",
      body: "提示內容",
      attachmentCategories: "哪些 Vault 分類會附加到這裡？",
      requiredVars: "必要變數",
      optionalVars: "選填變數",
    },
    placeholders: {
      title: "例：每週職涯自我檢視",
      tags: "用逗號分隔的標籤",
      body: "撰寫你的提示，用 [變數名稱] 代表要填入的地方。",
    },
    bodyHint: "在想讓使用者輸入的位置使用 [變數名稱]。",
    detectedVars: "偵測到的變數",
    noVarsDetected: "目前沒有偵測到變數。",
    save: "儲存",
    saving: "儲存中…",
    cancel: "取消",
    deleteConfirmTitle: "刪除自訂提示？",
    deleteConfirmDescription: (title) => `「${title}」將被永久刪除。`,
    deleteConfirm: "刪除",
    deleting: "刪除中…",
  },
  settings: {
    title: "AI 偏好",
    description: "告訴我們你慣用哪個 AI，教練就能直接送過去。",
    defaultAI: {
      label: "預設 AI 工具",
      hint: "沒有手動挑選時會使用此工具。",
    },
    customAI: {
      urlLabel: "自訂 AI 網址",
      urlPlaceholder: "https://…",
      nameLabel: "顯示名稱",
      namePlaceholder: "例：公司內部 LLM",
      hint: "當你選「自訂」時會使用。",
    },
    promptLanguage: {
      label: "提示語言",
      hint: "AI 會以此語言回覆，預設跟隨應用程式語言。",
      followProfile: "跟隨應用程式語言",
    },
    autoCopy: {
      label: "自動複製提示到剪貼簿",
      hint: "即使可用 URL 預填，我們仍會複製作為後備。",
    },
    showPreview: {
      label: "送出前顯示提示預覽",
      hint: "可在檢閱步驟再次編輯最終提示。",
    },
    allowAIAnalysis: {
      label: "允許 AI 分析檔案以產生智慧標籤",
      hint: "開啟後，上傳檔案時會將摘要傳送給 Anthropic，由 AI 建議分類、標籤與描述。",
      privacy: "系統不會在伺服器端儲存檔案內容，隨時可關閉。",
    },
    versionRetention: {
      label: "版本保留數量",
      hint: "每份檔案保留多少份舊版本，更舊的會自動封存。",
      options: {
        ten: "保留最近 10 份（預設）",
        twentyFive: "保留最近 25 份",
        hundred: "保留最近 100 份",
      },
    },
    save: "儲存偏好",
    saving: "儲存中…",
  },
  vaultAction: { useWithAI: "用 AI 處理" },
  errors: {
    loadFailed: "讀取失敗，請重新整理。",
    templateNotFound: "找不到提示。",
    profileIncomplete: "先略過你的檔案內容，填寫後提示會更豐富。",
  },
};

const zhCN: DeepPartial<AICoachCopy> = {
  pageTitle: "AI 职业教练",
  pageDescription: "精选提示库，将 Vault 文件连接到任何 AI 工具。",
  landing: {
    coachCardTitle: "AI 职业教练",
    coachCardDescription:
      "在 ChatGPT、Claude、Gemini 等工具中运行验证过的提示——自动预填你的个人资料。",
    openCoach: "打开教练",
  },
  breadcrumb: { career: "职业", coach: "AI 教练", use: "使用提示" },
  searchPlaceholder: "搜索提示…",
  tabs: { all: "全部", favorites: "收藏", recent: "最近" },
  categoriesHeader: "按分类",
  categories: {
    resume: "简历",
    interview: "面试",
    discovery: "探索",
    transition: "转型",
    growth: "成长",
    branding: "品牌",
    application: "求职",
    other: "其他",
  },
  allCategoriesLabel: "全部",
  card: {
    use: "使用",
    favorite: "收藏",
    unfavorite: "取消收藏",
    edit: "编辑",
    delete: "删除",
    customBadge: "自定义",
    premiumBadge: "Pro",
    usedCount: (n) => (n === 1 ? "使用 1 次" : `使用 ${n} 次`),
    requiresVars: (n) => `需要 ${n} 个变量`,
    attachesFiles: (n) => `附加 ${n} 个文件`,
  },
  empty: {
    noPrompts: "还没有提示。",
    noResults: "没有符合条件的提示。",
    noFavorites: "给喜欢的提示加星标即可显示在这里。",
    noRecent: "你用过的提示会显示在这里。",
  },
  customCta: { create: "+ 创建自定义提示", edit: "编辑自定义提示" },
  profile: {
    title: "你的职业档案",
    description: "填一次即可，每个提示都会自动带入这些信息。",
    edit: "编辑档案",
    incompleteBanner: "补全职业档案，每次提示都会自动加入你的背景。",
    fields: {
      currentRole: "当前职位",
      industry: "行业",
      yearsExperience: "工作年限",
      topSkills: "核心技能",
      careerGoals: "职业目标",
      painPoints: "当前挑战",
      targetRoles: "目标职位",
    },
    placeholders: {
      currentRole: "例：资深产品设计师",
      industry: "例：金融科技",
      yearsExperience: "例：8",
      topSkills: "用逗号分隔：设计系统、Figma、用户研究…",
      careerGoals: "未来 12-24 个月想要达成的目标。",
      painPoints: "目前最大的职业瓶颈。",
      targetRoles: "用逗号分隔：设计总监、设计负责人…",
    },
    hints: {
      skillsHint: "最多 15 项，逗号分隔。",
      rolesHint: "你想应聘的角色，逗号分隔。",
    },
    save: "保存",
    saving: "保存中…",
    cancel: "取消",
  },
  flow: {
    stepIndicator: (c, t) => `第 ${c} / ${t} 步`,
    steps: {
      variables: "变量",
      attachments: "附件",
      aiTool: "AI 工具",
      preview: "预览",
    },
    variables: {
      title: "填写细节",
      description: "这些内容会替换提示中的 [变量]。",
      requiredBadge: "必填",
      optionalBadge: "选填",
      requiredError: "请填写所有必填字段。",
      fillPlaceholder: (name) => `请输入 ${name.toLowerCase()}…`,
    },
    attachments: {
      title: "附加文件",
      description: "挑选要引用的 Vault 文件，会列在提示中。",
      noFilesInCategory: "建议分类中还没有文件。",
      goToVault: "前往 Vault",
      selectedCount: (n) => `已选 ${n} 个`,
      skipStep: "跳过——不需要文件",
    },
    aiTool: {
      title: "选择 AI",
      description: "要把提示发送到哪里？",
      useDefault: (name) => `使用默认（${name}）`,
      estimatedTokens: (n) => `约 ${n.toLocaleString()} tokens`,
      charCount: (n) => `${n.toLocaleString()} 字符`,
      noPrefillNote:
        "此工具不支持 URL 预填，我们会打开它并复制提示，请按 Cmd+V / Ctrl+V 粘贴。",
      prefillNote: "提示会预填到 URL 并同时复制到剪贴板。",
      customMissing: "请先在 设置 → AI 偏好 中添加自定义 AI URL。",
    },
    preview: {
      title: "检查并发送",
      description: "发送前你还可以微调提示。",
      edit: "编辑",
      finish: "完成编辑",
      copy: "复制",
      dispatch: "发送到 AI",
      hideToggle: "今后不再显示预览",
    },
    nav: { back: "上一步", next: "下一步", dispatch: "发送", cancel: "取消" },
  },
  toast: {
    promptCopied: (name) => `提示已复制——请在 ${name} 按 Cmd/Ctrl+V 粘贴。`,
    promptCopiedGeneric: "提示已复制到剪贴板。",
    opened: (name) => `已在新标签页打开 ${name}。`,
    attachReminder: "别忘了：发送提示后，请在 AI 会话中粘贴每个附加文件。",
    profileSaved: "职业档案已保存。",
    preferencesSaved: "AI 偏好已保存。",
    customCreated: "自定义提示已创建。",
    customUpdated: "自定义提示已更新。",
    customDeleted: "自定义提示已删除。",
    favoriteAdded: "已添加到收藏。",
    favoriteRemoved: "已从收藏移除。",
    saveFailed: "保存失败，请重试。",
    copyFailed: "无法自动复制，请手动选取预览内容。",
    openFailed: "浏览器阻止了打开 AI。提示已复制，请手动打开 AI 并粘贴。",
    urlTruncatedFallback: "提示过长，已打开首页，请从剪贴板粘贴。",
  },
  vaultAction: { useWithAI: "用 AI 处理" },
};

const ja: DeepPartial<AICoachCopy> = {
  pageTitle: "AI キャリアコーチ",
  pageDescription:
    "厳選プロンプト集で、Vault のファイルを任意の AI ツールに接続します。",
  landing: {
    coachCardTitle: "AI キャリアコーチ",
    coachCardDescription:
      "ChatGPT、Claude、Gemini などで実績あるプロンプトを実行—プロフィールは自動で入ります。",
    openCoach: "コーチを開く",
  },
  breadcrumb: { career: "キャリア", coach: "AI コーチ", use: "プロンプトを使う" },
  searchPlaceholder: "プロンプトを検索…",
  tabs: { all: "すべて", favorites: "お気に入り", recent: "最近" },
  categoriesHeader: "カテゴリー別",
  categories: {
    resume: "履歴書",
    interview: "面接",
    discovery: "発見",
    transition: "転身",
    growth: "成長",
    branding: "ブランディング",
    application: "応募",
    other: "その他",
  },
  allCategoriesLabel: "すべて",
  vaultAction: { useWithAI: "AI で使う" },
  settings: { title: "AI 設定" },
};

const ko: DeepPartial<AICoachCopy> = {
  pageTitle: "AI 커리어 코치",
  pageDescription: "선별된 프롬프트로 Vault 파일과 AI 도구를 연결합니다.",
  landing: {
    coachCardTitle: "AI 커리어 코치",
    coachCardDescription:
      "ChatGPT, Claude, Gemini 등에서 검증된 프롬프트를 실행—프로필이 자동으로 채워집니다.",
    openCoach: "코치 열기",
  },
  breadcrumb: { career: "커리어", coach: "AI 코치", use: "프롬프트 사용" },
  searchPlaceholder: "프롬프트 검색…",
  tabs: { all: "전체", favorites: "즐겨찾기", recent: "최근" },
  categoriesHeader: "카테고리",
  categories: {
    resume: "이력서",
    interview: "면접",
    discovery: "탐색",
    transition: "전환",
    growth: "성장",
    branding: "브랜딩",
    application: "지원",
    other: "기타",
  },
  allCategoriesLabel: "전체",
  vaultAction: { useWithAI: "AI와 함께 사용" },
  settings: { title: "AI 환경설정" },
};

const fr: DeepPartial<AICoachCopy> = {
  pageTitle: "Coach Carrière IA",
  pageDescription:
    "Une bibliothèque de prompts qui connecte vos fichiers Vault à toutes les IA.",
  landing: {
    coachCardTitle: "Coach Carrière IA",
    coachCardDescription:
      "Lancez un prompt éprouvé dans ChatGPT, Claude, Gemini… pré-rempli avec votre profil.",
    openCoach: "Ouvrir le coach",
  },
  breadcrumb: { career: "Carrière", coach: "Coach IA", use: "Utiliser" },
  searchPlaceholder: "Rechercher un prompt…",
  tabs: { all: "Tous", favorites: "Favoris", recent: "Récents" },
  categoriesHeader: "Par catégorie",
  categories: {
    resume: "CV",
    interview: "Entretien",
    discovery: "Découverte",
    transition: "Reconversion",
    growth: "Croissance",
    branding: "Image",
    application: "Candidature",
    other: "Autre",
  },
  allCategoriesLabel: "Tous",
  vaultAction: { useWithAI: "Utiliser avec l'IA" },
  settings: { title: "Préférences IA" },
};

const it: DeepPartial<AICoachCopy> = {
  pageTitle: "Coach Carriera IA",
  pageDescription:
    "Libreria di prompt che collega i tuoi file Vault a qualsiasi IA.",
  landing: {
    coachCardTitle: "Coach Carriera IA",
    coachCardDescription:
      "Esegui prompt collaudati in ChatGPT, Claude, Gemini — pre-compilati con il tuo profilo.",
    openCoach: "Apri coach",
  },
  breadcrumb: { career: "Carriera", coach: "Coach IA", use: "Usa" },
  searchPlaceholder: "Cerca prompt…",
  tabs: { all: "Tutti", favorites: "Preferiti", recent: "Recenti" },
  categoriesHeader: "Per categoria",
  categories: {
    resume: "CV",
    interview: "Colloquio",
    discovery: "Scoperta",
    transition: "Cambio",
    growth: "Crescita",
    branding: "Branding",
    application: "Candidatura",
    other: "Altro",
  },
  allCategoriesLabel: "Tutti",
  vaultAction: { useWithAI: "Usa con IA" },
  settings: { title: "Preferenze IA" },
};

const es: DeepPartial<AICoachCopy> = {
  pageTitle: "Coach de Carrera con IA",
  pageDescription:
    "Biblioteca curada de prompts que conecta tus archivos Vault a cualquier IA.",
  landing: {
    coachCardTitle: "Coach de Carrera con IA",
    coachCardDescription:
      "Ejecuta prompts probados en ChatGPT, Claude, Gemini… ya precargados con tu perfil.",
    openCoach: "Abrir coach",
  },
  breadcrumb: { career: "Carrera", coach: "Coach IA", use: "Usar" },
  searchPlaceholder: "Buscar prompt…",
  tabs: { all: "Todos", favorites: "Favoritos", recent: "Recientes" },
  categoriesHeader: "Por categoría",
  categories: {
    resume: "CV",
    interview: "Entrevista",
    discovery: "Descubrimiento",
    transition: "Cambio",
    growth: "Crecimiento",
    branding: "Marca",
    application: "Postulación",
    other: "Otro",
  },
  allCategoriesLabel: "Todos",
  vaultAction: { useWithAI: "Usar con IA" },
  settings: { title: "Preferencias de IA" },
};

const vi: DeepPartial<AICoachCopy> = {
  pageTitle: "Huấn luyện viên Sự nghiệp AI",
  pageDescription:
    "Thư viện prompt được chọn lọc, kết nối Vault của bạn với mọi công cụ AI.",
  landing: {
    coachCardTitle: "Huấn luyện viên Sự nghiệp AI",
    coachCardDescription:
      "Chạy prompt đã được kiểm chứng trên ChatGPT, Claude, Gemini… có sẵn hồ sơ của bạn.",
    openCoach: "Mở huấn luyện",
  },
  breadcrumb: { career: "Sự nghiệp", coach: "AI Coach", use: "Sử dụng" },
  searchPlaceholder: "Tìm prompt…",
  tabs: { all: "Tất cả", favorites: "Yêu thích", recent: "Gần đây" },
  categoriesHeader: "Theo danh mục",
  categories: {
    resume: "CV",
    interview: "Phỏng vấn",
    discovery: "Khám phá",
    transition: "Chuyển ngành",
    growth: "Phát triển",
    branding: "Thương hiệu",
    application: "Ứng tuyển",
    other: "Khác",
  },
  allCategoriesLabel: "Tất cả",
  vaultAction: { useWithAI: "Dùng với AI" },
  settings: { title: "Tùy chọn AI" },
};

const COPY_MAP = createLocaleCopyMap<AICoachCopy>(base, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
});

export function getAICoachCopy(locale: AppLocale): AICoachCopy {
  return COPY_MAP[locale];
}
