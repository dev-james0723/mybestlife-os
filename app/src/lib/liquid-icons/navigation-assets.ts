import type { ColorMode, UiTheme } from "@/types/database";

export type LiquidIconTargetType = "category" | "nav_item" | "cta" | "reserved";
export type LiquidIconPackId =
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

type LiquidIconPackMeta = {
  id: LiquidIconPackId;
  name: string;
  description: string;
};

type LiquidIconAsset = {
  targetType: LiquidIconTargetType;
  targetId: string;
  assetId: string;
};

export const DEFAULT_LIQUID_ICON_PACK_ID: LiquidIconPackId = "command-glass";

export const LIQUID_ICON_PACKS: LiquidIconPackMeta[] = [
  {
    id: "command-glass",
    name: "Command Glass",
    description: "Dark glass and icy chrome inspired by the Command Center icon.",
  },
  {
    id: "soft-3d-clay",
    name: "Soft 3D Clay",
    description: "Tactile pastel objects with gentle depth and soft shadows.",
  },
  {
    id: "neo-brutal-retro",
    name: "Neo Brutal Retro",
    description: "Bold poster colors, chunky outlines, and playful Y2K energy.",
  },
  {
    id: "adaptive-minimal-line",
    name: "Minimal Line",
    description: "Precise adaptive linework for a crisp utility-first interface.",
  },
  {
    id: "humanist-ink",
    name: "Humanist Ink",
    description: "Handmade ink texture with soft organic color washes.",
  },
  {
    id: "glacier-blue",
    name: "Glacier Blue",
    description: "Carved ice facets, clipped crystalline cuts, and cold engineered clarity.",
  },
  {
    id: "opal-celestial",
    name: "Opal Celestial",
    description: "Pearlescent astronomical sigils with orbit arcs, beads, and star flashes.",
  },
  {
    id: "jelly-gummy",
    name: "Jelly Gummy",
    description: "Inflated candy-gel charms with squishy tubes, bubbles, and syrup glints.",
  },
  {
    id: "neo-deco-brass",
    name: "Neo Deco Brass",
    description: "Black-lacquer architectural marks with stepped brass geometry and fan rays.",
  },
  {
    id: "velvet-opera",
    name: "Velvet Opera",
    description: "Plush burgundy silhouettes with theatrical trim, folds, and rose-shadow drama.",
  },
  {
    id: "lace-porcelain",
    name: "Lace Porcelain",
    description: "Ceramic cutwork glyphs with scalloped lace, pearls, and raised relief.",
  },
  {
    id: "postal-poet",
    name: "Postal Poet",
    description: "Folded paper miniatures with sepia ink, stamp perforations, and literary warmth.",
  },
  {
    id: "mystic-outlands",
    name: "Mystic Outlands",
    description: "Mossy carved talismans with rough runes, spirals, and forest shimmer.",
  },
  {
    id: "funhaus-stripe",
    name: "FunHaus Stripe",
    description: "Premium carnival signage with chunky stripes, tilted blocks, and enamel rhythm.",
  },
  {
    id: "field-khaki",
    name: "Field Khaki",
    description: "Expedition stencils with canvas texture, contour lines, rivets, and khaki utility.",
  },
  {
    id: "afrohemian-weave",
    name: "Afrohemian Weave",
    description: "Woven textile pictograms with beads, chevrons, terracotta, and indigo rhythm.",
  },
  {
    id: "glitch-glam",
    name: "Glitch Glam",
    description: "Fractured chrome icons with RGB splits, scan breaks, and editorial shine.",
  },
];

const LIQUID_ICON_PACK_IDS = new Set<LiquidIconPackId>(
  LIQUID_ICON_PACKS.map((pack) => pack.id),
);

const LIQUID_ICON_PACK_PATHS: Record<LiquidIconPackId, Record<ColorMode, string>> = {
  "command-glass": {
    light: "alpha-day-command-style",
    dark: "alpha-dark-command-style",
  },
  "soft-3d-clay": {
    light: "packs/soft-3d-clay/day",
    dark: "packs/soft-3d-clay/dark",
  },
  "neo-brutal-retro": {
    light: "packs/neo-brutal-retro/day",
    dark: "packs/neo-brutal-retro/dark",
  },
  "adaptive-minimal-line": {
    light: "packs/adaptive-minimal-line/day",
    dark: "packs/adaptive-minimal-line/dark",
  },
  "humanist-ink": {
    light: "packs/humanist-ink/day",
    dark: "packs/humanist-ink/dark",
  },
  "glacier-blue": {
    light: "packs/glacier-blue/day",
    dark: "packs/glacier-blue/dark",
  },
  "opal-celestial": {
    light: "packs/opal-celestial/day",
    dark: "packs/opal-celestial/dark",
  },
  "jelly-gummy": {
    light: "packs/jelly-gummy/day",
    dark: "packs/jelly-gummy/dark",
  },
  "neo-deco-brass": {
    light: "packs/neo-deco-brass/day",
    dark: "packs/neo-deco-brass/dark",
  },
  "velvet-opera": {
    light: "packs/velvet-opera/day",
    dark: "packs/velvet-opera/dark",
  },
  "lace-porcelain": {
    light: "packs/lace-porcelain/day",
    dark: "packs/lace-porcelain/dark",
  },
  "postal-poet": {
    light: "packs/postal-poet/day",
    dark: "packs/postal-poet/dark",
  },
  "mystic-outlands": {
    light: "packs/mystic-outlands/day",
    dark: "packs/mystic-outlands/dark",
  },
  "funhaus-stripe": {
    light: "packs/funhaus-stripe/day",
    dark: "packs/funhaus-stripe/dark",
  },
  "field-khaki": {
    light: "packs/field-khaki/day",
    dark: "packs/field-khaki/dark",
  },
  "afrohemian-weave": {
    light: "packs/afrohemian-weave/day",
    dark: "packs/afrohemian-weave/dark",
  },
  "glitch-glam": {
    light: "packs/glitch-glam/day",
    dark: "packs/glitch-glam/dark",
  },
};

export function isLiquidIconPackId(value: unknown): value is LiquidIconPackId {
  return typeof value === "string" && LIQUID_ICON_PACK_IDS.has(value as LiquidIconPackId);
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
  const assetId = getLiquidIconAssetId(targetType, targetId);
  if (!assetId) return undefined;
  return getLiquidIconPackAssetSrc(iconPack, colorMode, assetId);
}

export function getLiquidIconPackAssetSrc(
  iconPack: LiquidIconPackId,
  colorMode: ColorMode,
  assetId: string,
): string {
  const packPath = LIQUID_ICON_PACK_PATHS[iconPack][colorMode];
  return `/images/liquid-icons/pack-c/${packPath}/${assetId}.png`;
}

export const liquidIconTargets = LIQUID_ICON_ASSETS;
