export type ConfidenceLevel =
  | "high"
  | "medium"
  | "low"
  | "user_confirmed"
  | "needs_user_confirmation";

export type BillingCycle =
  | "monthly"
  | "annually"
  | "one-time"
  | "usage-based"
  | "unknown";

export type FieldSourceType =
  | "official_site"
  | "pricing_page"
  | "github"
  | "marketplace"
  | "search"
  | "llm_inference"
  | "user_input"
  | "fallback";

export type SoftwareType =
  | "saas"
  | "cli"
  | "ide"
  | "browser_extension"
  | "open_source"
  | "desktop"
  | "mobile"
  | "library"
  | "unknown";

export type PricingPlan = {
  id: string;
  name: string;
  price?: number | null;
  currency?: string;
  billing_cycle?: BillingCycle;
  cost_type?: "Free" | "Freemium" | "Paid" | "Subscription";
  features?: string[];
  source_url?: string;
  confidence?: ConfidenceLevel;
};

export type SoftwareAlternative = {
  name: string;
  icon_url?: string;
  official_url?: string;
  reason?: string;
  confidence?: ConfidenceLevel;
};

export type FieldSource = {
  field: string;
  source_type: FieldSourceType;
  source_url?: string;
  fetched_at?: string;
  confidence: ConfidenceLevel;
};

export type AppCandidate = {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  official_url?: string;
  github_url?: string;
  company?: string;
  software_type: SoftwareType;
  popularity_signal?: string;
  confidence: ConfidenceLevel;
  source: FieldSourceType;
};

export type VaultAutofillV2Response = {
  fields: Record<string, unknown>;
  pricing_plans: PricingPlan[];
  alternative_options: SoftwareAlternative[];
  field_sources: FieldSource[];
  field_confidence: Record<string, ConfidenceLevel>;
  needs_user_confirmation: string[];
  ai_generated_fields: string[];
};

export type VaultIdentifyResponse = {
  candidates: AppCandidate[];
  auto_select: AppCandidate | null;
  input_type: "url" | "github" | "name" | "description";
};
