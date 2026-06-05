import type { AppLocale } from "./app-locale";
import type { ConfidenceLevel, FieldSourceType, SoftwareType } from "@/types/vault-smart-autofill";
import type { BillingCycle } from "@/types/vault-smart-autofill";

export type VaultSmartAutofillCopy = {
  identify: {
    title: string;
    subtitle: string;
    refineSearch: string;
    manualEntry: string;
    officialSite: string;
    github: string;
    softwareTypes: Record<SoftwareType, string>;
    confidence: Record<ConfidenceLevel, string>;
  };
  planPicker: {
    subscribeTitle: string;
    subscribeHint: string;
    noSubscription: string;
    noSubscriptionHint: string;
    hasSubscription: string;
    hasSubscriptionHint: string;
    unsure: string;
    unsureHint: string;
    openSource: string;
    openSourceHint: string;
    planTitle: string;
    planHint: string;
    cycleTitle: string;
    cycleHint: string;
    freePlan: string;
    back: string;
    skip: string;
    continue: string;
    cycles: Record<BillingCycle, string>;
  };
  review: {
    needsConfirmation: (n: number) => string;
    emptyValue: string;
    costSection: string;
    back: string;
    editFields: string;
    confirmDeposit: string;
  };
  confidence: {
    levels: Record<ConfidenceLevel, string>;
    fieldHint: (field: string) => string;
    sourceLink: string;
    sourceTypes: Record<FieldSourceType, string>;
  };
};

const en: VaultSmartAutofillCopy = {
  identify: {
    title: "Which software is this?",
    subtitle: "We found multiple matches. Pick the product you mean.",
    refineSearch: "Refine search",
    manualEntry: "Enter manually",
    officialSite: "Official site",
    github: "GitHub",
    softwareTypes: {
      saas: "SaaS",
      cli: "CLI",
      ide: "IDE",
      browser_extension: "Browser extension",
      open_source: "Open source",
      desktop: "Desktop",
      mobile: "Mobile",
      library: "Library / package",
      unknown: "Software",
    },
    confidence: {
      high: "High confidence",
      medium: "Medium confidence",
      low: "Low confidence",
      user_confirmed: "Confirmed by you",
      needs_user_confirmation: "Needs confirmation",
    },
  },
  planPicker: {
    subscribeTitle: "Do you subscribe to this software?",
    subscribeHint: "We'll set cost fields from your plan.",
    noSubscription: "No paid subscription / Free",
    noSubscriptionHint: "Cost type Free, amount 0.",
    hasSubscription: "I have a subscription",
    hasSubscriptionHint: "Pick your plan next.",
    unsure: "Not sure",
    unsureHint: "Leave cost amount empty for now.",
    openSource: "Open-source / self-hosted / free",
    openSourceHint: "Treat as free software.",
    planTitle: "Which plan do you use?",
    planHint: "Select the tier that matches your subscription.",
    cycleTitle: "Billing cycle",
    cycleHint: "How are you billed for this plan?",
    freePlan: "Free",
    back: "Back",
    skip: "Skip",
    continue: "Continue",
    cycles: {
      monthly: "Monthly",
      annually: "Annually",
      "one-time": "One-time",
      "usage-based": "Usage-based",
      unknown: "Unknown",
    },
  },
  review: {
    needsConfirmation: (n) =>
      `${n} field${n === 1 ? "" : "s"} need your confirmation before depositing.`,
    emptyValue: "—",
    costSection: "Pricing",
    back: "Back",
    editFields: "Edit fields",
    confirmDeposit: "Deposit into vault",
  },
  confidence: {
    levels: {
      high: "Verified",
      medium: "Found",
      low: "Low confidence",
      user_confirmed: "You confirmed",
      needs_user_confirmation: "Confirm",
    },
    fieldHint: (field) => `Source for ${field}`,
    sourceLink: "From linked source",
    sourceTypes: {
      official_site: "Official site",
      pricing_page: "Pricing page",
      github: "GitHub README",
      marketplace: "Marketplace",
      search: "Web search",
      llm_inference: "AI inference",
      user_input: "Your input",
      fallback: "Fallback",
    },
  },
};

