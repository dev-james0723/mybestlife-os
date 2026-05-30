/**
 * Prompt builder for AI-generated asset product visuals.
 *
 * These images are visual *placeholders* for the asset card / hero — NOT proof
 * of ownership. User-uploaded photos and receipts are the evidence layer.
 */

import type { AssetCategoryKey } from "@/types/assets";
import type { AssetVisualStyle } from "@/types/asset-intelligence";

const STYLE_DIRECTION: Record<AssetVisualStyle, string> = {
  ultra_realistic_product_photo:
    "ultra-realistic premium product photography, soft studio lighting, sharp realistic reflections, shallow depth of field",
  clean_ecommerce:
    "clean ecommerce product shot, even lighting, true-to-life colour, crisp focus",
  minimal_studio:
    "minimal studio composition, single soft key light, generous negative space",
  premium_catalog:
    "premium catalogue hero shot, cinematic but restrained lighting, elegant composition",
};

const CATEGORY_HINT: Partial<Record<AssetCategoryKey, string>> = {
  real_estate: "architectural exterior or interior view, realistic scale",
  vehicle: "three-quarter front angle, showroom floor",
  electronics: "device at a 30-45 degree angle, slightly elevated",
  musical_instrument: "full instrument in frame, tasteful angle",
  investment: "abstract premium representation, no text",
  other: "well-composed product angle",
};

export type BuildProductImagePromptArgs = {
  assetName: string;
  brand?: string | null;
  model?: string | null;
  categoryKey?: AssetCategoryKey | null;
  visualStyle?: AssetVisualStyle;
};

export function buildProductImagePrompt(args: BuildProductImagePromptArgs): string {
  const style = STYLE_DIRECTION[args.visualStyle ?? "ultra_realistic_product_photo"];
  const subjectParts = [args.brand, args.model, args.assetName].filter(Boolean);
  const subject = subjectParts.join(" ") || args.assetName;
  const categoryHint = args.categoryKey ? CATEGORY_HINT[args.categoryKey] : undefined;

  return [
    `${style} of a ${subject}.`,
    categoryHint ? `Framing: ${categoryHint}.` : "",
    "White-to-light-gray seamless background, balanced exposure, no text, no",
    "watermark, no exaggerated logos, no people. A single clean hero subject",
    "suitable for an asset catalogue card and detail header.",
  ]
    .filter(Boolean)
    .join(" ");
}
