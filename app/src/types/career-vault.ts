import type {
  CareerOpportunity,
  CareerVaultBundle,
  CareerVaultBundleType,
  CareerVaultCategory,
  CareerVaultFile,
  CareerVaultFileVersion,
  CareerVaultShare,
  CareerVaultShareType,
  OpportunityInteraction,
  OpportunityInteractionType,
  OpportunityStage,
  ShareAccessAction,
  ShareAccessLog,
} from "./database";

export type {
  CareerOpportunity,
  CareerVaultBundle,
  CareerVaultBundleType,
  CareerVaultCategory,
  CareerVaultFile,
  CareerVaultFileVersion,
  CareerVaultShare,
  CareerVaultShareType,
  OpportunityInteraction,
  OpportunityInteractionType,
  OpportunityStage,
  ShareAccessAction,
  ShareAccessLog,
};

/** UI-level file with derived signed URL (never stored). */
export type VaultFileWithUrl = CareerVaultFile & {
  signedUrl?: string;
  thumbnailUrl?: string;
};

export type VaultFileMetadata = {
  category: CareerVaultCategory;
  tags: string[];
  description?: string;
  isStarred?: boolean;
  isMaster?: boolean;
};

export type VaultViewMode = "grid" | "list";
export type VaultSortKey = "recent" | "name" | "size" | "category";
export type VaultCategoryFilter = CareerVaultCategory | "all";

// ---- Phase 3: versions ----

/** Rows returned from a "list versions" query, plus a derived "current" placeholder for the UI. */
export type VersionTimelineEntry =
  | {
      kind: "current";
      version_number: number;
      file: CareerVaultFile;
    }
  | {
      kind: "past";
      version: CareerVaultFileVersion;
    };

// ---- Phase 3: smart tags ----

/** Payload returned by the `suggest-file-metadata` edge function. */
export type SmartTagSuggestion = {
  suggestedCategory: CareerVaultCategory | null;
  suggestedTags: string[];
  suggestedDescription: string | null;
  confidenceScore: number;
  detectedLanguage: string | null;
};

/** Per-tag usage aggregated from all of the user's vault files. */
export type TagUsage = {
  name: string;
  count: number;
};

// ---- Phase 4: shares ----

/** User-controlled options for a new share link. */
export type CreateShareInput = {
  shareType: CareerVaultShareType;
  fileId?: string | null;
  bundleId?: string | null;
  password?: string | null;
  expiresAt?: string | null;
  maxViews?: number | null;
  recipientLabel?: string | null;
  allowDownload?: boolean;
  watermarkEnabled?: boolean;
};

/** Share row plus a freshly-derived public URL. */
export type ShareWithUrl = CareerVaultShare & { url: string };

/** What the public /share/[token] viewer gets back from the edge function. */
export type ResolvedShareFile = {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  signedUrl: string;
  /** Index within bundle, for ordering. */
  order: number;
};

export type ResolvedShare = {
  shareType: CareerVaultShareType;
  ownerName: string | null;
  recipientLabel: string | null;
  allowDownload: boolean;
  watermarkEnabled: boolean;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  createdAt: string;
  bundle?: {
    name: string;
    description: string | null;
    includeCoverPage: boolean;
    coverTitle: string | null;
    coverSubtitle: string | null;
    coverRecipient: string | null;
  };
  files: ResolvedShareFile[];
};

// ---- Phase 4: bundle export ----

export type BundleExportFormat = "zip" | "merged_pdf";

export type BundleTemplateKey =
  | "grad_school"
  | "tech_job"
  | "speaking"
  | "funding"
  | "custom";

export type BundleTemplateDefinition = {
  type: BundleTemplateKey;
  icon: string;
  suggestedCategories: CareerVaultCategory[];
  defaultCoverTitle?: string;
};

// ---- Phase 4: pipeline ----

export type OpportunityWithFiles = CareerOpportunity & {
  attachedFiles?: CareerVaultFile[];
};