const zhTW: VaultSmartAutofillCopy = {
  identify: {
    title: "你想加入邊個軟體？",
    subtitle: "我哋搵到幾個可能嘅選項，請揀正確嗰個。",
    refineSearch: "重新搜尋",
    manualEntry: "手動輸入",
    officialSite: "官方網站",
    github: "GitHub",
    softwareTypes: {
      saas: "SaaS",
      cli: "CLI 工具",
      ide: "IDE",
      browser_extension: "瀏覽器擴充",
      open_source: "開源",
      desktop: "桌面軟體",
      mobile: "手機 App",
      library: "函式庫 / 套件",
      unknown: "軟體",
    },
    confidence: {
      high: "高信心",
      medium: "中信心",
      low: "低信心",
      user_confirmed: "你已確認",
      needs_user_confirmation: "需確認",
    },
  },
  planPicker: {
    subscribeTitle: "你有冇訂閱呢個軟體？",
    subscribeHint: "我哋會根據你嘅方案自動填寫費用欄位。",
    noSubscription: "冇付費訂閱 / 免費",
    noSubscriptionHint: "設為免費，金額 0。",
    hasSubscription: "我有訂閱",
    hasSubscriptionHint: "下一步揀你嘅方案。",
    unsure: "唔確定",
    unsureHint: "費用金額暫時留空。",
    openSource: "開源 / 自架 / 免費使用",
    openSourceHint: "當作免費軟體處理。",
    planTitle: "你用緊邊個方案？",
    planHint: "揀符合你訂閱嘅級別。",
    cycleTitle: "計費週期",
    cycleHint: "你係點樣俾錢？",
    freePlan: "免費",
    back: "返回",
    skip: "略過",
    continue: "繼續",
    cycles: {
      monthly: "每月",
      annually: "每年",
      "one-time": "一次性",
      "usage-based": "按用量",
      unknown: "未知",
    },
  },
  review: {
    needsConfirmation: (n) => `有 ${n} 個欄位需要你確認後先可以存入。`,
    emptyValue: "—",
    costSection: "費用",
    back: "返回",
    editFields: "編輯欄位",
    confirmDeposit: "存入軟體庫",
  },
  confidence: {
    levels: {
      high: "已驗證",
      medium: "已找到",
      low: "低信心",
      user_confirmed: "你已確認",
      needs_user_confirmation: "需確認",
    },
    fieldHint: (field) => `${field} 的來源`,
    sourceLink: "來自連結來源",
    sourceTypes: {
      official_site: "官方網站",
      pricing_page: "定價頁",
      github: "GitHub README",
      marketplace: "市集",
      search: "網頁搜尋",
      llm_inference: "AI 推斷",
      user_input: "你的輸入",
      fallback: "後備",
    },
  },
};

const zhCN: VaultSmartAutofillCopy = {
  ...zhTW,
  identify: {
    ...zhTW.identify,
    title: "你要添加哪个软件？",
    subtitle: "我们找到多个可能选项，请选择正确的产品。",
    refineSearch: "重新搜索",
    manualEntry: "手动输入",
  },
  planPicker: {
    ...zhTW.planPicker,
    subscribeTitle: "你是否订阅了该软件？",
    subscribeHint: "我们会根据你的方案自动填写费用字段。",
    noSubscription: "无付费订阅 / 免费",
    hasSubscription: "我有订阅",
    unsure: "不确定",
    openSource: "开源 / 自托管 / 免费使用",
    planTitle: "你使用的是哪个方案？",
    cycleTitle: "计费周期",
    back: "返回",
    skip: "跳过",
    continue: "继续",
  },
  review: {
    ...zhTW.review,
    needsConfirmation: (n) => `有 ${n} 个字段需要你确认后才能存入。`,
    editFields: "编辑字段",
    confirmDeposit: "存入软件库",
  },
};

const COPY: Record<AppLocale, VaultSmartAutofillCopy> = {
  en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja: en,
  ko: en,
  fr: en,
  it: en,
  es: en,
  vi: en,
};

export function getVaultSmartAutofillCopy(locale: AppLocale): VaultSmartAutofillCopy {
  return COPY[locale] ?? COPY.en;
}
