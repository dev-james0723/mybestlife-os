import { getOSBuddyPet } from "./os-buddy-pets";
import { getOSBuddyAnimationState } from "./os-buddy-animation-map";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

export function getOSBuddyAssetSrc(params: {
  petId: OSBuddyPetId;
  mood: OSBuddyMood;
}) {
  const pet = getOSBuddyPet(params.petId);
  const state = getOSBuddyAnimationState({
    petId: params.petId,
    mood: params.mood,
  });

  return `${pet.assetBasePath}/${state}.gif`;
}
