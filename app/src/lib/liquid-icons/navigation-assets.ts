import type { ColorMode, UiTheme } from "@/types/database";
import {
  STYLED_LIBRARY_ICON_PACKS,
  type StyledLibraryIconPackId,
} from "@/lib/liquid-icons/styled-icon-pack-metadata";
import {
  ANIMATED_ICON_PACKS,
  type AnimatedIconPackId,
} from "@/lib/liquid-icons/animated-icon-pack-metadata";

export type LiquidIconTargetType = "category" | "nav_item" | "cta" | "reserved";
export type ImageLiquidIconPackId =
  | "command-glass"
  | "soft-3d-clay"
  | "neo-brutal-retro"
  | "adaptive-minimal-line"
  | "humanist-ink"
  | "glacier-blue"
  | "opal-celestial"
  | "jelly-gummy"
  | "neo-deco-brass"
  | "velvet-opera"
  | "lace-porcelain"
  | "postal-poet"
  | "mystic-outlands"
  | "funhaus-stripe"
  | "field-khaki"
  | "afrohemian-weave"
  | "glitch-glam";
export type LiquidIconPackId =
  | ImageLiquidIconPackId
  | StyledLibraryIconPackId
  | AnimatedIconPackId;
export type LiquidIconPackSource = "generated-image" | "styled-icons" | "animated-icons";
export type LiquidIconPackGroupId =
  | "premium-generated"
  | "icon-library-classics"
  | "animated-motion";

export type LiquidIconPackGroup = {
  id: LiquidIconPackGroupId;
  name: string;
  description: string;
};

type LiquidIconPackMeta = {
  id: LiquidIconPackId;
  name: string;
  description: string;
  source: LiquidIconPackSource;
  groupId: LiquidIconPackGroupId;
  packageName?: string;
};

type LiquidIconAsset = {
  targetType: LiquidIconTargetType;
  targetId: string;
  assetId: string;
};

export const DEFAULT_LIQUID_ICON_PACK_ID: LiquidIconPackId = "command-glass";

export const LIQUID_ICON_PACK_GROUPS: LiquidIconPackGroup[] = [
  {
    id: "premium-generated",
    name: "Premium Generated Packs",
    description: "Texture-rich app icon worlds generated for this OS.",
  },
  {
    id: "icon-library-classics",
    name: "Icon Library Classics",
    description: "Classic styled-icons families remapped to this app navigation.",
  },
  {
    id: "animated-motion",
    name: "Animated Motion Packs",
    description: "Motion-ready navigation glyphs with live animated previews.",
  },
];

const GENERATED_IMAGE_ICON_PACKS: LiquidIconPackMeta[] = [
  {
    id: "command-glass",
    name: "Command Glass",
    description: "Dark glass and icy chrome inspired by the Command Center icon.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "soft-3d-clay",
    name: "Soft 3D Clay",
    description: "Tactile pastel objects with gentle depth and soft shadows.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "neo-brutal-retro",
    name: "Neo Brutal Retro",
    description: "Bold poster colors, chunky outlines, and playful Y2K energy.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "adaptive-minimal-line",
    name: "Minimal Line",
    description: "Precise adaptive linework for a crisp utility-first interface.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "humanist-ink",
    name: "Humanist Ink",
    description: "Handmade ink texture with soft organic color washes.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "glacier-blue",
    name: "Glacier Blue",
    description: "Carved ice facets, clipped crystalline cuts, and cold engineered clarity.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "opal-celestial",
    name: "Opal Celestial",
    description: "Pearlescent astronomical sigils with orbit arcs, beads, and star flashes.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "jelly-gummy",
    name: "Jelly Gummy",
    description: "Inflated candy-gel charms with squishy tubes, bubbles, and syrup glints.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "neo-deco-brass",
    name: "Neo Deco Brass",
    description: "Black-lacquer architectural marks with stepped brass geometry and fan rays.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "velvet-opera",
    name: "Velvet Opera",
    description: "Plush burgundy silhouettes with theatrical trim, folds, and rose-shadow drama.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "lace-porcelain",
    name: "Lace Porcelain",
    description: "Ceramic cutwork glyphs with scalloped lace, pearls, and raised relief.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "postal-poet",
    name: "Postal Poet",
    description: "Folded paper miniatures with sepia ink, stamp perforations, and literary warmth.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "mystic-outlands",
    name: "Mystic Outlands",
    description: "Mossy carved talismans with rough runes, spirals, and forest shimmer.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "funhaus-stripe",
    name: "FunHaus Stripe",
    description: "Premium carnival signage with chunky stripes, tilted blocks, and enamel rhythm.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "field-khaki",
    name: "Field Khaki",
    description: "Expedition stencils with canvas texture, contour lines, rivets, and khaki utility.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "afrohemian-weave",
    name: "Afrohemian Weave",
    description: "Woven textile pictograms with beads, chevrons, terracotta, and indigo rhythm.",
    source: "generated-image",
    groupId: "premium-generated",
  },
  {
    id: "glitch-glam",
    name: "Glitch Glam",
    description: "Fractured chrome icons with RGB splits, scan breaks, and editorial shine.",
    source: "generated-image",
    groupId: "premium-generated",
  },
];

