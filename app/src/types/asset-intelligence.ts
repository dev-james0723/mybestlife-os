/**
 * Asset Intelligence Hub types.
 *
 * These power the AI-first Assets experience: the AI creation wizard
 * (autofill), product-image generation, the Asset Intelligence Modal, and
 * page-level intelligence (clusters, risk radar, pattern banner).
 *
 * They are deliberately UI/transport types — the persisted row shapes for the
 * new `asset_documents` / `asset_images` / `asset_ai_extractions` /
 * `asset_intelligence_reports` tables live alongside the canonical Asset type
 * but are kept here so the whole feature reads from one module.
 */

import type { AssetCategoryKey } from "@/types/assets";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type AssetFieldConfidence = "high" | "medium" | "low" | "missing";

export type AssetRecommendedAction =
  | "keep"
  | "sell"
  | "repair"
  | "upgrade"
  | "insure"
  | "document"
  | "activate"
  | "archive"
  | "donate"
  | "replace"
  | "review_later";

export const ASSET_DOCUMENT_ROLES = [
  "receipt",
  "invoice",
  "warranty",
  "insurance",
  "manual",
  "maintenance",
  "appraisal",
  "resale",
  "other",
] as const;

export type AssetDocumentRole = (typeof ASSET_DOCUMENT_ROLES)[number];

export const ASSET_IMAGE_TYPES = [
  "uploaded_product_photo",
  "generated_product_image",
  "serial_number_photo",
  "condition_photo",
  "receipt_photo",
  "other",
] as const;

export type AssetImageType = (typeof ASSET_IMAGE_TYPES)[number];

export type AssetExtractedDocumentType =
  | "receipt"
  | "invoice"
  | "warranty"
  | "insurance"
  | "manual"
  | "photo"
  | "unknown";

// ---------------------------------------------------------------------------
// Persisted row shapes (new tables)
// ---------------------------------------------------------------------------

