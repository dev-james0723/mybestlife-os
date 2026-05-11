import type { VaultStackIndustrySlug } from "@/lib/vault/software-library-schema";
import { VAULT_STACK_INDUSTRY_SLUGS } from "@/lib/vault/software-library-schema";

/** Canonical industry record for catalog UI, filters, and server-side prompts. */
export type VaultIndustryCatalogEntry = {
  id: VaultStackIndustrySlug;
  /** English display / Gemini context (localized labels live in `vault-industry-i18n`). */
  label: string;
  /** One–two sentence positioning for stack browsing and recommendations. */
  description: string;
};

/**
 * Single source of truth for the 18 vault industries (order = browse order).
 * UI copy per locale is layered in `vault-industry-i18n.ts`.
 */
export const VAULT_INDUSTRY_CATALOG: readonly VaultIndustryCatalogEntry[] = [
  {
    id: "finance_accounting",
    label: "Finance & Accounting",
    description:
      "Close, forecast, and compliance-friendly stacks for controllers, FP&A, and SMB finance ops.",
  },
  {
    id: "legal",
    label: "Legal",
    description: "Matter work, research, and firm ops with defensible documentation habits.",
  },
  {
    id: "education",
    label: "Education",
    description: "Instruction, curriculum design, and school operations without losing human oversight.",
  },
  {
    id: "creator_content",
    label: "Creator / Content",
    description: "Short-form, brand, and audio/video pipelines tuned for shipping consistently.",
  },
  {
    id: "startup_sme",
    label: "Startup / SME",
    description: "Lean operating systems for founders and small teams balancing speed and cost.",
  },
  {
    id: "operations_bizops",
    label: "Operations / BizOps",
    description: "Automation, internal requests, and meeting-to-action loops for operators.",
  },
  {
    id: "marketing_growth",
    label: "Marketing / Growth",
    description: "Content engines, CRM-native motions, and research-led performance workflows.",
  },
  {
    id: "sales_bd",
    label: "Sales / Business Development",
    description: "Prospecting, SMB velocity, and enterprise account planning with fewer blind spots.",
  },
  {
    id: "customer_support_cx",
    label: "Customer Support / CX",
    description: "AI-first, CRM-native, and SMB-friendly support stacks with clear escalation paths.",
  },
  {
    id: "hr_recruiting",
    label: "HR / Recruiting",
    description: "HRIS-aligned, recruiting-ops, and lean people stacks for hiring and people programs.",
  },
  {
    id: "product_project_management",
    label: "Product / Project Management",
    description: "PM operating systems, specs/briefings, and cross-functional execution spines.",
  },
  {
    id: "software_dev_it",
    label: "Software Development / IT",
    description: "Developer productivity, internal tools, and pragmatic IT automation.",
  },
  {
    id: "ecommerce_retail",
    label: "Ecommerce / Retail",
    description: "Shopify-native selling, growth loops, and merchandising/ops visibility.",
  },
  {
    id: "real_estate",
    label: "Real Estate",
    description: "Lead gen, listing content, and brokerage operations with client-ready polish.",
  },
  {
    id: "healthcare_clinics",
    label: "Healthcare / Clinics",
    description: "Clinical documentation, clinic admin, and patient communication — policy-aware.",
  },
  {
    id: "consulting_professional_services",
    label: "Consulting / Professional Services",
    description: "Research-to-deck, delivery ops, and knowledge-heavy advisory workflows.",
  },
  {
    id: "music",
    label: "Music",
    description: "Ideation, production polish, and release marketing for independent artists.",
  },
  {
    id: "art_design",
    label: "Art / Design",
    description: "Brand systems, concept exploration, and social-ready design velocity.",
  },
] as const;

const CATALOG_BY_ID: ReadonlyMap<VaultStackIndustrySlug, VaultIndustryCatalogEntry> = new Map(
  VAULT_INDUSTRY_CATALOG.map((e) => [e.id, e]),
);

export function getVaultIndustryCatalogEntry(
  id: VaultStackIndustrySlug,
): VaultIndustryCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Validates catalog stays aligned with schema slugs (throws at module init if drift). */
export function assertIndustryCatalogAlignedWithSchema(): void {
  const catalogIds = new Set(VAULT_INDUSTRY_CATALOG.map((e) => e.id));
  const schemaIds = new Set(VAULT_STACK_INDUSTRY_SLUGS);
  for (const id of schemaIds) {
    if (!catalogIds.has(id)) throw new Error(`Industry catalog missing slug: ${id}`);
  }
  for (const id of catalogIds) {
    if (!schemaIds.has(id)) throw new Error(`Industry catalog has unknown slug: ${id}`);
  }
}

assertIndustryCatalogAlignedWithSchema();
