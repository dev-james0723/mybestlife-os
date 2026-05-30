/**
 * Copy for the Asset Intelligence Hub (AI-first Assets experience): the
 * creation wizard, intelligence modal, page-level intelligence, and the
 * potential-asset analyzer.
 *
 * Kept separate from `resources-ui.ts` so the large surface doesn't bloat the
 * existing nine-locale override blocks. Locales without an explicit override
 * fall back to the English base (see `createLocaleCopyMap`).
 */

import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

export type AssetIntelUiCopy = {
  cta: {
    addWithAi: string;
    addManually: string;
    analyzePotential: string;
  };
  empty: {
    title: string;
    description: string;
  };
  wizard: {
    title: string;
    stepInput: string;
    stepReview: string;
    stepVisual: string;
    stepActions: string;
    chooseMethodTitle: string;
    chooseMethodSubtitle: string;
    methodReceipt: string;
    methodPhoto: string;
    methodWarranty: string;
    methodName: string;
    methodDescribe: string;
    methodGenerate: string;
    dropzoneHint: string;
    textPlaceholder: string;
    namePlaceholder: string;
    extractCta: string;
    extracting: string;
    extractStages: string[];
    reviewTitle: string;
    reviewSubtitle: string;
    confidenceHigh: string;
    confidenceMedium: string;
    confidenceLow: string;
    confidenceMissing: string;
    needsInput: string;
    visualTitle: string;
    visualSubtitle: string;
    useUploaded: string;
    generateImage: string;
    generating: string;
    useIcon: string;
    skipVisual: string;
    aiVisualLabel: string;
    notProofOfOwnership: string;
    nextActionsTitle: string;
    saveCta: string;
    saving: string;
    back: string;
    next: string;
    done: string;
    errorGeneric: string;
  };
  modal: {
    analyze: string;
    analyzing: string;
    reanalyze: string;
    generateImage: string;
    edit: string;
    delete: string;
    uploadDocument: string;
    snapshotCurrentValue: string;
    snapshotPurchaseValue: string;
    snapshotDocHealth: string;
    snapshotRisk: string;
    snapshotRecommended: string;
    whyMatters: string;
    assetDna: string;
    documentHealth: string;
    missing: string;
    present: string;
    hiddenConnections: string;
    ifDisappeared: string;
    recommendation: string;
    insurance: string;
    insurancePrepare: string;
    maintenance: string;
    activationPlan: string;
    createTasks: string;
    personalMeaning: string;
    suggestedActions: string;
    attachments: string;
    notAnalyzedTitle: string;
    notAnalyzedBody: string;
    analyzeError: string;
    estimateDisclaimer: string;
  };
  page: {
    patternBannerPrefix: string;
    clustersTitle: string;
    riskRadarTitle: string;
    weakestLink: string;
    noRisks: string;
    clusterNames: Record<string, string>;
    riskLabels: Record<string, string>;
  };
  potential: {
    title: string;
    subtitle: string;
    itemPlaceholder: string;
    notesPlaceholder: string;
    analyzeCta: string;
    analyzing: string;
    recommendation: string;
    alreadyOwn: string;
    supports: string;
    needVsDesire: string;
    opportunityCost: string;
    wouldReplace: string;
    documentsToCollect: string;
  };
};