export type AssetImage = {
  id: string;
  user_id: string;
  asset_id: string;
  image_url: string;
  storage_path: string | null;
  image_type: AssetImageType;
  prompt: string | null;
  model_used: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type AssetDocumentLink = {
  id: string;
  user_id: string;
  asset_id: string;
  document_id: string;
  document_role: AssetDocumentRole;
  confidence: number | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Autofill (POST /api/ai/assets/autofill)
// ---------------------------------------------------------------------------

export type AssetAutofillResult = {
  name: string;
  category_key: AssetCategoryKey | null;
  category: string | null;
  value: number | null;
  current_value: number | null;
  location: string | null;
  purchase_date: string | null;
  serial_number: string | null;
  notes: string | null;
  extracted_document_type: AssetExtractedDocumentType;
  possible_brand: string | null;
  possible_model: string | null;
  warranty_expiration_date: string | null;
  confidence: number;
  field_confidence: {
    name?: AssetFieldConfidence;
    category_key?: AssetFieldConfidence;
    value?: AssetFieldConfidence;
    current_value?: AssetFieldConfidence;
    purchase_date?: AssetFieldConfidence;
    serial_number?: AssetFieldConfidence;
    warranty_expiration_date?: AssetFieldConfidence;
  };
  missing_fields: string[];
  warnings: string[];
  suggested_next_actions: string[];
};

export type AssetAutofillResponse = {
  result: AssetAutofillResult;
  meta: {
    modelUsed: string;
    generatedAt: string;
  };
};

/** Inline attachment passed to the autofill route (base64, browser-encoded). */
export type AssetAutofillAttachment = {
  mimeType: string;
  /** Base64-encoded bytes, no data: prefix. */
  data: string;
  kind?: "image" | "pdf" | "document";
};

// ---------------------------------------------------------------------------
// Product image generation (POST /api/ai/assets/generate-image)
// ---------------------------------------------------------------------------

export type AssetVisualStyle =
  | "ultra_realistic_product_photo"
  | "clean_ecommerce"
  | "minimal_studio"
  | "premium_catalog";

export type GenerateAssetImageResponse = {
  imageUrl: string;
  storagePath: string | null;
  prompt: string;
  modelUsed: string;
  imageType: "generated_product_image";
};

// ---------------------------------------------------------------------------
// Intelligence report (POST /api/ai/assets/analyze)
// ---------------------------------------------------------------------------

export type AssetDNADimension = {
  key: string;
  label: string;
  score: number;
  explanation?: string | null;
};

export type AssetDocumentHealth = {
  score: number;
  status: "strong" | "okay" | "weak" | "critical";
  missingItems: string[];
  existingItems: string[];
  explanation: string;
};

export type HiddenAssetConnection = {
  title: string;
  sourceType:
    | "project"
    | "task"
    | "goal"
    | "note"
    | "idea"
    | "document"
    | "asset"
    | "pattern";
  sourceId?: string | null;
  sourceTitle?: string | null;
  explanation: string;
  confidence: number;
  suggestedAction?: string | null;
};

export type AssetActivationPlanDay = {
  day: number;
  action: string;
  reflectionQuestion?: string | null;
  completed?: boolean | null;
};

export type AssetActivationPlan = {
  title: string;
  goal: string;
  days: AssetActivationPlanDay[];
};

export type AssetInsuranceReadiness = {
  score: number;
  explanation: string;
  missingProof: string[];
};

export type AssetMaintenanceSuggestion = {
  title: string;
  detail: string;
  cadence?: string | null;
};

export type AssetSuggestedAction = {
  label: string;
  detail?: string | null;
  /** Maps to a creatable task/reminder when accepted. */
  kind?: "task" | "reminder" | "document" | "review" | null;
};

export type AssetIntelligenceReport = {
  assetId: string;
  whyThisAssetMatters: string;
  dna: AssetDNADimension[];
  documentHealth: AssetDocumentHealth;
  hiddenConnections: HiddenAssetConnection[];
  ifDisappearedTomorrow: string;
  recommendedAction: {
    action: AssetRecommendedAction;
    label: string;
    reason: string;
    urgency: "low" | "medium" | "high";
  };
  insuranceReadiness: AssetInsuranceReadiness;
  maintenanceSuggestions: AssetMaintenanceSuggestion[];
  activationPlan?: AssetActivationPlan | null;
  personalMeaningInsight?: string | null;
  suggestedNextActions: AssetSuggestedAction[];
  generatedAt: string;
  modelUsed?: string | null;
};

export type AnalyzeAssetResponse = {
  result: AssetIntelligenceReport;
  meta: {
    modelUsed: string;
    generatedAt: string;
    cached: boolean;
  };
};

// ---------------------------------------------------------------------------
// Context payload (compact, privacy-aware) sent to the analyze route
// ---------------------------------------------------------------------------

export type AssetInsightContextItem = {
  id: string;
  title: string;
  kind: string;
  detail?: string | null;
};

export type AssetInsightContextPayload = {
  asset: {
    name: string;
    categoryKey: AssetCategoryKey | null;
    category: string | null;
    value: number | null;
    currentValue: number | null;
    location: string | null;
    purchaseDate: string | null;
    serialNumber: string | null;
    notes: string | null;
  };
  documentRoles: AssetDocumentRole[];
  imageTypes: AssetImageType[];
  similarAssets: AssetInsightContextItem[];
  projects: AssetInsightContextItem[];
  tasks: AssetInsightContextItem[];
  goals: AssetInsightContextItem[];
  notes: AssetInsightContextItem[];
};

// ---------------------------------------------------------------------------
// Page-level intelligence (computed client-side + AI banner)
// ---------------------------------------------------------------------------

export type AssetClusterKey =
  | "creative_production"
  | "music_performance"
  | "business_operations"
  | "home_living"
  | "travel_mobility"
  | "investment"
  | "emergency_recovery"
  | "memory_sentimental";

export type AssetRiskFlag =
  | "high_value_low_docs"
  | "high_value_low_usage"
  | "warranty_expiring"
  | "needs_maintenance"
  | "missing_serial"
  | "good_sell_candidate"
  | "strong_emotional_value"
  | "high_replacement_cost";

// ---------------------------------------------------------------------------
// Potential asset analysis (POST /api/ai/assets/potential)
// ---------------------------------------------------------------------------

export type PotentialAssetRecommendation =
  | "buy"
  | "wait"
  | "rent"
  | "repair_existing"
  | "buy_used"
  | "skip"
  | "need_more_context";

export type PotentialAssetAnalysis = {
  recommendation: PotentialAssetRecommendation;
  recommendationLabel: string;
  summary: string;
  alreadyOwnSimilar: string | null;
  supportedProjects: string[];
  needVsDesire: string;
  opportunityCost: string;
  whatItWouldReplace: string | null;
  documentsToCollect: string[];
  confidence: number;
};

export type AnalyzePotentialAssetResponse = {
  result: PotentialAssetAnalysis;
  meta: {
    modelUsed: string;
    generatedAt: string;
  };
};