export const LIQUID_ICON_PACKS: LiquidIconPackMeta[] = [
  ...GENERATED_IMAGE_ICON_PACKS,
  ...STYLED_LIBRARY_ICON_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    source: "styled-icons" as const,
    groupId: "icon-library-classics" as const,
    packageName: pack.packageName,
  })),
  ...ANIMATED_ICON_PACKS.map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    source: "animated-icons" as const,
    groupId: "animated-motion" as const,
    packageName: pack.packageName,
  })),
];

const LIQUID_ICON_PACK_IDS = new Set<LiquidIconPackId>(
  LIQUID_ICON_PACKS.map((pack) => pack.id),
);

const IMAGE_LIQUID_ICON_PACK_IDS = new Set<ImageLiquidIconPackId>(
  GENERATED_IMAGE_ICON_PACKS.map((pack) => pack.id as ImageLiquidIconPackId),
);

const LIQUID_ICON_PACK_PATHS: Record<ImageLiquidIconPackId, Record<ColorMode, string>> = {
  "command-glass": {
    light: "runtime/command-glass/day",
    dark: "runtime/command-glass/dark",
  },
  "soft-3d-clay": {
    light: "runtime/soft-3d-clay/day",
    dark: "runtime/soft-3d-clay/dark",
  },
  "neo-brutal-retro": {
    light: "runtime/neo-brutal-retro/day",
    dark: "runtime/neo-brutal-retro/dark",
  },
  "adaptive-minimal-line": {
    light: "runtime/adaptive-minimal-line/day",
    dark: "runtime/adaptive-minimal-line/dark",
  },
  "humanist-ink": {
    light: "runtime/humanist-ink/day",
    dark: "runtime/humanist-ink/dark",
  },
  "glacier-blue": {
    light: "runtime/glacier-blue/day",
    dark: "runtime/glacier-blue/dark",
  },
  "opal-celestial": {
    light: "runtime/opal-celestial/day",
    dark: "runtime/opal-celestial/dark",
  },
  "jelly-gummy": {
    light: "runtime/jelly-gummy/day",
    dark: "runtime/jelly-gummy/dark",
  },
  "neo-deco-brass": {
    light: "runtime/neo-deco-brass/day",
    dark: "runtime/neo-deco-brass/dark",
  },
  "velvet-opera": {
    light: "runtime/velvet-opera/day",
    dark: "runtime/velvet-opera/dark",
  },
  "lace-porcelain": {
    light: "runtime/lace-porcelain/day",
    dark: "runtime/lace-porcelain/dark",
  },
  "postal-poet": {
    light: "runtime/postal-poet/day",
    dark: "runtime/postal-poet/dark",
  },
  "mystic-outlands": {
    light: "runtime/mystic-outlands/day",
    dark: "runtime/mystic-outlands/dark",
  },
  "funhaus-stripe": {
    light: "runtime/funhaus-stripe/day",
    dark: "runtime/funhaus-stripe/dark",
  },
  "field-khaki": {
    light: "runtime/field-khaki/day",
    dark: "runtime/field-khaki/dark",
  },
  "afrohemian-weave": {
    light: "runtime/afrohemian-weave/day",
    dark: "runtime/afrohemian-weave/dark",
  },
  "glitch-glam": {
    light: "runtime/glitch-glam/day",
    dark: "runtime/glitch-glam/dark",
  },
};

export function isLiquidIconPackId(value: unknown): value is LiquidIconPackId {
  return typeof value === "string" && LIQUID_ICON_PACK_IDS.has(value as LiquidIconPackId);
}

export function isImageLiquidIconPackId(value: unknown): value is ImageLiquidIconPackId {
  return typeof value === "string" && IMAGE_LIQUID_ICON_PACK_IDS.has(value as ImageLiquidIconPackId);
}

