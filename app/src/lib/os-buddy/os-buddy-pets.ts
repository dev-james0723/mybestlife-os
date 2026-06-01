import type {
  OSBuddyAnimationState,
  OSBuddyPetId,
  OSBuddyPetManifest,
} from "@/types/os-buddy";

const SHARED_STATES: OSBuddyAnimationState[] = [
  "idle",
  "waiting",
  "waving",
  "jumping",
  "failed",
  "review",
  "running",
  "running-left",
  "running-right",
];

export const OS_BUDDY_PETS: Record<OSBuddyPetId, OSBuddyPetManifest> = {
  xiaoba: {
    id: "xiaoba",
    displayName: "Xiaoba",
    defaultName: "Xiaoba",
    description: {
      en: "A small pixel buddy who quietly helps you organize your life OS.",
      "zh-TW": "一隻會安靜陪你整理人生 OS 的像素小夥伴。",
    },
    namePool: ["Xiaoba", "Xiao", "Baobao", "Pixel", "Nini"],
    assetBasePath: "/os-buddy/pets/xiaoba",
    availableStates: SHARED_STATES,
    fallbackEmoji: "🐾",
  },

  doge: {
    id: "doge",
    displayName: "Doge",
    defaultName: "Doge",
    description: {
      en: "A cheerful pixel doge buddy who keeps your OS playful and energetic.",
      "zh-TW": "一隻活潑的像素 Doge，陪你用更輕鬆的方式整理生活。",
    },
    namePool: ["Doge", "Mochi", "Biscuit", "Sunny", "Pixel"],
    assetBasePath: "/os-buddy/pets/doge",
    availableStates: SHARED_STATES,
    fallbackEmoji: "🐶",
  },
};

export const DEFAULT_OS_BUDDY_PET_ID: OSBuddyPetId = "xiaoba";
export const DEFAULT_OS_BUDDY_NAME = "Xiaoba";

export function getOSBuddyPet(petId: OSBuddyPetId | string | null | undefined) {
  if (petId === "doge") return OS_BUDDY_PETS.doge;
  return OS_BUDDY_PETS.xiaoba;
}
