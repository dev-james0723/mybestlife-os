/**
 * auditAssetGap — inventories the personal-brand / career assets the person has
 * versus what's missing, and prioritises what to build next. Returns the loose
 * PersonalBrandAssets shape stored on career_profile.personal_brand_assets.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { CareerProfile, PersonalBrandAssets } from "@/types/database";
import { AssetAuditSchema } from "@/lib/career-mirror/validators";
import { AssetAuditGeminiSchema } from "@/lib/ai/schemas/career-mirror/index";
import { asContext, runCareerMirrorGenerator } from "./_shared";

export async function auditAssetGap(params: {
  vaultFiles: Array<{ category: string; filename: string; description?: string | null }>;
  profile: Partial<CareerProfile>;
  locale?: AppLocale;
}): Promise<{ data: PersonalBrandAssets; modelUsed: string }> {
  const taskBrief =
    "Audit this person's career / personal-brand assets. From the vault files " +
    "and profile, list what they HAVE (e.g. resume, headshot, bio, portfolio, " +
    "references), what is MISSING for where they want to go, and the priorities " +
    "— the assets worth building next, in order. Be concrete about gaps that " +
    "would block their stated targets.";

  const userText = [
    asContext("Vault files", params.vaultFiles),
    asContext("Profile", params.profile),
  ].join("\n\n");

  const { data, modelUsed } = await runCareerMirrorGenerator({
    taskBrief,
    userText,
    responseSchema: AssetAuditGeminiSchema,
    validator: AssetAuditSchema,
    locale: params.locale,
    temperature: 0.4,
  });
  return { data: data as PersonalBrandAssets, modelUsed };
}
