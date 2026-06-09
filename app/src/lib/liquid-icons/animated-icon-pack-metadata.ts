export type AnimatedIconPackId = "kinetic-linework" | "hover-intent";

export type AnimatedIconPackMeta = {
  id: AnimatedIconPackId;
  packageName: string;
  name: string;
  description: string;
  sourceRepo: string;
};

export const ANIMATED_ICON_PACKS: AnimatedIconPackMeta[] = [
  {
    id: "kinetic-linework",
    packageName: "pqoqubbw-icons",
    name: "Kinetic Linework",
    description: "Animated lucide-style glyphs with hover motion and live preview playback.",
    sourceRepo: "https://github.com/pqoqubbw/icons",
  },
  {
    id: "hover-intent",
    packageName: "itshover",
    name: "Hover Intent",
    description: "Intentional React/Motion icons from It's Hover with crisp interaction-driven motion.",
    sourceRepo: "https://github.com/itshover/itshover",
  },
];

const ANIMATED_ICON_PACK_IDS = new Set<AnimatedIconPackId>(
  ANIMATED_ICON_PACKS.map((pack) => pack.id),
);

export function isAnimatedIconPackId(value: unknown): value is AnimatedIconPackId {
  return typeof value === "string" && ANIMATED_ICON_PACK_IDS.has(value as AnimatedIconPackId);
}
