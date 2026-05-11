import type { GardenItemType, PlantType, PlantVariant } from "@/types/database";
import type { AppLocale } from "./app-locale";
import { createLocaleCopyMap } from "./copy-helpers";

type GardenRarity = "common" | "uncommon" | "rare" | "legendary";

export type GardenUiCopy = {
  pageTitle: string;
  pageDescription: string;
  plantDescriptions: Record<PlantType, string>;
  itemLabels: Record<GardenItemType, string>;
  rarityLabels: Record<GardenRarity, string>;
  dailyChestClaimed: string;
  dailyChestReceived: string;
  dailyChestTitle: string;
  dailyChestDescription: string;
  openingChest: string;
  openChest: string;
  inventoryLabel: string;
  emptyCollectionTitle: string;
  emptyCollectionDescription: string;
  collectionTitle: string;
  plantCount: (count: number) => string;
  streakDays: (days: number) => string;
  plantLabels: Record<PlantType, string>;
  variantLabels: Record<PlantVariant, string>;
  variantBadge: (label: string) => string;
  chooseSeedTitle: string;
  chooseSeedDescription: string;
  unlockRequirement: (count: number) => string;
  bloomDays: (days: number) => string;
  stageNames: string[];
  stageSummary: (stage: number, total: number, label: string) => string;
  growthToNextStage: string;
  fullyBloomed: string;
  water: string;
  wateredToday: string;
  watering: string;
  fertilize: (count: number) => string;
  harvest: string;
  harvesting: string;
  growthBonus: (percent: number) => string;
  needsWater: string;
};

const en: GardenUiCopy = {
  pageTitle: "My Garden",
  pageDescription: "Grow plants daily. Water, collect, and watch your garden bloom.",
  plantDescriptions: {
    grass: "Fastest grower. A gentle start.",
    sunflower: "Turns toward the light as it grows.",
    lily: "Night-bloom. Special look in dark mode.",
    orchid: "Elegant blooms with rare color variants.",
    apple_tree: "The ultimate challenge. Drops collectible apples!",
  },
  itemLabels: {
    water: "Water Drop",
    sunlight: "Sunlight Token",
    fertilizer: "Fertilizer",
    rare_seed: "Rare Seed",
  },
  rarityLabels: {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    legendary: "Legendary",
  },
  dailyChestClaimed: "Daily chest already claimed. Come back tomorrow!",
  dailyChestReceived: "You received:",
  dailyChestTitle: "Daily Chest",
  dailyChestDescription: "Open for a surprise reward!",
  openingChest: "Opening...",
  openChest: "Open Chest",
  inventoryLabel: "Inventory:",
  emptyCollectionTitle: "No plants harvested yet",
  emptyCollectionDescription: "Grow a plant to full bloom and harvest it to add it here.",
  collectionTitle: "Garden Collection",
  plantCount: (count) => `${count} plant${count === 1 ? "" : "s"}`,
  streakDays: (days) => `${days} day streak`,
  plantLabels: {
    grass: "Grass",
    sunflower: "Sunflower",
    lily: "Lily",
    orchid: "Orchid",
    apple_tree: "Apple Tree",
  },
  variantLabels: {
    normal: "Normal",
    golden: "Golden",
    rare: "Rare",
  },
  variantBadge: (label) => `${label} variant`,
  chooseSeedTitle: "Choose a Seed",
  chooseSeedDescription:
    "Pick a plant to grow. Water it daily and watch it bloom! Each plant takes a different number of days to fully grow.",
  unlockRequirement: (count) => `Harvest ${count} plant${count === 1 ? "" : "s"} to unlock`,
  bloomDays: (days) => `~${days} days`,
  stageNames: ["Seed", "Sprout", "Seedling", "Growing", "Blooming"],
  stageSummary: (stage, total, label) => `Stage ${stage}/${total} - ${label}`,
  growthToNextStage: "Growth to next stage",
  fullyBloomed: "Fully bloomed! Ready to harvest.",
  water: "Water",
  wateredToday: "Watered today",
  watering: "Watering...",
  fertilize: (count) => `Fertilize (${count})`,
  harvest: "Harvest",
  harvesting: "Harvesting...",
  growthBonus: (percent) => `+${percent}% growth`,
  needsWater: "Needs water!",
};