const english: AssetIntelUiCopy = {
  cta: {
    addWithAi: "Add Asset with AI",
    addManually: "Add Manually",
    analyzePotential: "Thinking of buying?",
  },
  empty: {
    title: "Build your Asset Intelligence Hub",
    description:
      "Upload a receipt, product photo, or warranty document. AI will extract the details, create the asset record, and help you protect, use, and optimize what you own.",
  },
  wizard: {
    title: "Add asset with AI",
    stepInput: "Input",
    stepReview: "Review",
    stepVisual: "Visual",
    stepActions: "Next steps",
    chooseMethodTitle: "How do you want to add this asset?",
    chooseMethodSubtitle:
      "Drop a receipt, photo, warranty, or just type what it is. AI will fill the boring fields for you.",
    methodReceipt: "Upload receipt / invoice",
    methodPhoto: "Upload product photo",
    methodWarranty: "Upload warranty / insurance",
    methodName: "Type product name",
    methodDescribe: "Describe in one sentence",
    methodGenerate: "Generate product image first",
    dropzoneHint: "Drop a file here or tap to upload (image or PDF)",
    textPlaceholder: "e.g. MacBook Pro 14-inch M4 Pro, bought Jan 2026 for $2,499",
    namePlaceholder: "e.g. Sony A7 IV camera",
    extractCta: "Extract with AI",
    extracting: "Reading…",
    extractStages: [
      "Reading document…",
      "Detecting product…",
      "Extracting purchase date…",
      "Looking for serial number…",
      "Estimating category…",
      "Checking missing fields…",
      "Preparing review…",
    ],
    reviewTitle: "Review what AI found",
    reviewSubtitle:
      "Check each field before saving. AI can be wrong — edit anything that looks off.",
    confidenceHigh: "High confidence",
    confidenceMedium: "Medium confidence",
    confidenceLow: "Low confidence",
    confidenceMissing: "Missing",
    needsInput: "Needs input",
    visualTitle: "Choose an asset visual",
    visualSubtitle: "Pick how this asset should look on its card.",
    useUploaded: "Use uploaded photo",
    generateImage: "Generate product image",
    generating: "Generating…",
    useIcon: "Use minimal icon",
    skipVisual: "Skip for now",
    aiVisualLabel: "AI-generated visual",
    notProofOfOwnership: "Not proof of ownership",
    nextActionsTitle: "Suggested next steps",
    saveCta: "Create asset",
    saving: "Creating…",
    back: "Back",
    next: "Next",
    done: "Done",
    errorGeneric: "Something went wrong. Please try again.",
  },
  modal: {
    analyze: "Analyze this asset",
    analyzing: "Analyzing…",
    reanalyze: "Regenerate insight",
    generateImage: "Generate product image",
    edit: "Edit",
    delete: "Delete",
    uploadDocument: "Upload document",
    snapshotCurrentValue: "Current value",
    snapshotPurchaseValue: "Purchase value",
    snapshotDocHealth: "Document health",
    snapshotRisk: "Risk level",
    snapshotRecommended: "Recommended",
    whyMatters: "Why this asset matters",
    assetDna: "Asset DNA",
    documentHealth: "Document health",
    missing: "Missing",
    present: "On file",
    hiddenConnections: "Hidden connections",
    ifDisappeared: "If this disappeared tomorrow",
    recommendation: "Recommended action",
    insurance: "Insurance readiness",
    insurancePrepare: "Prepare insurance proof",
    maintenance: "Maintenance & warranty",
    activationPlan: "7-day activation plan",
    createTasks: "Create tasks",
    personalMeaning: "What this asset says about your life",
    suggestedActions: "Suggested next actions",
    attachments: "Evidence & visuals",
    notAnalyzedTitle: "Unlock asset intelligence",
    notAnalyzedBody:
      "Run an AI analysis to see why this asset matters, what depends on it, its document health, and whether to keep, sell, repair, or upgrade it.",
    analyzeError: "Couldn't analyze this asset. Please try again.",
    estimateDisclaimer:
      "AI insights and value estimates are guidance, not financial, legal, tax, or insurance advice.",
  },
  page: {
    patternBannerPrefix: "Your assets suggest you are building:",
    clustersTitle: "Asset clusters",
    riskRadarTitle: "Asset risk radar",
    weakestLink: "Weakest link",
    noRisks: "No pressing risks detected. Your assets look well looked-after.",
    clusterNames: {
      creative_production: "Creative Production Stack",
      music_performance: "Music Performance Stack",
      business_operations: "Business Operations Stack",
      home_living: "Home / Living Stack",
      travel_mobility: "Travel / Mobility Stack",
      investment: "Investment Stack",
      emergency_recovery: "Emergency / Recovery Stack",
      memory_sentimental: "Memory / Sentimental Stack",
    },
    riskLabels: {
      high_value_low_docs: "High value, low documentation",
      high_value_low_usage: "High value, low usage",
      warranty_expiring: "Warranty expiring soon",
      needs_maintenance: "Needs maintenance",
      missing_serial: "Missing serial number",
      good_sell_candidate: "Good sell candidate",
      strong_emotional_value: "Strong emotional value",
      high_replacement_cost: "High replacement cost",
    },
  },
  potential: {
    title: "Analyze a potential asset",
    subtitle:
      "Considering a purchase? Get honest, non-pushy guidance based on what you already own.",
    itemPlaceholder: "e.g. MacBook Pro M4 Pro",
    notesPlaceholder: "Why are you considering this? (optional)",
    analyzeCta: "Analyze",
    analyzing: "Thinking…",
    recommendation: "Recommendation",
    alreadyOwn: "Do you already own something similar?",
    supports: "What it would support",
    needVsDesire: "Need vs desire",
    opportunityCost: "Opportunity cost",
    wouldReplace: "What it would replace",
    documentsToCollect: "Documents to collect after purchase",
  },
};

const overrides: Partial<Record<AppLocale, DeepPartial<AssetIntelUiCopy>>> = {
  "zh-TW": {
    cta: {
      addWithAi: "用 AI 新增資產",
      addManually: "手動新增",
      analyzePotential: "考慮要買東西？",
    },
    empty: {
      title: "打造你的資產智慧中心",
      description:
        "上傳收據、產品照片或保固文件，AI 會擷取細節、建立資產紀錄，並協助你保護、運用與優化你擁有的物品。",
    },
    wizard: {
      title: "用 AI 新增資產",
      chooseMethodTitle: "你想怎麼新增這項資產？",
      chooseMethodSubtitle:
        "丟一張收據、照片、保固，或直接輸入它是什麼，AI 會幫你填好繁瑣的欄位。",
      methodReceipt: "上傳收據／發票",
      methodPhoto: "上傳產品照片",
      methodWarranty: "上傳保固／保險",
      methodName: "輸入產品名稱",
      methodDescribe: "用一句話描述",
      methodGenerate: "先產生產品圖片",
      extractCta: "用 AI 擷取",
      reviewTitle: "檢視 AI 擷取的內容",
      saveCta: "建立資產",
      aiVisualLabel: "AI 生成的圖片",
      notProofOfOwnership: "非所有權證明",
    },
    modal: {
      analyze: "分析這項資產",
      whyMatters: "為什麼這項資產重要",
      assetDna: "資產 DNA",
      documentHealth: "文件健全度",
      hiddenConnections: "隱藏關聯",
      ifDisappeared: "如果它明天消失",
      recommendation: "建議行動",
      insurance: "保險準備度",
      activationPlan: "7 天啟用計畫",
      personalMeaning: "這項資產透露你的人生方向",
      suggestedActions: "建議的下一步",
      attachments: "證據與圖片",
    },
  },
};

const assetIntelUiCopyMap = createLocaleCopyMap<AssetIntelUiCopy>(english, overrides);

export function getAssetIntelUiCopy(locale: AppLocale): AssetIntelUiCopy {
  return assetIntelUiCopyMap[locale];
}