const LIQUID_ICON_ASSETS: LiquidIconAsset[] = [
  { targetType: "category", targetId: "commandCenter", assetId: "category-command-center" },
  { targetType: "nav_item", targetId: "dashboard", assetId: "dashboard" },
  { targetType: "nav_item", targetId: "brain", assetId: "brain" },
  { targetType: "nav_item", targetId: "life-agent", assetId: "life-agent" },
  { targetType: "nav_item", targetId: "daily-planner", assetId: "daily-planner" },
  { targetType: "nav_item", targetId: "tasks", assetId: "tasks" },
  { targetType: "nav_item", targetId: "weekly-review", assetId: "weekly-review" },
  { targetType: "nav_item", targetId: "calendar", assetId: "calendar" },
  { targetType: "nav_item", targetId: "weather", assetId: "weather" },
  { targetType: "nav_item", targetId: "signals", assetId: "signals" },
  { targetType: "nav_item", targetId: "analytics", assetId: "analytics" },
  { targetType: "nav_item", targetId: "finance", assetId: "finance" },
  { targetType: "category", targetId: "self", assetId: "category-self" },
  { targetType: "nav_item", targetId: "about-me", assetId: "about-me" },
  { targetType: "nav_item", targetId: "grateful-things", assetId: "grateful-things" },
  { targetType: "nav_item", targetId: "quote-library", assetId: "quote-library" },
  { targetType: "nav_item", targetId: "bucket-list", assetId: "bucket-list" },
  { targetType: "nav_item", targetId: "health", assetId: "health" },
  { targetType: "nav_item", targetId: "habits", assetId: "habits" },
  { targetType: "nav_item", targetId: "journal", assetId: "journal" },
  { targetType: "category", targetId: "relationship", assetId: "category-people" },
  { targetType: "nav_item", targetId: "relationship", assetId: "relationship" },
  { targetType: "nav_item", targetId: "role-model", assetId: "role-model" },
  { targetType: "category", targetId: "career", assetId: "category-career" },
  { targetType: "nav_item", targetId: "career", assetId: "career" },
  { targetType: "nav_item", targetId: "career-compass", assetId: "career-compass" },
  { targetType: "nav_item", targetId: "career-profile", assetId: "career-profile" },
  { targetType: "nav_item", targetId: "career-vault", assetId: "career-vault" },
  { targetType: "nav_item", targetId: "career-coach", assetId: "career-coach" },
  { targetType: "nav_item", targetId: "career-pipeline", assetId: "career-pipeline" },
  { targetType: "nav_item", targetId: "career-timeline", assetId: "career-timeline" },
  { targetType: "nav_item", targetId: "career-network", assetId: "career-network" },
  { targetType: "nav_item", targetId: "career-journal", assetId: "career-journal" },
  { targetType: "nav_item", targetId: "career-analytics", assetId: "career-analytics" },
  { targetType: "category", targetId: "goalsExecution", assetId: "category-goals-execution" },
  { targetType: "nav_item", targetId: "goals", assetId: "goals" },
  { targetType: "nav_item", targetId: "projects", assetId: "projects" },
  { targetType: "category", targetId: "resources", assetId: "category-resources" },
  { targetType: "nav_item", targetId: "assets", assetId: "assets" },
  { targetType: "nav_item", targetId: "documents", assetId: "documents" },
  { targetType: "nav_item", targetId: "software-vault", assetId: "software-vault" },
  { targetType: "category", targetId: "knowledge", assetId: "category-knowledge" },
  { targetType: "nav_item", targetId: "knowledge-base", assetId: "knowledge-base" },
  { targetType: "nav_item", targetId: "ai-knowledge", assetId: "ai-knowledge" },
  { targetType: "nav_item", targetId: "mind-council", assetId: "mind-council" },
  { targetType: "nav_item", targetId: "ideas", assetId: "ideas" },
  { targetType: "category", targetId: "learning", assetId: "category-learning" },
  { targetType: "nav_item", targetId: "japanese-study", assetId: "japanese-study" },
  { targetType: "cta", targetId: "garden", assetId: "garden" },
  { targetType: "reserved", targetId: "settings", assetId: "settings-reserved" },
];

const assetByTarget = new Map(
  LIQUID_ICON_ASSETS.map((asset) => [
    `${asset.targetType}:${asset.targetId}`,
    asset.assetId,
  ]),
);

export function getLiquidIconAssetId(
  targetType: LiquidIconTargetType,
  targetId: string,
): string | undefined {
  return assetByTarget.get(`${targetType}:${targetId}`);
}

export function getLiquidIconSrc({
  targetType,
  targetId,
  uiTheme,
  colorMode,
  iconPack = DEFAULT_LIQUID_ICON_PACK_ID,
}: {
  targetType: LiquidIconTargetType;
  targetId: string;
  uiTheme: UiTheme;
  colorMode: ColorMode;
  iconPack?: LiquidIconPackId;
}): string | undefined {
  if (uiTheme !== "default") return undefined;
  if (!isImageLiquidIconPackId(iconPack)) return undefined;
  const assetId = getLiquidIconAssetId(targetType, targetId);
  if (!assetId) return undefined;
  return getLiquidIconPackAssetSrc(iconPack, colorMode, assetId);
}

export function getLiquidIconPackAssetSrc(
  iconPack: ImageLiquidIconPackId,
  colorMode: ColorMode,
  assetId: string,
): string {
  const packPath = LIQUID_ICON_PACK_PATHS[iconPack][colorMode];
  return `/images/liquid-icons/pack-c/${packPath}/${assetId}.png`;
}

export const liquidIconTargets = LIQUID_ICON_ASSETS;