const zhTW: GardenUiCopy = {
  pageTitle: "我的花園",
  pageDescription: "每天照顧植物，澆水、收集，靜靜看著花園綻放。",
  plantDescriptions: {
    grass: "成長最快，適合溫柔開始。",
    sunflower: "會一路朝著光生長。",
    lily: "夜裡綻放，在深色模式下更有魅力。",
    orchid: "優雅盛開，還有稀有色變。",
    apple_tree: "終極挑戰，成熟後還會掉落可收藏的蘋果！",
  },
  itemLabels: {
    water: "水滴",
    sunlight: "陽光代幣",
    fertilizer: "肥料",
    rare_seed: "稀有種子",
  },
  rarityLabels: {
    common: "普通",
    uncommon: "少見",
    rare: "稀有",
    legendary: "傳說",
  },
  dailyChestClaimed: "今日寶箱已領取，明天再來！",
  dailyChestReceived: "你獲得了：",
  dailyChestTitle: "每日寶箱",
  dailyChestDescription: "打開看看今天的驚喜獎勵！",
  openingChest: "開啟中...",
  openChest: "開啟寶箱",
  inventoryLabel: "背包：",
  emptyCollectionTitle: "尚未收成任何植物",
  emptyCollectionDescription: "把植物養到盛開並收成後，就會出現在這裡。",
  collectionTitle: "花園收藏",
  plantCount: (count) => `${count} 株植物`,
  streakDays: (days) => `連續 ${days} 天`,
  plantLabels: {
    grass: "小草",
    sunflower: "向日葵",
    lily: "百合",
    orchid: "蘭花",
    apple_tree: "蘋果樹",
  },
  variantLabels: {
    normal: "普通",
    golden: "金色",
    rare: "稀有",
  },
  variantBadge: (label) => `${label} 變種`,
  chooseSeedTitle: "選擇一顆種子",
  chooseSeedDescription: "挑一株植物開始培育吧。每天澆水，看著它慢慢盛開。每種植物需要的天數都不同。",
  unlockRequirement: (count) => `收成 ${count} 株植物後解鎖`,
  bloomDays: (days) => `約 ${days} 天`,
  stageNames: ["種子", "發芽", "幼苗", "成長中", "盛開"],
  stageSummary: (stage, total, label) => `第 ${stage}/${total} 階段 - ${label}`,
  growthToNextStage: "距離下一階段的成長",
  fullyBloomed: "已完全盛開，準備收成。",
  water: "澆水",
  wateredToday: "今天已澆水",
  watering: "澆水中...",
  fertilize: (count) => `施肥 (${count})`,
  harvest: "收成",
  harvesting: "收成中...",
  growthBonus: (percent) => `成長 +${percent}%`,
  needsWater: "需要澆水！",
};

const zhCN: GardenUiCopy = {
  pageTitle: "我的花园",
  pageDescription: "每天照顾植物，浇水、收集，静静看着花园盛开。",
  plantDescriptions: {
    grass: "成长最快，适合温柔开始。",
    sunflower: "会一路朝着光生长。",
    lily: "夜里绽放，在深色模式下更有魅力。",
    orchid: "优雅盛开，还有稀有色变。",
    apple_tree: "终极挑战，成熟后还会掉落可收藏的苹果！",
  },
  itemLabels: {
    water: "水滴",
    sunlight: "阳光代币",
    fertilizer: "肥料",
    rare_seed: "稀有种子",
  },
  rarityLabels: {
    common: "普通",
    uncommon: "少见",
    rare: "稀有",
    legendary: "传说",
  },
  dailyChestClaimed: "今日宝箱已领取，明天再来！",
  dailyChestReceived: "你获得了：",
  dailyChestTitle: "每日宝箱",
  dailyChestDescription: "打开看看今天的惊喜奖励！",
  openingChest: "开启中...",
  openChest: "开启宝箱",
  inventoryLabel: "背包：",
  emptyCollectionTitle: "尚未收成任何植物",
  emptyCollectionDescription: "把植物养到盛开并收成后，就会出现在这里。",
  collectionTitle: "花园收藏",
  plantCount: (count) => `${count} 株植物`,
  streakDays: (days) => `连续 ${days} 天`,
  plantLabels: {
    grass: "小草",
    sunflower: "向日葵",
    lily: "百合",
    orchid: "兰花",
    apple_tree: "苹果树",
  },
  variantLabels: {
    normal: "普通",
    golden: "金色",
    rare: "稀有",
  },
  variantBadge: (label) => `${label} 变种`,
  chooseSeedTitle: "选择一颗种子",
  chooseSeedDescription: "挑一株植物开始培育吧。每天浇水，看着它慢慢盛开。每种植物需要的天数都不同。",
  unlockRequirement: (count) => `收成 ${count} 株植物后解锁`,
  bloomDays: (days) => `约 ${days} 天`,
  stageNames: ["种子", "发芽", "幼苗", "成长中", "盛开"],
  stageSummary: (stage, total, label) => `第 ${stage}/${total} 阶段 - ${label}`,
  growthToNextStage: "距离下一阶段的成长",
  fullyBloomed: "已完全盛开，准备收成。",
  water: "浇水",
  wateredToday: "今天已浇水",
  watering: "浇水中...",
  fertilize: (count) => `施肥 (${count})`,
  harvest: "收成",
  harvesting: "收成中...",
  growthBonus: (percent) => `成长 +${percent}%`,
  needsWater: "需要浇水！",
};

const localizedGardenUi = createLocaleCopyMap<GardenUiCopy>(en, {
  "zh-TW": zhTW,
  "zh-CN": zhCN,
});

export function getGardenUiCopy(locale: AppLocale): GardenUiCopy {
  return localizedGardenUi[locale] ?? localizedGardenUi.en;
}
